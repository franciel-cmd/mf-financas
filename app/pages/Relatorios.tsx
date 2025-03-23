import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiBarChart2, FiDownload, FiPrinter } from 'react-icons/fi';
import { useFinancas } from '../hooks/useFinancas';
import { CategoriaConta } from '../types';

const RelatoriosHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  @media (max-width: 576px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const RelatoriosTitulo = styled.h1`
  font-size: 1.5rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 0.75rem;
    color: var(--primary);
  }
`;

const RelatoriosAcoes = styled.div`
  display: flex;
  gap: 0.5rem;
  
  @media (max-width: 576px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const FiltroRelatorio = styled.div`
  background-color: var(--surface);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const FiltroForm = styled.form`
  display: flex;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const FiltroGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
`;

const FiltroLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
`;

const FiltroSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background-color: var(--surface);
  font-size: 1rem;
  color: var(--text-primary);
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const RelatorioCard = styled.div`
  background-color: var(--surface);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const RelatorioTitulo = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
`;

const EstatsticasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const EstatsticaItem = styled.div`
  background-color: var(--background);
  border-radius: 0.375rem;
  padding: 1.5rem;
  text-align: center;
`;

const EstatsticaValor = styled.div<{ color?: string }>`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.color || 'var(--primary)'};
  margin-bottom: 0.5rem;
`;

const EstatsticaLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.875rem;
`;

const CategoriaTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const CategoriaTableHead = styled.thead`
  th {
    text-align: left;
    padding: 0.75rem;
    border-bottom: 1px solid var(--border);
    color: var(--text-secondary);
    font-weight: 500;
    font-size: 0.875rem;
  }
`;

const CategoriaTableBody = styled.tbody`
  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border);
    color: var(--text-primary);
  }
  
  tr:last-child td {
    border-bottom: none;
  }
`;

const CategoriaValor = styled.td`
  text-align: right;
  font-weight: 500;
`;

const meses = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export default function Relatorios() {
  const { gerarRelatorio, exportarParaExcel, exportarParaPDF } = useFinancas();
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1];
  const mesAtual = new Date().getMonth() + 1;
  
  const [filtro, setFiltro] = useState({
    mes: mesAtual,
    ano: anoAtual,
  });
  
  const [relatorio, setRelatorio] = useState(() => gerarRelatorio(filtro.mes, filtro.ano));
  
  useEffect(() => {
    setRelatorio(gerarRelatorio(filtro.mes, filtro.ano));
  }, [filtro, gerarRelatorio]);
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltro(prev => ({ ...prev, [name]: parseInt(value) }));
  };
  
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(valor);
  };
  
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
  
  return (
    <div>
      <RelatoriosHeader>
        <RelatoriosTitulo>
          <FiBarChart2 size={24} />
          Relatórios
        </RelatoriosTitulo>
        
        <RelatoriosAcoes>
          <button 
            className="btn btn-outline"
            onClick={exportarParaExcel}
            title="Exportar para Excel"
          >
            <FiDownload size={18} style={{ marginRight: '0.5rem' }} />
            Excel
          </button>
          
          <button 
            className="btn btn-outline"
            onClick={exportarParaPDF}
            title="Exportar para PDF"
          >
            <FiPrinter size={18} style={{ marginRight: '0.5rem' }} />
            PDF
          </button>
        </RelatoriosAcoes>
      </RelatoriosHeader>
      
      <FiltroRelatorio>
        <FiltroForm>
          <FiltroGrupo>
            <FiltroLabel htmlFor="mes">Mês</FiltroLabel>
            <FiltroSelect 
              id="mes"
              name="mes"
              value={filtro.mes}
              onChange={handleChange}
            >
              {meses.map(mes => (
                <option key={mes.value} value={mes.value}>
                  {mes.label}
                </option>
              ))}
            </FiltroSelect>
          </FiltroGrupo>
          
          <FiltroGrupo>
            <FiltroLabel htmlFor="ano">Ano</FiltroLabel>
            <FiltroSelect 
              id="ano"
              name="ano"
              value={filtro.ano}
              onChange={handleChange}
            >
              {anos.map(ano => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </FiltroSelect>
          </FiltroGrupo>
        </FiltroForm>
      </FiltroRelatorio>
      
      <RelatorioCard>
        <RelatorioTitulo>
          Resumo Financeiro - {meses.find(m => m.value === filtro.mes)?.label} / {filtro.ano}
        </RelatorioTitulo>
        
        <EstatsticasGrid>
          <EstatsticaItem>
            <EstatsticaValor color="var(--secondary)">
              {formatarValor(relatorio.totalPago)}
            </EstatsticaValor>
            <EstatsticaLabel>Total Pago</EstatsticaLabel>
          </EstatsticaItem>
          
          <EstatsticaItem>
            <EstatsticaValor color="var(--warning)">
              {formatarValor(relatorio.totalEmAberto)}
            </EstatsticaValor>
            <EstatsticaLabel>Em Aberto</EstatsticaLabel>
          </EstatsticaItem>
          
          <EstatsticaItem>
            <EstatsticaValor color="var(--error)">
              {formatarValor(relatorio.totalVencido)}
            </EstatsticaValor>
            <EstatsticaLabel>Vencido</EstatsticaLabel>
          </EstatsticaItem>
        </EstatsticasGrid>
        
        <RelatorioTitulo>Gastos por Categoria</RelatorioTitulo>
        
        <CategoriaTable>
          <CategoriaTableHead>
            <tr>
              <th>Categoria</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
            </tr>
          </CategoriaTableHead>
          
          <CategoriaTableBody>
            {Object.entries(relatorio.contasPorCategoria).map(([categoria, valor]) => (
              <tr key={categoria}>
                <td>{categoriaFormatada(categoria)}</td>
                <CategoriaValor>{formatarValor(valor)}</CategoriaValor>
              </tr>
            ))}
            
            <tr>
              <td style={{ fontWeight: 'bold' }}>Total</td>
              <CategoriaValor style={{ color: 'var(--primary)' }}>
                {formatarValor(
                  relatorio.totalPago + relatorio.totalEmAberto + relatorio.totalVencido
                )}
              </CategoriaValor>
            </tr>
          </CategoriaTableBody>
        </CategoriaTable>
      </RelatorioCard>
    </div>
  );
} 