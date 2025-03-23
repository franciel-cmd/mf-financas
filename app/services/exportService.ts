import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Conta, Relatorio } from '../types';
import { logger } from '../utils/logger';

/**
 * Serviço para centralizar as funções de exportação de dados
 * Isso permite mais fácil manutenção e testabilidade
 */

/**
 * Exporta os dados das contas para um arquivo PDF
 * @param contas Lista de contas para exportar
 * @param relatorio Dados do relatório financeiro
 * @param filtro Informações do filtro aplicado (mês e ano)
 * @returns Nome do arquivo gerado
 */
export const exportarParaPDF = (
  contas: Conta[],
  relatorio: Relatorio,
  mes: number,
  ano: number
): string => {
  logger.exportLog('Iniciando exportação para PDF', { 
    quantidadeContas: contas.length,
    mes,
    ano
  });

  try {
    // Cria um novo documento PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
  
    // Função para formatar moeda
    const formatarMoeda = (valor: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valor);
    };
  
    // Adiciona o título
    const mesPorExtenso = format(new Date(ano, mes - 1, 1), 'MMMM', { locale: ptBR });
    const titulo = `Relatório Financeiro - ${mesPorExtenso.charAt(0).toUpperCase() + mesPorExtenso.slice(1)}/${ano}`;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const titleWidth = doc.getTextWidth(titulo);
    doc.text(titulo, (pageWidth - titleWidth) / 2, 20);
  
    // Adiciona o resumo
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro', 14, 35);
  
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Pago: ${formatarMoeda(relatorio.totalPago)}`, 14, 45);
    doc.text(`Total em Aberto: ${formatarMoeda(relatorio.totalEmAberto)}`, 14, 52);
    doc.text(`Total Vencido: ${formatarMoeda(relatorio.totalVencido)}`, 14, 59);
    doc.text(`Total Geral: ${formatarMoeda(relatorio.totalPago + relatorio.totalEmAberto + relatorio.totalVencido)}`, 14, 66);
  
    // Adiciona informações por categoria
    doc.setFont('helvetica', 'bold');
    doc.text('Gastos por Categoria:', 14, 80);
    doc.setFont('helvetica', 'normal');
  
    const categoriaNomes: Record<string, string> = {
      fixa: 'Fixa',
      variavel: 'Variável',
      cartao: 'Cartão de Crédito',
      imposto: 'Imposto',
      outro: 'Outro'
    };
  
    let yPos = 90;
    Object.entries(relatorio.contasPorCategoria).forEach(([categoria, valor]) => {
      const categoriaNome = categoriaNomes[categoria as keyof typeof categoriaNomes];
      doc.text(`${categoriaNome}: ${formatarMoeda(valor)}`, 14, yPos);
      yPos += 7;
    });
  
    // Adiciona a lista de contas
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento de Contas:', 14, yPos);
    yPos += 10;
  
    // Cabeçalhos
    const colunas = [
      { header: 'Nome', width: 60, x: 14 },
      { header: 'Valor', width: 30, x: 74 },
      { header: 'Vencimento', width: 30, x: 104 },
      { header: 'Status', width: 30, x: 134 },
      { header: 'Categoria', width: 30, x: 164 }
    ];
  
    // Adiciona cabeçalhos
    colunas.forEach(coluna => {
      doc.text(coluna.header, coluna.x, yPos);
    });
  
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  
    // Função para mapear status para nome amigável
    const statusNomes: Record<string, string> = {
      paga: 'Paga',
      aberta: 'Em aberto',
      vencida: 'Vencida'
    };
  
    // Adiciona os dados das contas
    contas.forEach((conta) => {
      // Verifica se precisamos adicionar uma nova página
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const statusNome = statusNomes[conta.status as keyof typeof statusNomes];
      const categoriaNome = categoriaNomes[conta.categoria as keyof typeof categoriaNomes];
      
      doc.text(conta.nome.substring(0, 25), colunas[0].x, yPos);
      doc.text(formatarMoeda(conta.valor), colunas[1].x, yPos);
      doc.text(format(parseISO(conta.dataVencimento), 'dd/MM/yyyy'), colunas[2].x, yPos);
      doc.text(statusNome, colunas[3].x, yPos);
      doc.text(categoriaNome, colunas[4].x, yPos);
      
      yPos += 7;
    });
  
    // Nome do arquivo
    const nomeArquivo = `MF_Financas_${mes}_${ano}.pdf`;
    
    // Salva o arquivo
    doc.save(nomeArquivo);
    logger.exportLog('Exportação para PDF concluída com sucesso', { 
      nomeArquivo,
      tamanho: `${doc.internal.pageSize.getWidth()}x${doc.internal.pageSize.getHeight()} - ${doc.internal.pages.length} páginas`
    });
    
    return nomeArquivo;
  } catch (error) {
    logger.error('Erro ao exportar para PDF', error);
    throw new Error('Falha ao exportar para PDF');
  }
};

/**
 * Exporta os dados das contas para um arquivo Excel
 * @param contas Lista de contas para exportar
 * @param relatorio Dados do relatório financeiro
 * @param filtro Informações do filtro aplicado (mês e ano)
 * @returns Promise com o nome do arquivo gerado
 */
export const exportarParaExcel = async (
  contas: Conta[],
  relatorio: Relatorio,
  mes: number,
  ano: number
): Promise<string> => {
  logger.exportLog('Iniciando exportação para Excel', { 
    quantidadeContas: contas.length,
    mes,
    ano
  });
  
  try {
    // Formatar valor como moeda
    const formatarMoeda = (valor: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valor);
    };
    
    // Cria uma nova pasta de trabalho Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MF - Finanças';
    workbook.created = new Date();
    
    // Adicionar planilha de resumo
    const resumoSheet = workbook.addWorksheet('Resumo');
    
    // Estilo para cabeçalhos
    const estiloTitulo = {
      font: { bold: true, size: 14 },
      alignment: { horizontal: 'center' as const }
    };
    
    const estiloSubtitulo = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F0FF' } }
    };
    
    const estiloValor = {
      alignment: { horizontal: 'right' as const }
    };
    
    // Adicionar título
    const mesPorExtenso = format(new Date(ano, mes - 1, 1), 'MMMM', { locale: ptBR });
    resumoSheet.mergeCells('A1:C1');
    const tituloCell = resumoSheet.getCell('A1');
    tituloCell.value = `Relatório Financeiro - ${mesPorExtenso.charAt(0).toUpperCase() + mesPorExtenso.slice(1)}/${ano}`;
    tituloCell.style = estiloTitulo;
    
    // Dados do resumo
    resumoSheet.addRow([]);
    resumoSheet.addRow(['Resumo Financeiro']);
    resumoSheet.getRow(3).font = { bold: true, size: 12 };
    
    resumoSheet.addRow(['Total Pago:', formatarMoeda(relatorio.totalPago)]);
    resumoSheet.addRow(['Total em Aberto:', formatarMoeda(relatorio.totalEmAberto)]);
    resumoSheet.addRow(['Total Vencido:', formatarMoeda(relatorio.totalVencido)]);
    resumoSheet.addRow(['Total Geral:', formatarMoeda(relatorio.totalPago + relatorio.totalEmAberto + relatorio.totalVencido)]);
    
    // Aplicar estilo aos valores
    for (let i = 4; i <= 7; i++) {
      resumoSheet.getCell(`B${i}`).style = estiloValor;
    }
    
    // Adicionar cabeçalho de categorias
    resumoSheet.addRow([]);
    resumoSheet.addRow(['Gastos por Categoria']);
    resumoSheet.getRow(9).font = { bold: true, size: 12 };
    
    // Mapear nome amigável das categorias
    const categoriaNome: Record<string, string> = {
      fixa: 'Fixa',
      variavel: 'Variável',
      cartao: 'Cartão de Crédito',
      imposto: 'Imposto',
      outro: 'Outro'
    };
    
    // Adicionar dados de categoria
    Object.entries(relatorio.contasPorCategoria).forEach(([categoria, valor]) => {
      resumoSheet.addRow([categoriaNome[categoria as keyof typeof categoriaNome], formatarMoeda(valor)]);
    });
    
    // Ajustar largura das colunas na planilha de resumo
    resumoSheet.getColumn('A').width = 25;
    resumoSheet.getColumn('B').width = 20;
    
    // Adicionar planilha de contas
    const contasSheet = workbook.addWorksheet('Contas');
    
    // Adicionar cabeçalhos
    contasSheet.columns = [
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Data de Vencimento', key: 'dataVencimento', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Categoria', key: 'categoria', width: 20 },
      { header: 'Data de Pagamento', key: 'dataPagamento', width: 20 },
      { header: 'Observações', key: 'observacoes', width: 30 }
    ];
    
    // Estilo para o cabeçalho
    contasSheet.getRow(1).font = { bold: true };
    contasSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F0FF' }
    };
    
    // Mapear status para nomes amigáveis
    const statusNome: Record<string, string> = {
      paga: 'Paga',
      aberta: 'Em aberto',
      vencida: 'Vencida'
    };
    
    // Adicionar dados das contas
    contas.forEach(conta => {
      contasSheet.addRow({
        nome: conta.nome,
        valor: conta.valor,
        dataVencimento: format(parseISO(conta.dataVencimento), 'dd/MM/yyyy'),
        status: statusNome[conta.status as keyof typeof statusNome],
        categoria: categoriaNome[conta.categoria as keyof typeof categoriaNome],
        dataPagamento: conta.dataPagamento ? format(parseISO(conta.dataPagamento), 'dd/MM/yyyy') : '-',
        observacoes: conta.observacoes || '-'
      });
    });
    
    // Formatar a coluna de valor como moeda
    contasSheet.getColumn('valor').numFmt = '"R$"#,##0.00';
    
    // Adicionar cores condicionais para status
    contas.forEach((_, index) => {
      const rowIndex = index + 2; // +2 porque o índice começa em 0 e temos uma linha de cabeçalho
      const statusCell = contasSheet.getCell(`D${rowIndex}`);
      
      if (statusCell.value === 'Paga') {
        statusCell.font = { color: { argb: 'FF16A34A' } }; // Verde
      } else if (statusCell.value === 'Vencida') {
        statusCell.font = { color: { argb: 'FFEF4444' } }; // Vermelho
      } else {
        statusCell.font = { color: { argb: 'FFF59E0B' } }; // Laranja
      }
    });
    
    // Definir nome do arquivo
    const nomeArquivo = `MF_Financas_${mes}_${ano}.xlsx`;
    
    // Salvar o arquivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
    
    logger.exportLog('Exportação para Excel concluída com sucesso', {
      nomeArquivo,
      tamanhoBytesBuffer: buffer.byteLength
    });
    
    return nomeArquivo;
  } catch (error) {
    logger.error('Erro ao exportar para Excel', error);
    throw new Error('Falha ao exportar para Excel');
  }
}; 