import { createClient } from '@supabase/supabase-js';

// No Vite, as variáveis de ambiente devem ser prefixadas com VITE_
// e acessadas através de import.meta.env
// Verificar se estamos em modo de desenvolvimento ou produção
const isDevelopment = process.env.NODE_ENV === 'development';

// Valores de backup diretos para caso as variáveis de ambiente falhem
const BACKUP_URL = 'https://jtsbmolnhlrpyxccwpul.supabase.co';
const BACKUP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0c2Jtb2xuaGxycHl4Y2N3cHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwNTM2NzQsImV4cCI6MjAxNTYyOTY3NH0.NmThbvLbEmhJQmb0Jz98YQkpPNFbxDneMgQQ1l9ueoc';

// Obter as variáveis de ambiente
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  // Tentar obter das variáveis de ambiente primeiro
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  // Log para debugging
  console.log('Variáveis de ambiente Supabase:');
  console.log('URL:', supabaseUrl ? 'Configurada' : 'NÃO CONFIGURADA');
  console.log('KEY:', supabaseAnonKey ? 'Configurada' : 'NÃO CONFIGURADA');
  console.log('Ambiente:', isDevelopment ? 'Desenvolvimento' : 'Produção');

  // Se não obteve das variáveis de ambiente, usar os valores de backup
  if (!supabaseUrl) {
    console.warn('Usando URL de backup para Supabase!');
    supabaseUrl = BACKUP_URL;
  }
  
  if (!supabaseAnonKey) {
    console.warn('Usando KEY de backup para Supabase!');
    supabaseAnonKey = BACKUP_KEY;
  }
} catch (error) {
  console.error('Erro ao acessar variáveis de ambiente:', error);
  // Usar valores de backup em caso de erro
  supabaseUrl = BACKUP_URL;
  supabaseAnonKey = BACKUP_KEY;
  console.warn('Usando valores de backup para Supabase após erro!');
}

console.log('Conectando ao Supabase com: ', {
  url: supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'vazio',
  keyDefinida: supabaseAnonKey ? 'Sim' : 'Não'
});

// Criar cliente Supabase com configurações avançadas para melhorar a persistência
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'mf-financas-auth-token',
  },
  global: {
    headers: {
      'X-Client-Info': 'MF-Financas/1.0'
    },
  },
  realtime: {
    timeout: 30000
  }
});

// Verificar conexão
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Estado de autenticação do Supabase:', event, session ? 'Sessão ativa' : 'Sem sessão');
});

// Função de teste para verificar conexão ao Supabase
export const testarConexaoSupabase = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('usuarios').select('count()', { count: 'exact' }).limit(1);
    if (error) {
      console.error('Erro ao testar conexão com Supabase:', error);
      return false;
    }
    console.log('Conexão com Supabase bem-sucedida!');
    return true;
  } catch (err) {
    console.error('Exceção ao testar conexão com Supabase:', err);
    return false;
  }
};

// Tentar verificar a conexão ao inicializar
testarConexaoSupabase();

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