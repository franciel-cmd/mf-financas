import React, { useEffect } from 'react';
import styled from 'styled-components';
import { FiCheckCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useFinancas } from '../hooks/useFinancas';
import { ContaItem } from '../components/ContaItem';
import { FiltroConta } from '../components/FiltroConta';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const PageTitle = styled.h1`
  font-size: 1.5rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 0.75rem;
    color: var(--primary);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: var(--surface);
  border-radius: 0.5rem;
  text-align: center;
  
  svg {
    font-size: 3rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }
  
  h2 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }
  
  p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }
`;

export default function ContasPagas() {
  const { contas, aplicarFiltro } = useFinancas();
  
  useEffect(() => {
    // Ao entrar na página, atualiza o filtro para mostrar apenas contas pagas
    aplicarFiltro({ status: 'paga' });
    
    // Limpa o filtro ao sair da página
    return () => {
      aplicarFiltro({ status: undefined });
    };
  }, [aplicarFiltro]);
  
  const contasPagas = contas.filter(conta => conta.status === 'paga');
  
  return (
    <div>
      <PageHeader>
        <PageTitle>
          <FiCheckCircle size={24} />
          Contas Pagas
        </PageTitle>
      </PageHeader>
      
      <FiltroConta />
      
      {contasPagas.length > 0 ? (
        <div>
          {contasPagas.map(conta => (
            <ContaItem key={conta.id} conta={conta} />
          ))}
        </div>
      ) : (
        <EmptyState>
          <FiCheckCircle size={48} />
          <h2>Nenhuma conta paga</h2>
          <p>Você ainda não tem contas marcadas como pagas no período selecionado.</p>
          <Link to="/contas" className="btn btn-primary">
            Ver Todas as Contas
          </Link>
        </EmptyState>
      )}
    </div>
  );
} 