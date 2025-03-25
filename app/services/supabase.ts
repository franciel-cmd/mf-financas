import { createClient } from '@supabase/supabase-js';
import { debug, error as errorLog } from '../utils/logger';
import { toast } from 'react-toastify';

// No Vite, as variáveis de ambiente devem ser prefixadas com VITE_
// e acessadas através de import.meta.env
// Verificar se estamos em modo de desenvolvimento ou produção
const isDevelopment = process.env.NODE_ENV === 'development';

// Valores de backup diretos para caso as variáveis de ambiente falhem
const BACKUP_URL = 'https://jtsbmolnhlrpyxccwpul.supabase.co';
const BACKUP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0c2Jtb2xuaGxycHl4Y2N3cHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwNTM2NzQsImV4cCI6MjAxNTYyOTY3NH0.NmThbvLbEmhJQmb0Jz98YQkpPNFbxDneMgQQ1l9ueoc';

// Obter URL e chave do Supabase de variáveis de ambiente - PRODUÇÃO
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Sistema de fallback para casos onde as variáveis não foram definidas corretamente
if (!supabaseUrl || !supabaseAnonKey) {
  errorLog('⚠️ Variáveis de ambiente do Supabase não definidas corretamente');
  console.error('⚠️ Variáveis de ambiente do Supabase não definidas corretamente');
  console.log('URL:', supabaseUrl ? 'Definida' : 'Não definida');
  console.log('Chave:', supabaseAnonKey ? 'Definida' : 'Não definida');
  
  // Usar valores de backup para evitar quebra total da aplicação
  console.warn('Usando valores de backup para conexão com Supabase');
  
  // Atualizar com os valores de backup
  supabaseUrl = BACKUP_URL;
  supabaseAnonKey = BACKUP_KEY;
}

// Configurações para ajustar a tolerância a falhas
const FETCH_TIMEOUT = 30000; // 30 segundos
const MAX_RETRIES = 2;
const RETRY_INTERVAL = 1000;
const RECONNECT_INTERVAL = 3000; // 3 segundos entre tentativas de reconexão

// Estado de conexão
let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// Detecção de ambiente de produção vs. desenvolvimento
const isProduction = import.meta.env.MODE === 'production';
const baseURL = new URL(supabaseUrl);
const actualHost = baseURL.hostname;

// Debug de conexão
console.log(`Modo: ${isProduction ? 'Produção' : 'Desenvolvimento'}`);
console.log(`Host Supabase: ${actualHost}`);

// Verificar se há CORS habilitado
try {
  fetch(`${supabaseUrl}/rest/v1/health?select=*`, {
    method: 'OPTIONS',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    }
  }).then(response => {
    const corsHeaders = response.headers.get('access-control-allow-origin');
    console.log('CORS Headers:', corsHeaders ? 'Configurados' : 'Não detectados');
  }).catch(err => {
    console.error('Erro na verificação de CORS:', err.message);
  });
} catch (error) {
  console.error('Falha ao testar CORS:', error);
}

// Configuração de fetch com timeout personalizado e retry automático
const fetchWithRetry = async (input: RequestInfo | URL, init?: RequestInit, retryCount = 0): Promise<Response> => {
  try {
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
    
    // Log de depuração para ambientes de desenvolvimento
    if (isDevelopment) {
      const url = typeof input === 'string' ? input : input.toString();
      debug(`Requisição para: ${url.split('?')[0]}`);
    }
    
    // Executar o fetch com timeout
    const response = await fetch(input, fetchOptions)
      .then(response => {
        clearTimeout(timeout);
        return response;
      })
      .catch(error => {
        clearTimeout(timeout);
        throw error;
      });
    
    // Verificar se a resposta foi bem-sucedida
    if (!response.ok && (response.status >= 500 || response.status === 429) && retryCount < MAX_RETRIES) {
      // Se for erro de servidor ou rate limit, tentar novamente
      const nextRetryDelay = RETRY_INTERVAL * Math.pow(1.5, retryCount);
      console.warn(`Erro ${response.status} ao conectar com Supabase. Tentando novamente em ${nextRetryDelay}ms (tentativa ${retryCount + 1}/${MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, nextRetryDelay));
      return fetchWithRetry(input, init, retryCount + 1);
    }
    
    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`Timeout na requisição após ${FETCH_TIMEOUT}ms`);
        errorLog('Timeout na requisição ao Supabase', {
          timeout: FETCH_TIMEOUT,
          retryCount
        });
        
        if (retryCount < MAX_RETRIES) {
          // Se for timeout, tentar novamente
          const nextRetryDelay = RETRY_INTERVAL * Math.pow(1.5, retryCount);
          console.warn(`Timeout ao conectar com Supabase. Tentando novamente em ${nextRetryDelay}ms (tentativa ${retryCount + 1}/${MAX_RETRIES})`);
          
          await new Promise(resolve => setTimeout(resolve, nextRetryDelay));
          return fetchWithRetry(input, init, retryCount + 1);
        } else {
          throw new Error('Tempo de conexão esgotado ao comunicar com o servidor. Por favor, verifique sua conexão com a internet ou tente novamente mais tarde.');
        }
      } else if (error.name === 'TypeError' && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('Network request failed') ||
        error.message.includes('Network Error')
      )) {
        console.error('Erro de rede detectado:', error.message);
        errorLog('Erro de rede na requisição', {
          message: error.message,
          retryCount
        });
        
        if (retryCount < MAX_RETRIES) {
          // Se for erro de rede, tentar novamente
          const nextRetryDelay = RETRY_INTERVAL * Math.pow(1.5, retryCount);
          console.warn(`Erro de rede ao conectar com Supabase. Tentando novamente em ${nextRetryDelay}ms (tentativa ${retryCount + 1}/${MAX_RETRIES})`);
          
          await new Promise(resolve => setTimeout(resolve, nextRetryDelay));
          return fetchWithRetry(input, init, retryCount + 1);
        } else {
          // Iniciar reconexão automática após máximo de retries
          scheduleReconnect();
          throw new Error('Falha na conexão com o servidor. Verifique sua conexão com a internet ou tente novamente mais tarde.');
        }
      }
    }
    
    throw error;
  }
};

// Função para criar o cliente Supabase
const createSupabaseClient = () => {
  console.log('Criando cliente Supabase com URL:', supabaseUrl);
  
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        fetch: fetchWithRetry as any,
        headers: {
          'X-Client-Info': 'mf-financas/1.1.0',
        }
      },
      realtime: {
        params: {
          eventsPerSecond: 1
        }
      }
    }
  );
};

// Criar cliente Supabase inicial
export let supabase = createSupabaseClient();

// Log de inicialização
console.log('Cliente Supabase inicializado');

// Agendar reconexão
const scheduleReconnect = () => {
  if (isReconnecting) return;
  
  isReconnecting = true;
  reconnectAttempts = 0;
  
  const attemptReconnect = async () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Falha ao reconectar após várias tentativas. Verifique o status do serviço Supabase.');
      errorLog('Falha na reconexão após máximo de tentativas');
      
      // Notificar o usuário sobre o problema persistente
      toast.error('Problemas de conexão com o servidor persistem. Tente novamente mais tarde ou verifique sua conexão com a internet.');
      
      isReconnecting = false;
      return;
    }
    
    reconnectAttempts++;
    
    try {
      console.log(`Tentando reconectar ao Supabase (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      
      // Testar conexão com Supabase
      const isConnected = await testarConexaoSupabase();
      
      if (isConnected) {
        // Reconexão bem-sucedida, recriar cliente
        supabase = createSupabaseClient();
        console.log('✅ Reconexão com Supabase bem-sucedida!');
        debug('Reconexão com Supabase estabelecida após tentativas');
        
        // Notificar o usuário sobre a reconexão
        toast.success('Conexão com o servidor restabelecida com sucesso');
        
        isReconnecting = false;
      } else {
        // Agendar próxima tentativa
        const nextInterval = RECONNECT_INTERVAL * Math.min(Math.pow(1.5, reconnectAttempts - 1), 6);
        console.warn(`Falha na reconexão. Tentando novamente em ${nextInterval / 1000} segundos...`);
        
        setTimeout(attemptReconnect, nextInterval);
      }
    } catch (err) {
      console.error('Erro durante tentativa de reconexão:', err);
      errorLog('Erro durante tentativa de reconexão', err);
      
      // Agendar próxima tentativa
      const nextInterval = RECONNECT_INTERVAL * Math.min(Math.pow(1.5, reconnectAttempts - 1), 6);
      setTimeout(attemptReconnect, nextInterval);
    }
  };
  
  // Iniciar primeira tentativa de reconexão após um pequeno intervalo
  setTimeout(attemptReconnect, RECONNECT_INTERVAL);
};

// Função para testar a conexão com o Supabase
export const testarConexaoSupabase = async (): Promise<boolean> => {
  debug('Testando conexão com Supabase...');
  
  try {
    // Adicionar timeout de 10 segundos para o teste
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Teste básico de conexão usando sistema de health check
    const response = await fetch(`${supabaseUrl}/rest/v1/health?select=*`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    }).catch(error => {
      clearTimeout(timeoutId);
      console.error('Erro na requisição de health check:', error.message);
      throw error;
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 404) {
      // Se a tabela health não existir, tente uma alternativa
      debug('Tabela health não encontrada, verificando sessão auth');
      
      try {
        const authResponse = await supabase.auth.getSession();
        debug('Teste de sessão auth concluído');
        
        // Se chegou aqui, significa que conseguiu se comunicar com o Supabase
        console.log('Conexão com Supabase estabelecida via auth.getSession()');
        return true;
      } catch (authError) {
        console.error('Falha no teste via auth.getSession():', authError);
        return false;
      }
    }
    
    if (response.ok) {
      debug('Conexão com Supabase estabelecida com sucesso via health check');
      console.log('Conexão com Supabase estabelecida com sucesso via health check');
      return true;
    } else {
      debug(`Erro no teste de conexão: ${response.status} ${response.statusText}`);
      console.error('Erro no teste de conexão:', response.status, response.statusText);
      return false;
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        errorLog('Timeout ao testar conexão com Supabase');
        console.error('Timeout ao testar conexão com Supabase');
      } else {
        errorLog('Erro ao testar conexão com Supabase', err);
        console.error('Erro ao testar conexão com Supabase:', err.message);
      }
    } else {
      errorLog('Erro desconhecido ao testar conexão com Supabase', err);
      console.error('Erro desconhecido ao testar conexão com Supabase');
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
      
      // Iniciar reconexão automática
      scheduleReconnect();
    }
  })
  .catch(err => {
    errorLog('Erro ao inicializar Supabase', err);
    
    // Iniciar reconexão automática em caso de erro
    scheduleReconnect();
  });

// Monitorar o estado da conexão
window.addEventListener('online', async () => {
  debug('Conexão de rede restaurada. Verificando conexão com Supabase...');
  
  const conectado = await testarConexaoSupabase();
  if (!conectado && !isReconnecting) {
    debug('Tentando reconectar após retorno da rede...');
    scheduleReconnect();
  }
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