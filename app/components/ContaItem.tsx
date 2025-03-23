import React from 'react';
import { format, formatDistance, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiEdit2, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import styled from 'styled-components';
import { Conta } from '../types';
import { useFinancas } from '../hooks/useFinancas';
import { useNavigate } from 'react-router-dom';

interface ContaItemProps {
  conta: Conta;
}

const ContaCard = styled.div`
  background-color: var(--surface);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ContaHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  
  @media (max-width: 576px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const ContaNome = styled.h3`
  font-size: 1.25rem;
  color: var(--text-primary);
  margin: 0;
`;

const ContaValor = styled.div`
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--primary);
`;

const ContaInfo = styled.div`
  display: flex;
  gap: 1.5rem;
  
  @media (max-width: 576px) {
    flex-wrap: wrap;
    gap: 1rem;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  
  @media (max-width: 576px) {
    min-width: calc(50% - 0.5rem);
  }
  
  span:first-child {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
  
  span:last-child {
    font-weight: 500;
  }
`;

const StatusTag = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  
  background-color: ${props => {
    switch(props.status) {
      case 'paga':
        return 'rgba(22, 163, 74, 0.2)';
      case 'vencida':
        return 'rgba(239, 68, 68, 0.2)';
      default:
        return 'rgba(245, 158, 11, 0.2)';
    }
  }};
  
  color: ${props => {
    switch(props.status) {
      case 'paga':
        return 'var(--secondary)';
      case 'vencida':
        return 'var(--error)';
      default:
        return 'var(--warning)';
    }
  }};
`;

const ContaAcoes = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  
  @media (max-width: 576px) {
    justify-content: space-between;
    width: 100%;
  }
`;

const BotaoAcao = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  color: var(--text-secondary);
  
  &:hover {
    background-color: var(--border);
    color: var(--primary);
  }

  &.delete:hover {
    color: var(--error);
  }

  &.pagar:hover {
    color: var(--secondary);
  }
`;

export function ContaItem({ conta }: ContaItemProps) {
  const { marcarComoPaga, removerConta } = useFinancas();
  const navigate = useNavigate();
  
  const formataData = (data: string) => {
    return format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR });
  };
  
  const formataDiasAtraso = (dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = parseISO(dataVencimento);
    const dias = differenceInDays(hoje, vencimento);
    
    if (dias <= 0) return null;
    
    return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  };
  
  const statusFormatado = (status: string) => {
    switch(status) {
      case 'paga':
        return 'Paga';
      case 'vencida':
        return 'Vencida';
      default:
        return 'Em aberto';
    }
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
  
  const diasAtraso = conta.status === 'vencida' ? formataDiasAtraso(conta.dataVencimento) : null;
  
  return (
    <ContaCard>
      <ContaHeader>
        <ContaNome>{conta.nome}</ContaNome>
        <ContaValor>
          {new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(conta.valor)}
        </ContaValor>
      </ContaHeader>
      
      <ContaInfo>
        <InfoItem>
          <span>Vencimento</span>
          <span>{formataData(conta.dataVencimento)}</span>
        </InfoItem>
        
        <InfoItem>
          <span>Categoria</span>
          <span>{categoriaFormatada(conta.categoria)}</span>
        </InfoItem>
        
        <InfoItem>
          <span>Status</span>
          <StatusTag status={conta.status}>{statusFormatado(conta.status)}</StatusTag>
        </InfoItem>
        
        {conta.dataPagamento && (
          <InfoItem>
            <span>Pago em</span>
            <span>{formataData(conta.dataPagamento)}</span>
          </InfoItem>
        )}
        
        {diasAtraso && (
          <InfoItem>
            <span>Atraso</span>
            <span style={{ color: 'var(--error)' }}>{diasAtraso}</span>
          </InfoItem>
        )}
      </ContaInfo>
      
      {conta.observacoes && (
        <InfoItem>
          <span>Observações</span>
          <span>{conta.observacoes}</span>
        </InfoItem>
      )}
      
      <ContaAcoes>
        {conta.status !== 'paga' && (
          <BotaoAcao 
            className="pagar"
            title="Marcar como paga"
            onClick={() => marcarComoPaga(conta.id)}
          >
            <FiCheckCircle size={18} />
          </BotaoAcao>
        )}
        
        <BotaoAcao 
          title="Editar conta"
          onClick={() => navigate(`/contas/editar/${conta.id}`)}
        >
          <FiEdit2 size={18} />
        </BotaoAcao>
        
        <BotaoAcao 
          className="delete"
          title="Remover conta"
          onClick={() => {
            if (window.confirm('Tem certeza que deseja remover esta conta?')) {
              removerConta(conta.id);
            }
          }}
        >
          <FiTrash2 size={18} />
        </BotaoAcao>
      </ContaAcoes>
    </ContaCard>
  );
} 