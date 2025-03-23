import { createClient } from '@supabase/supabase-js';

// No Vite, as variáveis de ambiente devem ser prefixadas com VITE_
// e acessadas através de import.meta.env
// Verificar se estamos em modo de desenvolvimento ou produção
const isDevelopment = process.env.NODE_ENV === 'development';

// Obter as variáveis de ambiente
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  // Log para debugging
  console.log('Variáveis de ambiente Supabase:');
  console.log('URL:', supabaseUrl ? 'Configurada' : 'NÃO CONFIGURADA');
  console.log('KEY:', supabaseAnonKey ? 'Configurada' : 'NÃO CONFIGURADA');
  console.log('Ambiente:', isDevelopment ? 'Desenvolvimento' : 'Produção');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL e/ou Chave Anônima não definidos!');
  }
} catch (error) {
  console.error('Erro ao acessar variáveis de ambiente:', error);
}

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Verificar conexão
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Estado de autenticação do Supabase:', event, session ? 'Sessão ativa' : 'Sem sessão');
});

// Tipos para uso com TypeScript
export type Tables = {
  contas: {
    Row: {
      id: string;
      usuario_id: string;
      nome: string;
      valor: number;
      data_vencimento: string;
      data_pagamento: string | null;
      status: 'aberta' | 'paga' | 'vencida';
      categoria: 'fixa' | 'variavel' | 'cartao' | 'imposto' | 'outro';
      observacoes: string | null;
      created_at: string;
    };
    Insert: Omit<Tables['contas']['Row'], 'id' | 'created_at'> & { id?: string };
    Update: Partial<Tables['contas']['Row']>;
  };
  
  usuarios: {
    Row: {
      id: string;
      nome: string;
      email: string;
      foto_perfil: string | null;
      created_at: string;
    };
    Insert: Omit<Tables['usuarios']['Row'], 'id' | 'created_at'> & { id?: string };
    Update: Partial<Tables['usuarios']['Row']>;
  };
};

// Exemplo de como usar tipos com as funções do Supabase:
// const { data } = await supabase.from<Tables['contas']>('contas').select('*'); 