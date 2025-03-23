import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiAlertCircle, FiCalendar, FiCheckCircle, FiFileText, FiPlusCircle } from 'react-icons/fi';
import { useFinancas } from '../hooks/useFinancas';

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background-color: var(--surface);
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  
  svg {
    margin-right: 0.75rem;
    color: var(--primary);
  }
  
  h2 {
    font-size: 1.25rem;
    color: var(--text-primary);
    margin: 0;
  }
  
  @media (max-width: 576px) {
    h2 {
      font-size: 1.1rem;
    }
  }
`;

const CardValue = styled.div<{ color?: string }>`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.color || 'var(--primary)'};
  margin-bottom: 0.5rem;
`;

const CardLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.875rem;
`;

const ListCard = styled(Card)`
  grid-column: span 3;
  
  @media (max-width: 768px) {
    grid-column: span 1;
  }
`;

const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  @media (max-width: 576px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  h2 {
    font-size: 1.25rem;
    color: var(--text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    
    svg {
      margin-right: 0.75rem;
      color: var(--primary);
    }
  }
`;

const ContasList = styled.div`
  display: grid;
  gap: 1rem;
`;

const ContaItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background-color: var(--background);
  
  &:hover {
    background-color: rgba(37, 99, 235, 0.05);
  }
`;

const ContaInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const ContaNome = styled.div`
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
`;

const ContaData = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary);
`;

const ContaValor = styled.div`
  font-weight: 600;
  color: var(--primary);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  
  p {
    margin-bottom: 1rem;
  }
`;

export default function Dashboard() {
  const { contas, filtro } = useFinancas();
  
  const { 
    totalPago, 
    totalEmAberto, 
    totalVencido,
    contasVencendoHoje,
    contasAVencer
  } = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    const contasMesAtual = contas.filter(conta => {
      const dataVencimento = parseISO(conta.dataVencimento);
      return (
        dataVencimento.getMonth() + 1 === mesAtual &&
        dataVencimento.getFullYear() === anoAtual
      );
    });
    
    // Totais
    const totalPago = contasMesAtual
      .filter(conta => conta.status === 'paga')
      .reduce((acc, conta) => acc + conta.valor, 0);
    
    const totalEmAberto = contasMesAtual
      .filter(conta => conta.status === 'aberta')
      .reduce((acc, conta) => acc + conta.valor, 0);
    
    const totalVencido = contasMesAtual
      .filter(conta => conta.status === 'vencida')
      .reduce((acc, conta) => acc + conta.valor, 0);
    
    // Contas vencendo hoje
    const contasVencendoHoje = contas.filter(conta => {
      if (conta.status !== 'aberta') return false;
      
      const dataVencimento = parseISO(conta.dataVencimento);
      return (
        dataVencimento.getDate() === hoje.getDate() &&
        dataVencimento.getMonth() === hoje.getMonth() &&
        dataVencimento.getFullYear() === hoje.getFullYear()
      );
    });
    
    // Próximas contas a vencer (próximos 7 dias)
    const contasAVencer = contas.filter(conta => {
      if (conta.status !== 'aberta') return false;
      
      const dataVencimento = parseISO(conta.dataVencimento);
      const daquiA7Dias = addDays(hoje, 7);
      
      return (
        isAfter(dataVencimento, hoje) &&
        isBefore(dataVencimento, daquiA7Dias)
      );
    });
    
    return { 
      totalPago, 
      totalEmAberto, 
      totalVencido,
      contasVencendoHoje,
      contasAVencer
    };
  }, [contas]);
  
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(valor);
  };
  
  const formatarData = (data: string) => {
    return format(parseISO(data), "dd 'de' MMMM", { locale: ptBR });
  };
  
  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Dashboard</h1>
      
      <DashboardGrid>
        <Card>
          <CardHeader>
            <FiCheckCircle size={24} />
            <h2>Total Pago</h2>
          </CardHeader>
          <CardValue color="var(--secondary)">{formatarValor(totalPago)}</CardValue>
          <CardLabel>Mês atual</CardLabel>
        </Card>
        
        <Card>
          <CardHeader>
            <FiCalendar size={24} />
            <h2>Em Aberto</h2>
          </CardHeader>
          <CardValue color="var(--warning)">{formatarValor(totalEmAberto)}</CardValue>
          <CardLabel>Mês atual</CardLabel>
        </Card>
        
        <Card>
          <CardHeader>
            <FiAlertCircle size={24} />
            <h2>Vencido</h2>
          </CardHeader>
          <CardValue color="var(--error)">{formatarValor(totalVencido)}</CardValue>
          <CardLabel>Mês atual</CardLabel>
        </Card>
        
        <ListCard>
          <ListHeader>
            <h2>
              <FiAlertCircle size={20} />
              Contas Vencendo Hoje
            </h2>
            <Link to="/contas/cadastrar" className="btn btn-outline">
              <FiPlusCircle size={18} style={{ marginRight: '0.5rem' }} />
              Nova Conta
            </Link>
          </ListHeader>
          
          <ContasList>
            {contasVencendoHoje.length > 0 ? (
              contasVencendoHoje.map(conta => (
                <ContaItem key={conta.id}>
                  <ContaInfo>
                    <ContaNome>{conta.nome}</ContaNome>
                    <ContaData>Vence hoje</ContaData>
                  </ContaInfo>
                  <ContaValor>{formatarValor(conta.valor)}</ContaValor>
                </ContaItem>
              ))
            ) : (
              <EmptyState>
                <p>Nenhuma conta vencendo hoje!</p>
              </EmptyState>
            )}
          </ContasList>
        </ListCard>
        
        <ListCard>
          <ListHeader>
            <h2>
              <FiCalendar size={20} />
              Próximas Contas a Vencer
            </h2>
            <Link to="/contas/em-aberto" className="btn btn-outline">
              <FiFileText size={18} style={{ marginRight: '0.5rem' }} />
              Ver Todas
            </Link>
          </ListHeader>
          
          <ContasList>
            {contasAVencer.length > 0 ? (
              contasAVencer.map(conta => (
                <ContaItem key={conta.id}>
                  <ContaInfo>
                    <ContaNome>{conta.nome}</ContaNome>
                    <ContaData>Vence em {formatarData(conta.dataVencimento)}</ContaData>
                  </ContaInfo>
                  <ContaValor>{formatarValor(conta.valor)}</ContaValor>
                </ContaItem>
              ))
            ) : (
              <EmptyState>
                <p>Nenhuma conta a vencer nos próximos dias!</p>
                <Link to="/contas/cadastrar" className="btn btn-primary">
                  Cadastrar Nova Conta
                </Link>
              </EmptyState>
            )}
          </ContasList>
        </ListCard>
      </DashboardGrid>
    </div>
  );
} 