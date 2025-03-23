import React, { createContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { format, isAfter, parseISO, addDays, differenceInDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { Conta, Filtro, StatusConta, CategoriaConta, Relatorio } from '../types';
import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/logger';
import { 
  buscarContas as buscarContasService,
  adicionarConta as adicionarContaService,
  atualizarConta as atualizarContaService,
  removerConta as removerContaService,
  marcarComoPaga as marcarComoPagaService
} from '../services/contasService';
import { exportarParaExcel, exportarParaPDF } from '../services/exportService';

interface FinancasContextData {
  contas: Conta[];
  contasFiltradas: Conta[];
  relatorio: Relatorio;
  filtro: Filtro;
  setFiltro: React.Dispatch<React.SetStateAction<Filtro>>;
  loading: boolean;
  buscarContas: () => Promise<void>;
  adicionarConta: (conta: Omit<Conta, 'id' | 'status'>) => Promise<void>;
  atualizarConta: (id: string, conta: Partial<Conta>) => Promise<void>;
  removerConta: (id: string) => Promise<void>;
  marcarComoPaga: (id: string) => Promise<void>;
  aplicarFiltro: (filtro: Filtro) => void;
  limparFiltro: () => void;
  gerarRelatorio: (mes: number, ano: number) => Relatorio;
  exportarParaExcel: () => void;
  exportarParaPDF: () => void;
}

interface FinancasProviderProps {
  children: ReactNode;
}

export const FinancasContext = createContext({} as FinancasContextData);

export function FinancasProvider({ children }: FinancasProviderProps) {
  console.log('FinancasProvider sendo montado');
  
  // Referência para o último dia em que as contas foram verificadas
  const ultimaVerificacaoRef = useRef(new Date());
  const { usuario, isAuthenticated } = useAuth();
  const [carregando, setCarregando] = useState(false);
  
  const [contas, setContas] = useState<Conta[]>([]);
  
  // Filtro padrão: mês e ano atual
  const [filtro, setFiltro] = useState<Filtro>(() => {
    try {
      const filtroSalvo = localStorage.getItem('@MFFinancas:filtro');
      if (filtroSalvo) {
        return JSON.parse(filtroSalvo);
      }
      return {
        mes: new Date().getMonth() + 1, // Janeiro é 0, então soma 1
        ano: new Date().getFullYear()
      };
    } catch (error) {
      console.error('Erro ao recuperar filtro do localStorage:', error);
      return {
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear()
      };
    }
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
          await atualizarContaService(conta.id, usuario.id, { status: conta.status });
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
      const sucesso = await atualizarContaService(id, usuario.id, conta);
      
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
  function exportarParaExcelHandler() {
    try {
      logger.exportLog('Solicitação de exportação para Excel', {
        filtro,
        quantidadeContas: contasFiltradas.length || contas.length
      });
      
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
      
      // Exportar para Excel
      exportarParaExcel(
        dados, 
        relatorio, 
        filtro.mes || new Date().getMonth() + 1, 
        filtro.ano || new Date().getFullYear()
      )
        .then(nomeArquivo => {
          toast.success('Arquivo Excel gerado com sucesso!');
        })
        .catch(error => {
          toast.error('Erro ao exportar para Excel. Tente novamente.');
        });
    } catch (error) {
      logger.error('Erro ao exportar para Excel', error);
      toast.error('Erro ao exportar para Excel. Tente novamente.');
    }
  }

  // Função para exportar para PDF
  function exportarParaPdfHandler() {
    try {
      logger.exportLog('Solicitação de exportação para PDF', {
        filtro,
        quantidadeContas: contasFiltradas.length || contas.length
      });
      
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
      
      // Exportar para PDF
      try {
        const nomeArquivo = exportarParaPDF(
          dados, 
          relatorio, 
          filtro.mes || new Date().getMonth() + 1, 
          filtro.ano || new Date().getFullYear()
        );
        toast.success('Arquivo PDF gerado com sucesso!');
      } catch (error) {
        toast.error('Erro ao exportar para PDF. Tente novamente.');
      }
    } catch (error) {
      logger.error('Erro ao exportar para PDF', error);
      toast.error('Erro ao exportar para PDF. Tente novamente.');
    }
  }

  return (
    <FinancasContext.Provider
      value={{
        contas,
        contasFiltradas,
        relatorio: gerarRelatorio(filtro.mes || new Date().getMonth() + 1, filtro.ano || new Date().getFullYear()),
        filtro,
        setFiltro,
        loading: carregando,
        buscarContas: async () => {
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
        },
        adicionarConta,
        atualizarConta,
        removerConta,
        marcarComoPaga,
        aplicarFiltro: atualizarFiltro,
        limparFiltro: () => setFiltro({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear() }),
        gerarRelatorio,
        exportarParaExcel: exportarParaExcelHandler,
        exportarParaPDF: exportarParaPdfHandler
      }}
    >
      {children}
    </FinancasContext.Provider>
  );
}