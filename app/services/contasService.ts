import { supabase, Tables } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { Conta, StatusConta, CategoriaConta } from '../types';
import { toast } from 'react-toastify';
import { 
  contaSchema, 
  contaUpdateSchema, 
  contaPagaSchema,
  validar 
} from '../schemas';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Esquema de validação para a conta
const contaSchemaZod = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  valor: z.number().positive("Valor deve ser positivo"),
  dataVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Data de vencimento inválida"),
  categoria: z.enum(["fixa", "variavel", "cartao", "imposto", "outro"] as const),
  observacoes: z.string().optional(),
});

// Esquema para atualização (todos os campos são opcionais)
const atualizacaoContaSchema = contaSchemaZod.partial();

// Converte uma conta do formato da aplicação para o formato do Supabase
const convertToSupabaseConta = (conta: Omit<Conta, 'id'>, userId: string): Tables['contas']['Insert'] => {
  return {
    usuario_id: userId,
    nome: conta.nome,
    valor: conta.valor,
    data_vencimento: conta.dataVencimento,
    data_pagamento: conta.dataPagamento || null,
    status: conta.status,
    categoria: conta.categoria,
    observacoes: conta.observacoes || null
  };
};

// Converte uma conta do formato do Supabase para o formato da aplicação
const convertFromSupabaseConta = (conta: Tables['contas']['Row']): Conta => {
  return {
    id: conta.id,
    nome: conta.nome,
    valor: conta.valor,
    dataVencimento: conta.data_vencimento,
    dataPagamento: conta.data_pagamento || undefined,
    status: conta.status,
    categoria: conta.categoria,
    observacoes: conta.observacoes || undefined
  };
};

// Tratamento de erros unificado
const handleError = (error: any, mensagem: string): void => {
  logger.error(mensagem, error);
  
  let mensagemErro = mensagem;
  
  // Se for um erro do Supabase, extraímos a mensagem
  if (error?.message) {
    mensagemErro = `${mensagem}: ${error.message}`;
  }
  
  // Se for um erro de validação, mostramos os erros específicos
  if (error?.erros && Array.isArray(error.erros)) {
    error.erros.forEach((erro: string) => {
      toast.error(erro);
    });
    return;
  }
  
  toast.error(mensagemErro);
};

// Busca todas as contas de um usuário
export const buscarContas = async (userId: string): Promise<Conta[]> => {
  try {
    logger.info('Buscando contas do usuário', { userId });
    
    const { data, error } = await supabase
      .from('contas')
      .select('*')
      .eq('usuario_id', userId)
      .order('data_vencimento', { ascending: true });

    if (error) {
      handleError(error, 'Erro ao buscar contas');
      return [];
    }

    logger.debug('Contas encontradas', { quantidade: data.length });
    return data.map(convertFromSupabaseConta);
  } catch (error) {
    handleError(error, 'Erro ao buscar contas');
    return [];
  }
};

// Adiciona uma nova conta
export async function adicionarConta(contaData: Omit<Conta, 'id' | 'status'>, userId: string): Promise<Conta | null> {
  try {
    logger.info('Adicionando nova conta', { userId, contaNome: contaData.nome });
    
    // Validar dados de entrada
    const validacao = contaSchemaZod.safeParse({
      nome: contaData.nome,
      valor: contaData.valor,
      dataVencimento: contaData.dataVencimento,
      categoria: contaData.categoria,
      observacoes: contaData.observacoes
    });

    if (!validacao.success) {
      logger.error('Validação falhou ao adicionar conta', validacao.error);
      throw new Error(`Erro de validação: ${validacao.error.errors[0].message}`);
    }

    // Prosseguir com a inserção dos dados validados
    const id = uuidv4();
    
    // Analisar a data de vencimento para verificar se já está vencida
    const dataVencimento = new Date(contaData.dataVencimento);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Remover horas para comparar apenas datas
    
    const status: StatusConta = dataVencimento < hoje ? 'vencida' : 'aberta';
    
    const { data, error } = await supabase
      .from('contas')
      .insert({
        id,
        nome: contaData.nome,
        valor: contaData.valor,
        data_vencimento: contaData.dataVencimento,
        status,
        categoria: contaData.categoria,
        observacoes: contaData.observacoes || '',
        usuario_id: userId
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Erro ao adicionar conta no Supabase', {
        erro: error.message,
        userId
      });
      throw error;
    }
    
    // Registrar ação de auditoria
    logger.audit({
      type: 'CONTA_ADICIONADA',
      userId,
      details: { contaId: data.id, contaNome: data.nome, valor: data.valor }
    });

    toast.success('Conta adicionada com sucesso!');
    return convertFromSupabaseConta(data);
  } catch (error) {
    logger.error('Erro ao adicionar conta', error);
    throw error;
  }
}

// Atualiza uma conta existente
export async function atualizarConta(id: string, userId: string, dadosAtualizados: Partial<Conta>): Promise<boolean> {
  try {
    logger.info('Atualizando conta', { userId, contaId: id });
    
    // Validar dados de atualização
    const validacao = atualizacaoContaSchema.safeParse(dadosAtualizados);

    if (!validacao.success) {
      logger.error('Validação falhou ao atualizar conta', validacao.error);
      throw new Error(`Erro de validação: ${validacao.error.errors[0].message}`);
    }

    // Verificar se o usuário é o proprietário da conta
    const { data: contaExistente, error: erroConsulta } = await supabase
      .from('contas')
      .select('usuario_id')
      .eq('id', id)
      .single();
      
    if (erroConsulta) {
      logger.error('Erro ao verificar propriedade da conta', {
        erro: erroConsulta.message,
        contaId: id,
        userId
      });
      throw erroConsulta;
    }
    
    if (contaExistente.usuario_id !== userId) {
      logger.audit('Tentativa de acesso não autorizado a conta', {
        contaId: id,
        userId,
        proprietarioReal: contaExistente.usuario_id
      });
      throw new Error('Você não tem permissão para atualizar esta conta.');
    }
    
    // Mapeamento das propriedades para o formato do Supabase
    const dadosParaAtualizar: any = {};
    
    if (dadosAtualizados.nome !== undefined) dadosParaAtualizar.nome = dadosAtualizados.nome;
    if (dadosAtualizados.valor !== undefined) dadosParaAtualizar.valor = dadosAtualizados.valor;
    if (dadosAtualizados.dataVencimento !== undefined) dadosParaAtualizar.data_vencimento = dadosAtualizados.dataVencimento;
    if (dadosAtualizados.dataPagamento !== undefined) dadosParaAtualizar.data_pagamento = dadosAtualizados.dataPagamento;
    if (dadosAtualizados.status !== undefined) dadosParaAtualizar.status = dadosAtualizados.status;
    if (dadosAtualizados.categoria !== undefined) dadosParaAtualizar.categoria = dadosAtualizados.categoria;
    if (dadosAtualizados.observacoes !== undefined) dadosParaAtualizar.observacoes = dadosAtualizados.observacoes;
    
    if (dadosAtualizados.dataVencimento !== undefined) {
      dadosParaAtualizar.data_vencimento = dadosAtualizados.dataVencimento;
      
      // Atualizar o status com base na nova data de vencimento
      if (dadosAtualizados.status !== 'paga') { // Não alterar o status se já estiver paga
        const dataVencimento = new Date(dadosAtualizados.dataVencimento);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        dadosParaAtualizar.status = dataVencimento < hoje ? 'vencida' : 'aberta';
      }
    }
    
    // Atualizar no Supabase
    const { error } = await supabase
      .from('contas')
      .update(dadosParaAtualizar)
      .eq('id', id)
      .eq('usuario_id', userId); // Garantia adicional de segurança
    
    if (error) {
      logger.error('Erro ao atualizar conta no Supabase', {
        erro: error.message,
        contaId: id
      });
      throw error;
    }
    
    logger.audit('Conta atualizada com sucesso', {
      contaId: id,
      userId,
      campos: Object.keys(dadosParaAtualizar)
    });
    
    return true;
  } catch (error) {
    logger.error('Erro ao atualizar conta', error);
    throw error;
  }
}

// Remove uma conta
export const removerConta = async (id: string, userId: string): Promise<boolean> => {
  try {
    logger.info('Removendo conta', { userId, contaId: id });
    
    // Validar ID
    const resultadoValidacao = validar(contaPagaSchema, { id });
    if (!resultadoValidacao.sucesso) {
      handleError({ erros: resultadoValidacao.erros }, 'Erro de validação');
      return false;
    }

    // Primeiro, vamos obter os dados da conta para registro de auditoria
    const { data: contaData, error: contaError } = await supabase
      .from('contas')
      .select('nome, valor')
      .eq('id', id)
      .eq('usuario_id', userId)
      .single();
      
    if (contaError) {
      handleError(contaError, 'Erro ao buscar dados da conta para remoção');
    }

    const { error } = await supabase
      .from('contas')
      .delete()
      .eq('id', id)
      .eq('usuario_id', userId);

    if (error) {
      handleError(error, 'Erro ao remover conta');
      return false;
    }

    // Registrar ação de auditoria
    logger.audit({
      type: 'CONTA_REMOVIDA',
      userId,
      details: { 
        contaId: id,
        contaNome: contaData?.nome,
        valor: contaData?.valor
      }
    });

    toast.success('Conta removida com sucesso!');
    return true;
  } catch (error) {
    handleError(error, 'Erro ao remover conta');
    return false;
  }
};

// Marca uma conta como paga
export const marcarComoPaga = async (id: string, userId: string): Promise<boolean> => {
  try {
    logger.info('Marcando conta como paga', { userId, contaId: id });
    
    // Validar ID
    const resultadoValidacao = validar(contaPagaSchema, { id });
    if (!resultadoValidacao.sucesso) {
      handleError({ erros: resultadoValidacao.erros }, 'Erro de validação');
      return false;
    }
    
    // Primeiro, vamos obter os dados da conta para registro de auditoria
    const { data: contaData, error: contaError } = await supabase
      .from('contas')
      .select('nome, valor')
      .eq('id', id)
      .eq('usuario_id', userId)
      .single();
      
    if (contaError) {
      handleError(contaError, 'Erro ao buscar dados da conta para pagamento');
    }
    
    const dataPagamento = new Date().toISOString();
    
    const { error } = await supabase
      .from('contas')
      .update({
        status: 'paga',
        data_pagamento: dataPagamento
      })
      .eq('id', id)
      .eq('usuario_id', userId);

    if (error) {
      handleError(error, 'Erro ao marcar conta como paga');
      return false;
    }

    // Registrar ação de auditoria
    logger.audit({
      type: 'CONTA_PAGA',
      userId,
      details: { 
        contaId: id,
        contaNome: contaData?.nome,
        valor: contaData?.valor,
        dataPagamento
      }
    });

    toast.success('Conta marcada como paga!');
    return true;
  } catch (error) {
    handleError(error, 'Erro ao marcar conta como paga');
    return false;
  }
}; 