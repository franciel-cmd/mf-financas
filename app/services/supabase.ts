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

// Flag global para indicar se estamos usando modo offline
let isOfflineMode = false;

// Obter URL e chave do Supabase de variáveis de ambiente - PRODUÇÃO
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || BACKUP_URL;
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || BACKUP_KEY;

// Log de inicialização
console.log('Inicializando cliente Supabase...');
console.log('URL:', supabaseUrl ? 'Definida' : 'Não definida');
console.log('Chave:', supabaseAnonKey ? 'Definida' : 'Não definida');

// Lista de servidores de desenvolvimento que devem ser ignorados nos erros de conexão
const DEV_SERVERS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3006',
  'http://127.0.0.1:3000'
];

// Verifica se a URL é um servidor de desenvolvimento local
function isDevServer(url: string): boolean {
  return DEV_SERVERS.some(server => url.startsWith(server));
}

// Verificar se há CORS habilitado (com tratamento de erro melhorado)
try {
  console.log('Verificando CORS e conexão...');
  fetch(`${supabaseUrl}/rest/v1/health?select=*`, {
    method: 'OPTIONS',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    // Adicionar um timeout curto para não bloquear a inicialização
    signal: AbortSignal.timeout(5000)
  }).then(response => {
    const corsHeaders = response.headers.get('access-control-allow-origin');
    console.log('CORS Headers:', corsHeaders ? 'Configurados' : 'Não detectados');
  }).catch(err => {
    console.warn('Aviso na verificação de CORS:', err.message);
    // Não tratamos como erro crítico
  });
} catch (error) {
  console.warn('Falha ao testar CORS:', error);
  // Não tratamos como erro crítico
}

// Configurações para ajustar a tolerância a falhas
const FETCH_TIMEOUT = 60000; // 60 segundos
const MAX_RETRIES = 3; // 3 tentativas
const RETRY_INTERVAL = 2000; // 2 segundos
const RECONNECT_INTERVAL = 5000; // 5 segundos entre tentativas de reconexão

// Estado de conexão
let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5; // 5 tentativas

// Detecção de ambiente de produção vs. desenvolvimento
const isProduction = import.meta.env.MODE === 'production';
const baseURL = new URL(supabaseUrl);
const actualHost = baseURL.hostname;

// Debug de conexão
console.log(`Modo: ${isProduction ? 'Produção' : 'Desenvolvimento'}`);
console.log(`Host Supabase: ${actualHost}`);

// Configuração de fetch com timeout personalizado e retry automático
const fetchWithRetry = async (input: RequestInfo | URL, init?: RequestInit, retryCount = 0): Promise<Response> => {
  try {
    // Verificar se estamos em modo offline primeiro
    if (isOfflineMode) {
      throw new Error('Aplicação em modo offline devido a problemas de conexão');
    }
    
    // Ignorar erros para servidores de desenvolvimento
    const url = typeof input === 'string' ? input : input.toString();
    if (isDevServer(url)) {
      console.log(`Ignorando erro para servidor de desenvolvimento: ${url}`);
      // Para servidores de desenvolvimento, não tratamos falhas como críticas
      try {
        return await fetch(input, init);
      } catch (error) {
        console.warn(`Erro ao comunicar com servidor de desenvolvimento ${url} - isso é esperado em certas situações e não afeta o funcionamento do Supabase`);
        throw error;
      }
    }
    
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
      // Ignorar erros para servidores de desenvolvimento
      const url = typeof input === 'string' ? input : input.toString();
      if (isDevServer(url)) {
        console.warn(`Erro ignorado para servidor de desenvolvimento: ${url}`);
        throw error;
      }
      
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
          // Se falhar várias vezes, ativar modo offline
          isOfflineMode = true;
          throw new Error('Tempo de conexão esgotado ao comunicar com o servidor. O aplicativo funcionará em modo offline com recursos limitados.');
        }
      } else if (error.name === 'TypeError' && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('Network request failed') ||
        error.message.includes('Network Error') ||
        error.message.includes('ERR_NAME_NOT_RESOLVED')
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
          // Se falhar várias vezes, ativar modo offline e iniciar reconexão automática
          isOfflineMode = true;
          scheduleReconnect();
          throw new Error('Falha na conexão com o servidor. O aplicativo funcionará em modo offline com recursos limitados.');
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

// Função para testar conexão com Supabase
export const testarConexaoSupabase = async (): Promise<boolean> => {
  // Se já sabemos que estamos offline, nem tentamos
  if (isOfflineMode && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('Modo offline ativo. Usando dados locais.');
    return false;
  }

  try {
    console.log('Testando conexão com Supabase...');
    
    // Usar AbortController com timeout curto para não bloquear a UI
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Primeiro verificamos se o erro é com o servidor de desenvolvimento
      // ou com o Supabase real
      if (isReconnecting) {
        console.log('Verificando se o erro é apenas com servidor de desenvolvimento...');
        try {
          for (const devServer of DEV_SERVERS) {
            try {
              // Tentativa rápida para verificar se o servidor de dev está respondendo
              await fetch(`${devServer}/ping`, { 
                method: 'HEAD',
                signal: AbortSignal.timeout(1000)
              });
              console.log(`Servidor de desenvolvimento ${devServer} está respondendo`);
            } catch (err) {
              console.log(`Servidor de desenvolvimento ${devServer} não está respondendo - isso é esperado e não afeta o Supabase`);
            }
          }
        } catch (err) {
          console.warn('Erro ao verificar servidores de desenvolvimento', err);
        }
      }

      // Agora verificamos o Supabase real
      const response = await fetch(`${supabaseUrl}/rest/v1/health?select=*`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('✅ Conexão com Supabase bem-sucedida!');
      
      // Conectou com sucesso, desativar modo offline
      if (isOfflineMode) {
        isOfflineMode = false;
        console.log('Modo offline desativado. Dados online disponíveis novamente.');
      }
      
      return true;
    } catch (err) {
      // Limpar o timeout se houver erro
      clearTimeout(timeout);
      
      // Repassar o erro para ser tratado
      throw err;
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Timeout ao testar conexão com Supabase');
        errorLog('Timeout na verificação de conexão com Supabase');
      } else {
        console.error('Erro ao testar conexão com Supabase:', error.message);
        errorLog('Falha na verificação de conexão com Supabase', error);
      }
    }
    return false;
  }
};

// Agendar reconexão
const scheduleReconnect = () => {
  if (isReconnecting) return;
  
  isReconnecting = true;
  reconnectAttempts = 0;
  
  const attemptReconnect = async () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Falha ao reconectar após várias tentativas. Verifique o status do serviço Supabase.');
      errorLog('Falha na reconexão após máximo de tentativas');
      
      // Manter o modo offline ativo
      isOfflineMode = true;
      console.log('Aplicativo permanecerá em modo offline. Recarregue a página para tentar novamente.');
      
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
        
        // Desativar modo offline
        isOfflineMode = false;
        console.log('Modo offline desativado. Dados online disponíveis novamente.');
        
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
  
  // Iniciar tentativa de reconexão
  attemptReconnect();
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