import React, { useEffect } from 'react';
import styled from 'styled-components';
import { FiAlertCircle } from 'react-icons/fi';
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
    color: var(--error);
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

export default function ContasVencidas() {
  const { contas, atualizarFiltro } = useFinancas();
  
  useEffect(() => {
    // Ao entrar na página, atualiza o filtro para mostrar apenas contas vencidas
    atualizarFiltro({ status: 'vencida' });
    
    // Limpa o filtro ao sair da página
    return () => {
      atualizarFiltro({ status: undefined });
    };
  }, [atualizarFiltro]);
  
  const contasVencidas = contas.filter(conta => conta.status === 'vencida');
  
  return (
    <div>
      <PageHeader>
        <PageTitle>
          <FiAlertCircle size={24} />
          Contas Vencidas
        </PageTitle>
      </PageHeader>
      
      <FiltroConta />
      
      {contasVencidas.length > 0 ? (
        <div>
          {contasVencidas.map(conta => (
            <ContaItem key={conta.id} conta={conta} />
          ))}
        </div>
      ) : (
        <EmptyState>
          <FiAlertCircle size={48} />
          <h2>Nenhuma conta vencida</h2>
          <p>Você não possui contas vencidas no período selecionado. Ótimo trabalho!</p>
          <Link to="/contas" className="btn btn-primary">
            Ver Todas as Contas
          </Link>
        </EmptyState>
      )}
    </div>
  );
} 