import { createClient } from '@supabase/supabase-js';
import { debug, error as errorLog } from '../utils/logger';

// No Vite, as variáveis de ambiente devem ser prefixadas com VITE_
// e acessadas através de import.meta.env
// Verificar se estamos em modo de desenvolvimento ou produção
const isDevelopment = process.env.NODE_ENV === 'development';

// Valores de backup diretos para caso as variáveis de ambiente falhem
const BACKUP_URL = 'https://jtsbmolnhlrpyxccwpul.supabase.co';
const BACKUP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0c2Jtb2xuaGxycHl4Y2N3cHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwNTM2NzQsImV4cCI6MjAxNTYyOTY3NH0.NmThbvLbEmhJQmb0Jz98YQkpPNFbxDneMgQQ1l9ueoc';

// Obter URL e chave do Supabase de variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Variáveis de ambiente do Supabase não definidas');
  console.log('URL:', supabaseUrl ? 'Definida' : 'Não definida');
  console.log('Chave:', supabaseAnonKey ? 'Definida' : 'Não definida');
  
  // Usar valores de backup para desenvolvimento local (não recomendado para produção)
  console.warn('Usando valores de backup para desenvolvimento local');
}

// Configurações para ajustar a tolerância a falhas
const FETCH_TIMEOUT = 60000; // 60 segundos
const MAX_RETRIES = 3;
const RETRY_INTERVAL = 1500;

// Configuração de fetch com timeout personalizado
const fetchWithTimeout = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // Criar um controlador de aborto
  const controller = new AbortController();
  const { signal } = controller;
  
  // Definir o timeout
  const timeout = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT);
  
  // Mesclar opções e signal
  const fetchOptions = {
    ...init,
    signal,
  };
  
  // Executar o fetch com timeout
  return fetch(input, fetchOptions)
    .then(response => {
      clearTimeout(timeout);
      return response;
    })
    .catch(error => {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Tempo de conexão esgotado ao comunicar com Supabase');
      }
      throw error;
    });
};

// Criar um cliente Supabase customizado com retry e timeout
export const supabase = createClient(
  supabaseUrl || 'https://pqkcsrvgvfmlkjwgaxpc.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxa2NzcnZndmZtbGtqd2dheHBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5Mjk0ODUsImV4cCI6MjAxNTUwNTQ4NX0.qEBp4IJTbjtmE70H5iIhQC-cfCUFSQcnxdqiIuDGiOk',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  }
);

// Função para testar a conexão com o Supabase
export const testarConexaoSupabase = async (): Promise<boolean> => {
  debug('Testando conexão com Supabase...');
  
  try {
    // Adicionar timeout de 15 segundos
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao testar conexão com Supabase')), 15000);
    });
    
    // Teste básico de conexão (get health)
    const testPromise = new Promise<boolean>(async (resolve) => {
      try {
        // Testar conexão com health check
        const { error } = await supabase.from('health').select('*').limit(1);
        
        if (error) {
          debug(`Erro no teste de conexão: ${error.message}`);
          console.error('Erro no teste de conexão:', error);
          resolve(false);
          return;
        }
        
        debug('Conexão com Supabase estabelecida com sucesso');
        console.log('Conexão com Supabase estabelecida com sucesso');
        resolve(true);
      } catch (err) {
        errorLog('Erro ao testar conexão com Supabase', err);
        console.error('Erro ao testar conexão com Supabase:', err);
        resolve(false);
      }
    });
    
    // Corrida entre o teste e o timeout
    return await Promise.race([testPromise, timeoutPromise]);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Timeout')) {
      errorLog('Timeout ao testar conexão com Supabase');
      console.error('Timeout ao testar conexão com Supabase');
    } else {
      errorLog('Erro ao testar conexão com Supabase', err);
      console.error('Erro ao testar conexão com Supabase:', err);
    }
    return false;
  }
};

// Verificar se o Supabase está correto
testarConexaoSupabase()
  .then(conectado => {
    if (conectado) {
      debug('✅ Supabase inicializado e testado com sucesso');
    } else {
      errorLog('❌ Não foi possível conectar ao Supabase. Verificando possíveis problemas...');
      
      // Verificar se as variáveis de ambiente estão definidas
      if (!supabaseUrl || !supabaseAnonKey) {
        errorLog('⚠️ Problema: Variáveis de ambiente não configuradas');
      }
      
      // Outros diagnósticos podem ser adicionados aqui
    }
  })
  .catch(err => {
    errorLog('Erro ao inicializar Supabase', err);
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