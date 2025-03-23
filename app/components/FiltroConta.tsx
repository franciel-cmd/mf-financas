import React, { useState } from 'react';
import styled from 'styled-components';
import { useFinancas } from '../hooks/useFinancas';
import { CategoriaConta, StatusConta } from '../types';

const FiltroContainer = styled.div`
  background-color: var(--surface);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const FiltroTitulo = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
`;

const FiltroForm = styled.form`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
`;

const FiltroGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FiltroLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
`;

const FiltroSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background-color: var(--surface);
  color: var(--text-primary);
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const FiltroAcoes = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  gap: 0.5rem;
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

const categorias = [
  { value: '', label: 'Todas' },
  { value: 'fixa', label: 'Despesa Fixa' },
  { value: 'variavel', label: 'Despesa Variável' },
  { value: 'cartao', label: 'Cartão de Crédito' },
  { value: 'imposto', label: 'Imposto' },
  { value: 'outro', label: 'Outro' },
];

const status = [
  { value: '', label: 'Todos' },
  { value: 'aberta', label: 'Em Aberto' },
  { value: 'paga', label: 'Paga' },
  { value: 'vencida', label: 'Vencida' },
];

export function FiltroConta() {
  const { filtro, atualizarFiltro } = useFinancas();
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1];
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'mes' || name === 'ano') {
      atualizarFiltro({ [name]: value ? parseInt(value) : undefined });
    } else if (name === 'categoria' || name === 'status') {
      atualizarFiltro({ 
        [name]: value ? value as CategoriaConta | StatusConta : undefined 
      });
    }
  };
  
  const handleLimparFiltro = () => {
    const hoje = new Date();
    atualizarFiltro({
      mes: hoje.getMonth() + 1,
      ano: hoje.getFullYear(),
      categoria: undefined,
      status: undefined
    });
  };
  
  return (
    <FiltroContainer>
      <FiltroTitulo>Filtrar Contas</FiltroTitulo>
      
      <FiltroForm>
        <FiltroGrupo>
          <FiltroLabel htmlFor="mes">Mês</FiltroLabel>
          <FiltroSelect 
            id="mes"
            name="mes"
            value={filtro.mes || ''}
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
            value={filtro.ano || ''}
            onChange={handleChange}
          >
            {anos.map(ano => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </FiltroSelect>
        </FiltroGrupo>
        
        <FiltroGrupo>
          <FiltroLabel htmlFor="categoria">Categoria</FiltroLabel>
          <FiltroSelect 
            id="categoria"
            name="categoria"
            value={filtro.categoria || ''}
            onChange={handleChange}
          >
            {categorias.map(categoria => (
              <option key={categoria.value} value={categoria.value}>
                {categoria.label}
              </option>
            ))}
          </FiltroSelect>
        </FiltroGrupo>
        
        <FiltroGrupo>
          <FiltroLabel htmlFor="status">Status</FiltroLabel>
          <FiltroSelect 
            id="status"
            name="status"
            value={filtro.status || ''}
            onChange={handleChange}
          >
            {status.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </FiltroSelect>
        </FiltroGrupo>
      </FiltroForm>
      
      <FiltroAcoes>
        <button 
          type="button" 
          className="btn btn-outline"
          onClick={handleLimparFiltro}
        >
          Limpar Filtros
        </button>
      </FiltroAcoes>
    </FiltroContainer>
  );
} 