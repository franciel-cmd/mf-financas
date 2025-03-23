import React, { createContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, isAfter, parseISO, addDays, differenceInDays, startOfDay } from 'date-fns';
import { toast } from 'react-toastify';
import { Conta, Filtro, StatusConta, CategoriaConta, Relatorio } from '../types';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

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
}

interface FinancasProviderProps {
  children: ReactNode;
}

export const FinancasContext = createContext({} as FinancasContextData);

export function FinancasProvider({ children }: FinancasProviderProps) {
  // Referência para o último dia em que as contas foram verificadas
  const ultimaVerificacaoRef = useRef(new Date());
  
  const [contas, setContas] = useState<Conta[]>(() => {
    try {
      const storedContas = localStorage.getItem('@MFFinancas:contas');
      if (storedContas) {
        return JSON.parse(storedContas);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do localStorage:', error);
    }
    return [];
  });

  const [filtro, setFiltro] = useState<Filtro>(() => {
    try {
      const storedFiltro = localStorage.getItem('@MFFinancas:filtro');
      if (storedFiltro) {
        return JSON.parse(storedFiltro);
      }
    } catch (error) {
      console.error('Erro ao carregar filtro do localStorage:', error);
    }
    
    // Filtro padrão (mês e ano atuais)
    const hoje = new Date();
    return {
      mes: hoje.getMonth() + 1,
      ano: hoje.getFullYear(),
    };
  });

  // Função para verificar contas vencidas
  const verificarContasVencidas = useCallback(() => {
    const hoje = startOfDay(new Date());
    const ultimaVerificacao = startOfDay(ultimaVerificacaoRef.current);
    
    // Só atualiza se for um novo dia
    if (hoje.getTime() !== ultimaVerificacao.getTime()) {
      const contasAtualizadas = contas.map(conta => {
        if (conta.status === 'aberta' && isAfter(hoje, parseISO(conta.dataVencimento))) {
          return { ...conta, status: 'vencida' as StatusConta };
        }
        return conta;
      });

      if (JSON.stringify(contasAtualizadas) !== JSON.stringify(contas)) {
        setContas(contasAtualizadas);
      }
      
      ultimaVerificacaoRef.current = hoje;
    }
  }, [contas]);

  // Efeito para salvar dados no localStorage quando o estado de contas mudar
  useEffect(() => {
    try {
      localStorage.setItem('@MFFinancas:contas', JSON.stringify(contas));
    } catch (error) {
      console.error('Erro ao salvar dados no localStorage:', error);
    }
  }, [contas]);

  // Efeito para verificar contas vencidas na inicialização e quando o componente é montado
  useEffect(() => {
    verificarContasVencidas();
    
    // Executa a verificação a cada vez que o aplicativo é aberto/fechado
    window.addEventListener('focus', verificarContasVencidas);
    
    return () => {
      window.removeEventListener('focus', verificarContasVencidas);
    };
  }, [verificarContasVencidas]);

  // Filtrar contas com base no filtro atual
  const contasFiltradas = React.useMemo(() => {
    return contas.filter(conta => {
      const dataVencimento = parseISO(conta.dataVencimento);
      const mesVencimento = dataVencimento.getMonth() + 1;
      const anoVencimento = dataVencimento.getFullYear();
      
      const filtroMes = filtro.mes ? mesVencimento === filtro.mes : true;
      const filtroAno = filtro.ano ? anoVencimento === filtro.ano : true;
      const filtroCategoria = filtro.categoria ? conta.categoria === filtro.categoria : true;
      const filtroStatus = filtro.status ? conta.status === filtro.status : true;
      
      return filtroMes && filtroAno && filtroCategoria && filtroStatus;
    });
  }, [contas, filtro]);

  function adicionarConta(novaConta: Omit<Conta, 'id' | 'status'>) {
    const contaCompleta: Conta = {
      ...novaConta,
      id: uuidv4(),
      status: 'aberta',
    };

    // Verifica se a conta já está vencida na criação
    const hoje = new Date();
    if (isAfter(hoje, parseISO(contaCompleta.dataVencimento))) {
      contaCompleta.status = 'vencida';
    }

    setContas(estadoAnterior => [...estadoAnterior, contaCompleta]);
    toast.success('Conta cadastrada com sucesso!');
  }

  function atualizarConta(id: string, dadosAtualizados: Partial<Conta>) {
    setContas(estadoAnterior => 
      estadoAnterior.map(conta => 
        conta.id === id ? { ...conta, ...dadosAtualizados } : conta
      )
    );
    toast.success('Conta atualizada com sucesso!');
  }

  function removerConta(id: string) {
    setContas(estadoAnterior => estadoAnterior.filter(conta => conta.id !== id));
    toast.success('Conta removida com sucesso!');
  }

  function marcarComoPaga(id: string) {
    const hoje = new Date();
    setContas(estadoAnterior => 
      estadoAnterior.map(conta => 
        conta.id === id 
          ? { 
              ...conta, 
              status: 'paga', 
              dataPagamento: hoje.toISOString() 
            } 
          : conta
      )
    );
    toast.success('Conta marcada como paga!');
  }

  function atualizarFiltro(novoFiltro: Partial<Filtro>) {
    setFiltro(filtroAnterior => ({ ...filtroAnterior, ...novoFiltro }));
  }

  function gerarRelatorio(mes: number, ano: number): Relatorio {
    // Filtra contas do período
    const contasDoPeriodo = contas.filter(conta => {
      const dataVencimento = parseISO(conta.dataVencimento);
      const mesVencimento = dataVencimento.getMonth() + 1;
      const anoVencimento = dataVencimento.getFullYear();
      
      return mesVencimento === mes && anoVencimento === ano;
    });

    // Calcula totais
    const totalPago = contasDoPeriodo
      .filter(conta => conta.status === 'paga')
      .reduce((acc, conta) => acc + conta.valor, 0);
    
    const totalEmAberto = contasDoPeriodo
      .filter(conta => conta.status === 'aberta')
      .reduce((acc, conta) => acc + conta.valor, 0);
    
    const totalVencido = contasDoPeriodo
      .filter(conta => conta.status === 'vencida')
      .reduce((acc, conta) => acc + conta.valor, 0);

    // Calcula totais por categoria
    const contasPorCategoria = contasDoPeriodo.reduce((acc, conta) => {
      acc[conta.categoria] = (acc[conta.categoria] || 0) + conta.valor;
      return acc;
    }, {} as Record<CategoriaConta, number>);

    return {
      totalPago,
      totalEmAberto,
      totalVencido,
      contasPorCategoria,
      periodo: { mes, ano }
    };
  }

  function exportarParaExcel() {
    try {
      // Gera o relatório para o período atual
      const relatorio = gerarRelatorio(filtro.mes || new Date().getMonth() + 1, filtro.ano || new Date().getFullYear());
      
      // Obtém o nome do mês para o título
      const mesesNomes = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const nomeMes = mesesNomes[relatorio.periodo.mes - 1];
      
      // Helper para converter o nome da categoria
      const categoriaFormatada = (categoria: string) => {
        switch(categoria) {
          case 'fixa':
            return 'Despesa Fixa';
          case 'variavel':
            return 'Despesa Variável';
          case 'cartao':
            return 'Cartão de Crédito';
          case 'imposto':
            return 'Imposto';
          default:
            return 'Outro';
        }
      };
      
      // Helper para formatar o status
      const statusFormatado = (status: string) => {
        switch(status) {
          case 'paga':
            return 'Paga';
          case 'aberta':
            return 'Em aberto';
          case 'vencida':
            return 'Vencida';
          default:
            return status;
        }
      };
      
      // Filtra contas do período
      const contasDoPeriodo = contas.filter(conta => {
        const dataVencimento = parseISO(conta.dataVencimento);
        const mesVencimento = dataVencimento.getMonth() + 1;
        const anoVencimento = dataVencimento.getFullYear();
        
        return mesVencimento === relatorio.periodo.mes && anoVencimento === relatorio.periodo.ano;
      });
      
      // Cria uma nova planilha
      const workbook = XLSX.utils.book_new();
      
      // ---- Planilha 1: Resumo ----
      const resumoData = [
        ['Relatório Financeiro', `${nomeMes}/${relatorio.periodo.ano}`],
        ['Gerado em:', format(new Date(), 'dd/MM/yyyy HH:mm')],
        [''],
        ['Resumo Financeiro'],
        ['Total Pago:', relatorio.totalPago],
        ['Em Aberto:', relatorio.totalEmAberto],
        ['Vencido:', relatorio.totalVencido],
        ['Total Geral:', relatorio.totalPago + relatorio.totalEmAberto + relatorio.totalVencido],
        [''],
        ['Gastos por Categoria'],
      ];
      
      // Adiciona os gastos por categoria
      Object.entries(relatorio.contasPorCategoria).forEach(([categoria, valor]) => {
        resumoData.push([categoriaFormatada(categoria), valor]);
      });
      
      // Adiciona o total de gastos
      resumoData.push(['Total', relatorio.totalPago + relatorio.totalEmAberto + relatorio.totalVencido]);
      
      // Cria a planilha de resumo
      const resumoWorksheet = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(workbook, resumoWorksheet, 'Resumo');
      
      // ---- Planilha 2: Detalhes das Contas ----
      // Cabeçalho
      const contasHeaders = ['Nome', 'Valor', 'Data de Vencimento', 'Status', 'Categoria', 'Observações'];
      
      // Converte as contas para linhas
      const contasData = contasDoPeriodo.map(conta => [
        conta.nome,
        conta.valor,
        format(parseISO(conta.dataVencimento), 'dd/MM/yyyy'),
        statusFormatado(conta.status),
        categoriaFormatada(conta.categoria),
        conta.observacoes || ''
      ]);
      
      // Adiciona cabeçalho às linhas
      contasData.unshift(contasHeaders);
      
      // Cria a planilha de contas
      const contasWorksheet = XLSX.utils.aoa_to_sheet(contasData);
      XLSX.utils.book_append_sheet(workbook, contasWorksheet, 'Contas');
      
      // Salva o arquivo Excel
      const nomeArquivo = `relatorio-financeiro-${relatorio.periodo.mes}-${relatorio.periodo.ano}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);
      
      toast.success('Relatório Excel gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast.error('Erro ao gerar o relatório Excel. Tente novamente.');
    }
  }

  function exportarParaPDF() {
    try {
      // Gera o relatório para o período atual
      const relatorio = gerarRelatorio(filtro.mes || new Date().getMonth() + 1, filtro.ano || new Date().getFullYear());
      
      // Obtém o nome do mês para o título
      const mesesNomes = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const nomeMes = mesesNomes[relatorio.periodo.mes - 1];
      
      // Cria um novo documento PDF
      const doc = new jsPDF();
      
      // Adiciona cores para status
      const cores = {
        paga: [39, 174, 96] as [number, number, number],    // Verde
        aberta: [243, 156, 18] as [number, number, number], // Amarelo
        vencida: [231, 76, 60] as [number, number, number]  // Vermelho
      };
      
      // Adiciona o título do relatório
      doc.setFontSize(18);
      doc.setTextColor(33, 37, 41);
      doc.text(`Relatório Financeiro - ${nomeMes}/${relatorio.periodo.ano}`, 105, 20, { align: 'center' });
      
      // Adiciona a data de geração
      doc.setFontSize(10);
      doc.setTextColor(108, 117, 125);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 28, { align: 'center' });
      
      // Função para formatar valores monetários
      const formatarValor = (valor: number) => {
        return new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(valor);
      };
      
      // Função para formatar datas
      const formatarData = (dataISO: string) => {
        return format(parseISO(dataISO), 'dd/MM/yyyy');
      };
      
      // Helper para converter o nome da categoria
      const categoriaFormatada = (categoria: string) => {
        switch(categoria) {
          case 'fixa':
            return 'Despesa Fixa';
          case 'variavel':
            return 'Despesa Variável';
          case 'cartao':
            return 'Cartão de Crédito';
          case 'imposto':
            return 'Imposto';
          default:
            return 'Outro';
        }
      };
      
      // Helper para formatar o status
      const statusFormatado = (status: string) => {
        switch(status) {
          case 'paga':
            return 'Paga';
          case 'aberta':
            return 'Em aberto';
          case 'vencida':
            return 'Vencida';
          default:
            return status;
        }
      };
      
      // ---- Seção 1: Resumo Financeiro ----
      doc.setFontSize(14);
      doc.setTextColor(33, 37, 41);
      doc.text('Resumo Financeiro', 20, 40);
      
      // Linha horizontal
      doc.setDrawColor(230, 230, 230);
      doc.line(20, 42, 190, 42);
      
      // Dados do resumo financeiro
      doc.setFontSize(12);
      doc.setTextColor(33, 37, 41);
      doc.text('Total Pago:', 20, 52);
      doc.setTextColor(cores.paga[0], cores.paga[1], cores.paga[2]);
      doc.text(formatarValor(relatorio.totalPago), 70, 52);
      
      doc.setTextColor(33, 37, 41);
      doc.text('Em Aberto:', 20, 60);
      doc.setTextColor(cores.aberta[0], cores.aberta[1], cores.aberta[2]);
      doc.text(formatarValor(relatorio.totalEmAberto), 70, 60);
      
      doc.setTextColor(33, 37, 41);
      doc.text('Vencido:', 20, 68);
      doc.setTextColor(cores.vencida[0], cores.vencida[1], cores.vencida[2]);
      doc.text(formatarValor(relatorio.totalVencido), 70, 68);
      
      doc.setTextColor(33, 37, 41);
      doc.text('Total Geral:', 20, 76);
      doc.setFont('Helvetica', 'bold');
      doc.text(formatarValor(relatorio.totalPago + relatorio.totalEmAberto + relatorio.totalVencido), 70, 76);
      doc.setFont('Helvetica', 'normal');
      
      // ---- Seção 2: Gastos por Categoria ----
      doc.setFontSize(14);
      doc.setTextColor(33, 37, 41);
      doc.text('Gastos por Categoria', 20, 90);
      
      // Linha horizontal
      doc.line(20, 92, 190, 92);
      
      // Cabeçalho da tabela
      doc.setFontSize(11);
      doc.setTextColor(108, 117, 125);
      doc.text('Categoria', 20, 100);
      doc.text('Valor', 150, 100);
      
      // Dados da tabela
      let y = 108;
      doc.setFontSize(11);
      doc.setTextColor(33, 37, 41);
      
      Object.entries(relatorio.contasPorCategoria).forEach(([categoria, valor]) => {
        doc.text(categoriaFormatada(categoria), 20, y);
        doc.text(formatarValor(valor), 150, y, { align: 'left' });
        y += 8;
      });
      
      // Total da tabela
      y += 4;
      doc.setFont('Helvetica', 'bold');
      doc.text('Total', 20, y);
      doc.text(
        formatarValor(relatorio.totalPago + relatorio.totalEmAberto + relatorio.totalVencido),
        150, y, { align: 'left' }
      );
      doc.setFont('Helvetica', 'normal');
      
      // ---- Seção 3: Lista de Contas do Período ----
      y += 16;
      doc.setFontSize(14);
      doc.setTextColor(33, 37, 41);
      doc.text('Contas do Período', 20, y);
      
      // Linha horizontal
      y += 2;
      doc.line(20, y, 190, y);
      y += 8;
      
      // Filtra contas do período
      const contasDoPeriodo = contas.filter(conta => {
        const dataVencimento = parseISO(conta.dataVencimento);
        const mesVencimento = dataVencimento.getMonth() + 1;
        const anoVencimento = dataVencimento.getFullYear();
        
        return mesVencimento === relatorio.periodo.mes && anoVencimento === relatorio.periodo.ano;
      });
      
      // Se não tiver contas no período, mostra uma mensagem
      if (contasDoPeriodo.length === 0) {
        doc.setFontSize(11);
        doc.setTextColor(108, 117, 125);
        doc.text('Nenhuma conta registrada para este período.', 20, y);
      } else {
        // Cabeçalho da tabela de contas
        doc.setFontSize(10);
        doc.setTextColor(108, 117, 125);
        doc.text('Nome', 20, y);
        doc.text('Vencimento', 90, y);
        doc.text('Valor', 125, y);
        doc.text('Status', 160, y);
        y += 6;
        
        // Dados da tabela
        doc.setFontSize(10);
        doc.setTextColor(33, 37, 41);
        
        // Limita o número de contas a serem exibidas para evitar quebra de página
        const contasExibidas = contasDoPeriodo.slice(0, 15);
        
        contasExibidas.forEach(conta => {
          // Se estiver perto do fim da página, adiciona uma nova página
          if (y > 270) {
            doc.addPage();
            y = 20;
            
            // Adiciona cabeçalho na nova página
            doc.setFontSize(10);
            doc.setTextColor(108, 117, 125);
            doc.text('Nome', 20, y);
            doc.text('Vencimento', 90, y);
            doc.text('Valor', 125, y);
            doc.text('Status', 160, y);
            y += 6;
            
            doc.setFontSize(10);
            doc.setTextColor(33, 37, 41);
          }
          
          // Nome da conta (truncado se for muito longo)
          const nomeExibido = conta.nome.length > 30 ? conta.nome.substring(0, 27) + '...' : conta.nome;
          doc.text(nomeExibido, 20, y);
          
          // Data de vencimento
          doc.text(formatarData(conta.dataVencimento), 90, y);
          
          // Valor
          doc.text(formatarValor(conta.valor), 125, y);
          
          // Status com cor correspondente
          const statusConta = conta.status as keyof typeof cores;
          doc.setTextColor(cores[statusConta][0], cores[statusConta][1], cores[statusConta][2]);
          doc.text(statusFormatado(conta.status), 160, y);
          doc.setTextColor(33, 37, 41);
          
          y += 6;
        });
        
        // Se tiver muitas contas, mostrar indicação de que há mais
        if (contasDoPeriodo.length > contasExibidas.length) {
          doc.setFontSize(9);
          doc.setTextColor(108, 117, 125);
          doc.text(`... e mais ${contasDoPeriodo.length - contasExibidas.length} conta(s) não exibida(s) no relatório.`, 20, y);
        }
      }
      
      // Adiciona um rodapé
      doc.setFontSize(9);
      doc.setTextColor(108, 117, 125);
      doc.text('MF - Finanças - Gerenciador de Contas a Pagar', 105, 285, { align: 'center' });
      
      // Salva o PDF
      doc.save(`relatorio-financeiro-${relatorio.periodo.mes}-${relatorio.periodo.ano}.pdf`);
      
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar o relatório PDF. Tente novamente.');
    }
  }

  // Salvar filtro no localStorage quando mudar
  useEffect(() => {
    try {
      localStorage.setItem('@MFFinancas:filtro', JSON.stringify(filtro));
    } catch (error) {
      console.error('Erro ao salvar filtro no localStorage:', error);
    }
  }, [filtro]);

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
        exportarParaPDF
      }}
    >
      {children}
    </FinancasContext.Provider>
  );
} 