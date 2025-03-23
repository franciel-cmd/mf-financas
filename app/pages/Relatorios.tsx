import React, { useState } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiBarChart2, FiFilter } from 'react-icons/fi';
import { useFinancas } from '../hooks/useFinancas';
import { CategoriaConta } from '../types';
import { ExportacaoButtons } from '../components/ExportacaoButtons';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  @media (max-width: 576px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const PageTitle = styled.h1`
  font-size: 1.75rem;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 0.75rem;
    color: var(--primary);
  }
`;

const RelatorioContainer = styled.div`
  background-color: var(--surface);
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
`;

const ResumoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ResumoCard = styled.div`
  padding: 1.5rem;
  border-radius: 0.375rem;
  background-color: var(--background);
  
  h3 {
    font-size: 1rem;
    color: var(--text-secondary);
    margin: 0 0 0.75rem 0;
    font-weight: 500;
  }
`;

const ValorGrande = styled.div<{ color?: string }>`
  font-size: 1.75rem;
  font-weight: 600;
  color: ${props => props.color || 'var(--primary)'};
`;

const CategoriaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const BarraCategorias = styled.div`
  margin-top: 0.5rem;
`;

const BarraCategoria = styled.div`
  margin-bottom: 1rem;
  
  .info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }
  
  .nome {
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .valor {
    color: var(--text-secondary);
  }
  
  .barra-container {
    height: 0.5rem;
    background-color: var(--border);
    border-radius: 0.25rem;
    overflow: hidden;
  }
  
  .barra {
    height: 100%;
    border-radius: 0.25rem;
  }
`;

const FiltroRelatorio = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 576px) {
    flex-direction: column;
  }
  
  select {
    padding: 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid var(--border);
    background-color: var(--surface);
    min-width: 120px;
  }
`;

export default function Relatorios() {
  const { contas, relatorio, filtro, setFiltro } = useFinancas();
  const [mesSelecionado, setMesSelecionado] = useState<number>(
    filtro.mes || new Date().getMonth() + 1
  );
  const [anoSelecionado, setAnoSelecionado] = useState<number>(
    filtro.ano || new Date().getFullYear()
  );
  
  // Obter anos disponíveis com base nas contas
  const anosDisponiveis = React.useMemo(() => {
    const anos = new Set<number>();
    contas.forEach(conta => {
      const data = new Date(conta.dataVencimento);
      anos.add(data.getFullYear());
    });
    return Array.from(anos).sort((a, b) => b - a); // Ordenar decrescente
  }, [contas]);
  
  // Obter meses disponíveis
  const mesesDisponiveis = [
    { valor: 1, nome: 'Janeiro' },
    { valor: 2, nome: 'Fevereiro' },
    { valor: 3, nome: 'Março' },
    { valor: 4, nome: 'Abril' },
    { valor: 5, nome: 'Maio' },
    { valor: 6, nome: 'Junho' },
    { valor: 7, nome: 'Julho' },
    { valor: 8, nome: 'Agosto' },
    { valor: 9, nome: 'Setembro' },
    { valor: 10, nome: 'Outubro' },
    { valor: 11, nome: 'Novembro' },
    { valor: 12, nome: 'Dezembro' }
  ];
  
  const handleMesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mes = parseInt(e.target.value);
    setMesSelecionado(mes);
    setFiltro(prev => ({ ...prev, mes }));
  };
  
  const handleAnoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ano = parseInt(e.target.value);
    setAnoSelecionado(ano);
    setFiltro(prev => ({ ...prev, ano }));
  };
  
  // Obter total geral
  const totalGeral = relatorio.totalPago + relatorio.totalEmAberto + relatorio.totalVencido;
  
  // Calcular percentual por categoria
  const categorias: { nome: string; valor: number; percentual: number; cor: string }[] = [
    { 
      nome: 'Fixas', 
      valor: relatorio.contasPorCategoria.fixa,
      percentual: totalGeral ? (relatorio.contasPorCategoria.fixa / totalGeral) * 100 : 0,
      cor: 'var(--secondary)'
    },
    { 
      nome: 'Variáveis', 
      valor: relatorio.contasPorCategoria.variavel,
      percentual: totalGeral ? (relatorio.contasPorCategoria.variavel / totalGeral) * 100 : 0,
      cor: 'var(--primary)'
    },
    { 
      nome: 'Cartão', 
      valor: relatorio.contasPorCategoria.cartao,
      percentual: totalGeral ? (relatorio.contasPorCategoria.cartao / totalGeral) * 100 : 0,
      cor: 'var(--warning)'
    },
    { 
      nome: 'Impostos', 
      valor: relatorio.contasPorCategoria.imposto,
      percentual: totalGeral ? (relatorio.contasPorCategoria.imposto / totalGeral) * 100 : 0,
      cor: 'var(--error)'
    },
    { 
      nome: 'Outros', 
      valor: relatorio.contasPorCategoria.outro,
      percentual: totalGeral ? (relatorio.contasPorCategoria.outro / totalGeral) * 100 : 0,
      cor: '#9333EA'
    }
  ].sort((a, b) => b.valor - a.valor);
  
  // Formatar moeda
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(valor);
  };
  
  return (
    <div>
      <PageHeader>
        <PageTitle>
          <FiBarChart2 size={24} />
          Relatório Financeiro
        </PageTitle>
        <ExportacaoButtons />
      </PageHeader>
      
      <FiltroRelatorio>
        <select value={mesSelecionado} onChange={handleMesChange}>
          {mesesDisponiveis.map(mes => (
            <option key={mes.valor} value={mes.valor}>
              {mes.nome}
            </option>
          ))}
        </select>
        
        <select value={anoSelecionado} onChange={handleAnoChange}>
          {anosDisponiveis.length > 0 ? (
            anosDisponiveis.map(ano => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))
          ) : (
            <option value={new Date().getFullYear()}>
              {new Date().getFullYear()}
            </option>
          )}
        </select>
      </FiltroRelatorio>
      
      <RelatorioContainer>
        <SectionTitle>Resumo Financeiro</SectionTitle>
        
        <ResumoGrid>
          <ResumoCard>
            <h3>Total Pago</h3>
            <ValorGrande color="var(--secondary)">
              {formatarMoeda(relatorio.totalPago)}
            </ValorGrande>
          </ResumoCard>
          
          <ResumoCard>
            <h3>Em Aberto</h3>
            <ValorGrande color="var(--warning)">
              {formatarMoeda(relatorio.totalEmAberto)}
            </ValorGrande>
          </ResumoCard>
          
          <ResumoCard>
            <h3>Vencido</h3>
            <ValorGrande color="var(--error)">
              {formatarMoeda(relatorio.totalVencido)}
            </ValorGrande>
          </ResumoCard>
        </ResumoGrid>
        
        <SectionTitle>Despesas por Categoria</SectionTitle>
        
        <CategoriaGrid>
          <div>
            <BarraCategorias>
              {categorias.map(cat => (
                <BarraCategoria key={cat.nome}>
                  <div className="info">
                    <span className="nome">{cat.nome}</span>
                    <span className="valor">{formatarMoeda(cat.valor)}</span>
                  </div>
                  <div className="barra-container">
                    <div 
                      className="barra" 
                      style={{ 
                        width: `${cat.percentual}%`,
                        backgroundColor: cat.cor
                      }}
                    />
                  </div>
                </BarraCategoria>
              ))}
            </BarraCategorias>
          </div>
          
          <ResumoCard>
            <h3>Total Geral</h3>
            <ValorGrande color="var(--primary)">
              {formatarMoeda(totalGeral)}
            </ValorGrande>
            
            <div style={{ marginTop: '1.5rem' }}>
              <p>
                <strong>Mês:</strong> {mesesDisponiveis.find(m => m.valor === mesSelecionado)?.nome}
              </p>
              <p>
                <strong>Ano:</strong> {anoSelecionado}
              </p>
            </div>
          </ResumoCard>
        </CategoriaGrid>
      </RelatorioContainer>
    </div>
  );
} 