export type StatusConta = 'aberta' | 'paga' | 'vencida';

export type CategoriaConta = 'fixa' | 'variavel' | 'cartao' | 'imposto' | 'outro';

export interface Conta {
  id: string;
  nome: string;
  dataVencimento: string; // formato ISO para facilitar o uso com date-fns
  valor: number;
  status: StatusConta;
  categoria: CategoriaConta;
  dataPagamento?: string;
  observacoes?: string;
}

export interface Filtro {
  mes?: number;
  ano?: number;
  categoria?: CategoriaConta;
  status?: StatusConta;
}

export interface Relatorio {
  totalPago: number;
  totalEmAberto: number;
  totalVencido: number;
  contasPorCategoria: Record<CategoriaConta, number>;
  periodo: {
    mes: number;
    ano: number;
  };
} 