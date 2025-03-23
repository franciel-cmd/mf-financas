import React, { createContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { format, isAfter, parseISO, addDays, differenceInDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { Conta, Filtro, StatusConta, CategoriaConta, Relatorio } from '../types';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { useAuth } from '../hooks/useAuth';
import { 
  buscarContas as buscarContasService,
  adicionarConta as adicionarContaService,
  atualizarConta as atualizarContaService,
  removerConta as removerContaService,
  marcarComoPaga as marcarComoPagaService
} from '../services/contasService';

interface FinancasContextData {
  contas: Conta[];
  filtro: Filtro;
  adicionarConta: (conta: Omit<Conta, 'id' | 'status'>) => void;
  atualizarConta: (id: string, conta: Partial<Conta>) => void;
  removerConta: (id: string) => void;
  marcarComoPaga: (id: string) => void;
  atualizarFiltro: (novoFiltro: Partial<Filtro>) => void;
  contasFiltradas: Conta[];
  gerarRelatorio: (mes: number, ano: number) => Relatorio;
  exportarParaExcel: () => void;
  exportarParaPDF: () => void;
  carregando: boolean;
}

interface FinancasProviderProps {
  children: ReactNode;
}

export const FinancasContext = createContext({} as FinancasContextData);

export function FinancasProvider({ children }: FinancasProviderProps) {
  // Referência para o último dia em que as contas foram verificadas
  const ultimaVerificacaoRef = useRef(new Date());
  const { usuario, isAuthenticated } = useAuth();
  const [carregando, setCarregando] = useState(false);
  
  const [contas, setContas] = useState<Conta[]>([]);

  const [filtro, setFiltro] = useState<Filtro>(() => {
    try {
      const storedFiltro = localStorage.getItem('@MFFinancas:filtro');
      if (storedFiltro) {
        return JSON.parse(storedFiltro);
      }
    } catch (error) {
      console.error('Erro ao carregar filtro do localStorage:', error);
    }
    return {
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear()
    };
  });

  // Carregar contas quando o usuário estiver autenticado
  useEffect(() => {
    async function carregarContas() {
      if (isAuthenticated && usuario?.id) {
        setCarregando(true);
        try {
          const contasCarregadas = await buscarContasService(usuario.id);
          setContas(contasCarregadas);
        } catch (error) {
          console.error('Erro ao carregar contas:', error);
          toast.error('Erro ao carregar contas. Tente novamente.');
        } finally {
          setCarregando(false);
        }
      }
    }

    carregarContas();
  }, [isAuthenticated, usuario]);

  // Salvar filtro no localStorage
  useEffect(() => {
    localStorage.setItem('@MFFinancas:filtro', JSON.stringify(filtro));
  }, [filtro]);

  // Verificar contas vencidas
  const verificarContasVencidas = useCallback(() => {
    const hoje = startOfDay(new Date());
    
    // Verifica se já verificou as contas hoje
    if (differenceInDays(hoje, ultimaVerificacaoRef.current) === 0) {
      return;
    }
    
    // Atualiza a referência da última verificação
    ultimaVerificacaoRef.current = hoje;
    
    const contasAtualizadas = contas.map(conta => {
      if (conta.status === 'aberta' && isAfter(hoje, parseISO(conta.dataVencimento))) {
        return { ...conta, status: 'vencida' as StatusConta };
      }
      return conta;
    });
    
    // Se houver alterações, atualiza o estado
    if (JSON.stringify(contasAtualizadas) !== JSON.stringify(contas)) {
      setContas(contasAtualizadas);
      
      // Atualizar no servidor as contas que foram alteradas
      contasAtualizadas.forEach(async (conta) => {
        const contaOriginal = contas.find(c => c.id === conta.id);
        
        if (contaOriginal && contaOriginal.status !== conta.status && usuario?.id) {
          await atualizarContaService(conta.id, { status: conta.status }, usuario.id);
        }
      });
    }
  }, [contas, usuario]);

  // Verificar contas vencidas ao iniciar e ao focar na janela
  useEffect(() => {
    if (contas.length > 0) {
      verificarContasVencidas();
    }
    
    const onFocus = () => {
      if (contas.length > 0) {
        verificarContasVencidas();
      }
    };
    
    window.addEventListener('focus', onFocus);
    
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [contas, verificarContasVencidas]);

  // Filtra as contas de acordo com o filtro
  const contasFiltradas = contas.filter(conta => {
    const dataVencimento = parseISO(conta.dataVencimento);
    const mesVencimento = dataVencimento.getMonth() + 1;
    const anoVencimento = dataVencimento.getFullYear();
    
    const filtroMes = filtro.mes === undefined || filtro.mes === mesVencimento;
    const filtroAno = filtro.ano === undefined || filtro.ano === anoVencimento;
    const filtroCategoria = filtro.categoria === undefined || filtro.categoria === conta.categoria;
    const filtroStatus = filtro.status === undefined || filtro.status === conta.status;
    
    return filtroMes && filtroAno && filtroCategoria && filtroStatus;
  });

  // Função para atualizar o filtro
  function atualizarFiltro(novoFiltro: Partial<Filtro>) {
    setFiltro(prevFiltro => ({ ...prevFiltro, ...novoFiltro }));
  }

  // Função para adicionar uma nova conta
  async function adicionarConta(conta: Omit<Conta, 'id' | 'status'>) {
    if (!usuario?.id) {
      toast.error('Você precisa estar autenticado para adicionar uma conta.');
      return;
    }
    
    setCarregando(true);
    
    try {
      const novaConta = await adicionarContaService(conta, usuario.id);
      
      if (novaConta) {
        setContas(prevContas => [...prevContas, novaConta]);
      }
    } catch (error) {
      console.error('Erro ao adicionar conta:', error);
      toast.error('Erro ao adicionar conta. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  // Função para atualizar uma conta existente
  async function atualizarConta(id: string, conta: Partial<Conta>) {
    if (!usuario?.id) {
      toast.error('Você precisa estar autenticado para atualizar uma conta.');
      return;
    }
    
    setCarregando(true);
    
    try {
      const sucesso = await atualizarContaService(id, conta, usuario.id);
      
      if (sucesso) {
        setContas(prevContas => 
          prevContas.map(c => c.id === id ? { ...c, ...conta } : c)
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast.error('Erro ao atualizar conta. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  // Função para remover uma conta
  async function removerConta(id: string) {
    if (!usuario?.id) {
      toast.error('Você precisa estar autenticado para remover uma conta.');
      return;
    }
    
    setCarregando(true);
    
    try {
      const sucesso = await removerContaService(id, usuario.id);
      
      if (sucesso) {
        setContas(prevContas => prevContas.filter(c => c.id !== id));
      }
    } catch (error) {
      console.error('Erro ao remover conta:', error);
      toast.error('Erro ao remover conta. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  // Função para marcar uma conta como paga
  async function marcarComoPaga(id: string) {
    if (!usuario?.id) {
      toast.error('Você precisa estar autenticado para marcar uma conta como paga.');
      return;
    }
    
    setCarregando(true);
    
    try {
      const sucesso = await marcarComoPagaService(id, usuario.id);
      
      if (sucesso) {
        const dataPagamento = new Date().toISOString();
        
        setContas(prevContas => 
          prevContas.map(c => c.id === id 
            ? { ...c, status: 'paga', dataPagamento } 
            : c
          )
        );
      }
    } catch (error) {
      console.error('Erro ao marcar conta como paga:', error);
      toast.error('Erro ao marcar conta como paga. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  // Função para gerar um relatório de contas
  function gerarRelatorio(mes: number, ano: number): Relatorio {
    const contasDoMes = contas.filter(conta => {
      const dataVencimento = parseISO(conta.dataVencimento);
      const mesVencimento = dataVencimento.getMonth() + 1;
      const anoVencimento = dataVencimento.getFullYear();
      
      return mesVencimento === mes && anoVencimento === ano;
    });
    
    const totalPago = contasDoMes
      .filter(conta => conta.status === 'paga')
      .reduce((total, conta) => total + conta.valor, 0);
      
    const totalEmAberto = contasDoMes
      .filter(conta => conta.status === 'aberta')
      .reduce((total, conta) => total + conta.valor, 0);
      
    const totalVencido = contasDoMes
      .filter(conta => conta.status === 'vencida')
      .reduce((total, conta) => total + conta.valor, 0);
    
    // Agrupa as contas por categoria
    const contasPorCategoria: Record<CategoriaConta, number> = {
      fixa: 0,
      variavel: 0,
      cartao: 0,
      imposto: 0,
      outro: 0
    };
    
    contasDoMes.forEach(conta => {
      contasPorCategoria[conta.categoria] += conta.valor;
    });
    
    return {
      totalPago,
      totalEmAberto,
      totalVencido,
      contasPorCategoria,
      periodo: {
        mes,
        ano
      }
    };
  }

  // Função para exportar os dados para Excel
  function exportarParaExcel() {
    try {
      // Se houver um filtro aplicado, usa as contas filtradas
      // Caso contrário, usa todas as contas
      const dados = contasFiltradas.length > 0 ? contasFiltradas : contas;
      
      if (dados.length === 0) {
        toast.info('Não há dados para exportar.');
        return;
      }
      
      // Cria o relatório
      const relatorio = gerarRelatorio(
        filtro.mes || new Date().getMonth() + 1, 
        filtro.ano || new Date().getFullYear()
      );
      
      // Prepara os dados para o Excel
      const dadosContas = dados.map(conta => ({
        'Nome': conta.nome,
        'Valor': conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        'Data de Vencimento': format(parseISO(conta.dataVencimento), 'dd/MM/yyyy'),
        'Status': conta.status === 'paga' 
          ? 'Paga' 
          : conta.status === 'vencida' 
            ? 'Vencida' 
            : 'Em aberto',
        'Categoria': 
          conta.categoria === 'fixa' ? 'Fixa' :
          conta.categoria === 'variavel' ? 'Variável' :
          conta.categoria === 'cartao' ? 'Cartão de Crédito' :
          conta.categoria === 'imposto' ? 'Imposto' : 'Outro',
        'Data de Pagamento': conta.dataPagamento 
          ? format(parseISO(conta.dataPagamento), 'dd/MM/yyyy') 
          : '-',
        'Observações': conta.observacoes || '-'
      }));
      
      // Prepara os dados do resumo
      const dadosResumo = [
        { 'Resumo': 'Total Pago', 'Valor': relatorio.totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { 'Resumo': 'Total em Aberto', 'Valor': relatorio.totalEmAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { 'Resumo': 'Total Vencido', 'Valor': relatorio.totalVencido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { 'Resumo': 'Total Geral', 'Valor': (relatorio.totalPago + relatorio.totalEmAberto + relatorio.totalVencido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { 'Resumo': '', 'Valor': '' },
        { 'Resumo': 'Gastos por Categoria', 'Valor': '' },
        { 'Resumo': 'Fixa', 'Valor': relatorio.contasPorCategoria.fixa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { 'Resumo': 'Variável', 'Valor': relatorio.contasPorCategoria.variavel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { 'Resumo': 'Cartão de Crédito', 'Valor': relatorio.contasPorCategoria.cartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { 'Resumo': 'Imposto', 'Valor': relatorio.contasPorCategoria.imposto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
        { 'Resumo': 'Outro', 'Valor': relatorio.contasPorCategoria.outro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
      ];
      
      // Cria as planilhas
      const wsContas = XLSX.utils.json_to_sheet(dadosContas);
      const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
      
      // Cria o livro e adiciona as planilhas
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      XLSX.utils.book_append_sheet(wb, wsContas, 'Contas');
      
      // Define o nome do arquivo
      const nomeArquivo = `MF_Financas_${filtro.mes || new Date().getMonth() + 1}_${filtro.ano || new Date().getFullYear()}.xlsx`;
      
      // Gera o arquivo
      XLSX.writeFile(wb, nomeArquivo);
      
      toast.success('Arquivo Excel gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast.error('Erro ao exportar para Excel. Tente novamente.');
    }
  }

  // Função para exportar os dados para PDF
  function exportarParaPDF() {
    try {
      // Se houver um filtro aplicado, usa as contas filtradas
      // Caso contrário, usa todas as contas
      const dados = contasFiltradas.length > 0 ? contasFiltradas : contas;
      
      if (dados.length === 0) {
        toast.info('Não há dados para exportar.');
        return;
      }
      
      // Cria o relatório
      const relatorio = gerarRelatorio(
        filtro.mes || new Date().getMonth() + 1, 
        filtro.ano || new Date().getFullYear()
      );
      
      // Cria o documento PDF
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Relatório Financeiro', 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      const mesPorExtenso = format(new Date(relatorio.periodo.ano, relatorio.periodo.mes - 1, 1), 'MMMM', { locale: ptBR });
      doc.text(
        `${mesPorExtenso.charAt(0).toUpperCase() + mesPorExtenso.slice(1)} de ${relatorio.periodo.ano}`, 
        105, 
        22, 
        { align: 'center' }
      );
      
      // Resumo Financeiro
      doc.setFontSize(14);
      doc.text('Resumo Financeiro', 14, 35);
      
      doc.setFontSize(10);
      doc.text('Total Pago:', 14, 45);
      doc.text(relatorio.totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 70, 45);
      
      doc.text('Total em Aberto:', 14, 52);
      doc.text(relatorio.totalEmAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 70, 52);
      
      doc.text('Total Vencido:', 14, 59);
      doc.text(relatorio.totalVencido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 70, 59);
      
      doc.text('Total Geral:', 14, 66);
      doc.text((relatorio.totalPago + relatorio.totalEmAberto + relatorio.totalVencido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 70, 66);
      
      // Gastos por Categoria
      doc.setFontSize(14);
      doc.text('Gastos por Categoria', 14, 80);
      
      doc.setFontSize(10);
      doc.text('Fixa:', 14, 90);
      doc.text(relatorio.contasPorCategoria.fixa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 70, 90);
      
      doc.text('Variável:', 14, 97);
      doc.text(relatorio.contasPorCategoria.variavel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 70, 97);
      
      doc.text('Cartão de Crédito:', 14, 104);
      doc.text(relatorio.contasPorCategoria.cartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 70, 104);
      
      doc.text('Imposto:', 14, 111);
      doc.text(relatorio.contasPorCategoria.imposto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 70, 111);
      
      doc.text('Outro:', 14, 118);
      doc.text(relatorio.contasPorCategoria.outro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 70, 118);
      
      // Lista de Contas
      doc.setFontSize(14);
      doc.text('Lista de Contas', 14, 135);
      
      // Cabeçalho da tabela
      doc.setFontSize(9);
      doc.text('Nome', 14, 145);
      doc.text('Vencimento', 90, 145);
      doc.text('Valor', 130, 145);
      doc.text('Status', 160, 145);
      
      // Linha separadora
      doc.line(14, 147, 196, 147);
      
      // Limita a 20 contas para evitar que o PDF fique muito grande
      const contasListadas = dados.slice(0, 20);
      
      // Conteúdo da tabela
      let y = 154;
      contasListadas.forEach(conta => {
        if (y > 280) {
          // Se atingir o limite da página, adiciona uma nova página
          doc.addPage();
          
          // Reseta a posição Y
          y = 20;
          
          // Adiciona cabeçalho da tabela na nova página
          doc.setFontSize(9);
          doc.text('Nome', 14, y);
          doc.text('Vencimento', 90, y);
          doc.text('Valor', 130, y);
          doc.text('Status', 160, y);
          
          // Linha separadora
          doc.line(14, y + 2, 196, y + 2);
          
          // Atualiza a posição Y
          y += 9;
        }
        
        // Define a cor com base no status
        if (conta.status === 'paga') {
          doc.setTextColor(22, 163, 74); // Verde para contas pagas
        } else if (conta.status === 'vencida') {
          doc.setTextColor(239, 68, 68); // Vermelho para contas vencidas
        } else {
          doc.setTextColor(245, 158, 11); // Laranja para contas em aberto
        }
        
        doc.text(conta.nome.substring(0, 25), 14, y);
        doc.text(format(parseISO(conta.dataVencimento), 'dd/MM/yyyy'), 90, y);
        doc.text(conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 130, y);
        doc.text(
          conta.status === 'paga' 
            ? 'Paga' 
            : conta.status === 'vencida' 
              ? 'Vencida' 
              : 'Em aberto', 
          160, 
          y
        );
        
        // Reseta a cor do texto
        doc.setTextColor(0, 0, 0);
        
        y += 7;
      });
      
      // Se houver mais contas que não foram listadas
      if (dados.length > 20) {
        doc.setFontSize(8);
        doc.text(`... e mais ${dados.length - 20} conta(s) não exibida(s) neste relatório.`, 14, y + 5);
      }
      
      // Rodapé
      doc.setFontSize(8);
      doc.text('MF - Finanças | Relatório gerado em ' + format(new Date(), 'dd/MM/yyyy HH:mm'), 105, 285, { align: 'center' });
      
      // Define o nome do arquivo
      const nomeArquivo = `MF_Financas_${filtro.mes || new Date().getMonth() + 1}_${filtro.ano || new Date().getFullYear()}.pdf`;
      
      // Salva o arquivo
      doc.save(nomeArquivo);
      
      toast.success('Arquivo PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar para PDF:', error);
      toast.error('Erro ao exportar para PDF. Tente novamente.');
    }
  }

  return (
    <FinancasContext.Provider
      value={{
        contas,
        filtro,
        adicionarConta,
        atualizarConta,
        removerConta,
        marcarComoPaga,
        atualizarFiltro,
        contasFiltradas,
        gerarRelatorio,
        exportarParaExcel,
        exportarParaPDF,
        carregando
      }}
    >
      {children}
    </FinancasContext.Provider>
  );
}