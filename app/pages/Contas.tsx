import React from 'react';
import styled from 'styled-components';
import { FiPlus, FiDownload, FiPrinter, FiFileText } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useFinancas } from '../hooks/useFinancas';
import { ContaItem } from '../components/ContaItem';
import { FiltroConta } from '../components/FiltroConta';

const ContasHeader = styled.div`
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

const ContasTitulo = styled.h1`
  font-size: 1.5rem;
  color: var(--text-primary);
`;

const ContasAcoes = styled.div`
  display: flex;
  gap: 0.5rem;
  
  @media (max-width: 576px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const ContasEmpty = styled.div`
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

export default function Contas() {
  const { contasFiltradas, exportarParaExcel, exportarParaPDF } = useFinancas();
  
  return (
    <div>
      <ContasHeader>
        <ContasTitulo>Gerenciar Contas</ContasTitulo>
        
        <ContasAcoes>
          <Link to="/contas/cadastrar" className="btn btn-primary">
            <FiPlus size={18} style={{ marginRight: '0.5rem' }} />
            Nova Conta
          </Link>
          
          <button 
            className="btn btn-outline"
            onClick={exportarParaExcel}
            title="Exportar para Excel"
          >
            <FiDownload size={18} />
          </button>
          
          <button 
            className="btn btn-outline"
            onClick={exportarParaPDF}
            title="Exportar para PDF"
          >
            <FiPrinter size={18} />
          </button>
        </ContasAcoes>
      </ContasHeader>
      
      <FiltroConta />
      
      {contasFiltradas.length > 0 ? (
        <div>
          {contasFiltradas.map(conta => (
            <ContaItem key={conta.id} conta={conta} />
          ))}
        </div>
      ) : (
        <ContasEmpty>
          <FiFileText size={48} />
          <h2>Nenhuma conta encontrada</h2>
          <p>Não há contas cadastradas com os filtros selecionados.</p>
          <Link to="/contas/cadastrar" className="btn btn-primary">
            Cadastrar Nova Conta
          </Link>
        </ContasEmpty>
      )}
    </div>
  );
} 