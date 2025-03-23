import { z } from 'zod';

// Validação de categoria de conta
export const categoriaContaSchema = z.enum(['fixa', 'variavel', 'cartao', 'imposto', 'outro']);

// Validação de status de conta
export const statusContaSchema = z.enum(['aberta', 'paga', 'vencida']);

// Validação de conta
export const contaSchema = z.object({
  nome: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres' }).max(100, { message: 'O nome deve ter no máximo 100 caracteres' }),
  valor: z.number().positive({ message: 'O valor deve ser positivo' }),
  dataVencimento: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.\d{3}Z)?$/, { message: 'Data em formato inválido' }),
  categoria: categoriaContaSchema,
  observacoes: z.string().max(500, { message: 'A observação deve ter no máximo 500 caracteres' }).optional(),
});

// Schema para atualização de conta (campos opcionais)
export const contaUpdateSchema = contaSchema.partial().extend({
  id: z.string().uuid({ message: 'ID inválido' }),
});

// Schema para marcar conta como paga
export const contaPagaSchema = z.object({
  id: z.string().uuid({ message: 'ID inválido' }),
});

// Validação de credenciais de login
export const credenciaisLoginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  senha: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
});

// Validação de registro de usuário
export const registroUsuarioSchema = z.object({
  nome: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres' }).max(100, { message: 'O nome deve ter no máximo 100 caracteres' }),
  email: z.string().email({ message: 'E-mail inválido' }),
  senha: z.string()
    .min(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
    .regex(/[A-Z]/, { message: 'A senha deve conter pelo menos uma letra maiúscula' })
    .regex(/[0-9]/, { message: 'A senha deve conter pelo menos um número' }),
  confirmacaoSenha: z.string(),
}).refine(data => data.senha === data.confirmacaoSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmacaoSenha'],
});

// Validação de filtro de contas
export const filtroSchema = z.object({
  mes: z.number().min(1).max(12).optional(),
  ano: z.number().min(2000).max(2100).optional(),
  categoria: categoriaContaSchema.optional(),
  status: statusContaSchema.optional(),
});

// Função para validar dados
export function validar<T>(schema: z.ZodType<T>, data: unknown): { sucesso: true; dados: T } | { sucesso: false; erros: string[] } {
  try {
    const resultado = schema.parse(data);
    return { sucesso: true, dados: resultado };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const erros = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { sucesso: false, erros };
    }
    return { sucesso: false, erros: ['Erro desconhecido na validação'] };
  }
} 