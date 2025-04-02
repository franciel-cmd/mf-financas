/**
 * Utilitário para armazenamento e gerenciamento de dados offline
 */

import { debug, error as errorLog } from './logger';

// Prefixo para as chaves no localStorage para evitar conflitos
const STORAGE_PREFIX = 'mffinancas_offline_';

// Tipos de dados que podem ser armazenados
type StorageItem = {
  value: any;
  timestamp: number;
  expiresAt?: number;
};

/**
 * Armazena dados no localStorage para uso offline
 */
export const saveOfflineData = <T>(key: string, data: T, ttlInMinutes?: number): boolean => {
  try {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    const now = Date.now();
    
    const storageItem: StorageItem = {
      value: data,
      timestamp: now,
      expiresAt: ttlInMinutes ? now + ttlInMinutes * 60 * 1000 : undefined
    };
    
    const serialized = JSON.stringify(storageItem);
    
    try {
      localStorage.setItem(prefixedKey, serialized);
      debug(`Dados salvos para uso offline: ${key}`);
      return true;
    } catch (e) {
      // Se o localStorage estiver cheio, tentar liberar espaço
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        cleanExpiredOfflineData();
        // Tentar novamente após a limpeza
        try {
          localStorage.setItem(prefixedKey, serialized);
          debug(`Dados salvos para uso offline após limpeza: ${key}`);
          return true;
        } catch (retryError) {
          errorLog('Falha ao salvar dados offline mesmo após limpeza', retryError);
          return false;
        }
      }
      errorLog('Erro ao salvar dados offline', e);
      return false;
    }
  } catch (error) {
    errorLog('Erro ao processar dados para armazenamento offline', error);
    return false;
  }
};

/**
 * Recupera dados do localStorage
 */
export const getOfflineData = <T>(key: string): T | null => {
  try {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    const serialized = localStorage.getItem(prefixedKey);
    
    if (!serialized) {
      return null;
    }
    
    const storageItem: StorageItem = JSON.parse(serialized);
    
    // Verificar se os dados expiraram
    if (storageItem.expiresAt && storageItem.expiresAt < Date.now()) {
      localStorage.removeItem(prefixedKey);
      debug(`Dados offline expirados removidos: ${key}`);
      return null;
    }
    
    return storageItem.value as T;
  } catch (error) {
    errorLog('Erro ao recuperar dados offline', error);
    return null;
  }
};

/**
 * Remove dados específicos do localStorage
 */
export const removeOfflineData = (key: string): boolean => {
  try {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    localStorage.removeItem(prefixedKey);
    debug(`Dados offline removidos: ${key}`);
    return true;
  } catch (error) {
    errorLog('Erro ao remover dados offline', error);
    return false;
  }
};

/**
 * Limpa todos os dados offline
 */
export const clearAllOfflineData = (): boolean => {
  try {
    // Remover apenas as chaves com nosso prefixo
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
    
    debug('Todos os dados offline foram limpos');
    return true;
  } catch (error) {
    errorLog('Erro ao limpar todos os dados offline', error);
    return false;
  }
};

/**
 * Remove dados expirados para liberar espaço
 */
export const cleanExpiredOfflineData = (): number => {
  try {
    const now = Date.now();
    let removedCount = 0;
    
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .forEach(key => {
        try {
          const serialized = localStorage.getItem(key);
          if (serialized) {
            const storageItem: StorageItem = JSON.parse(serialized);
            
            // Remover itens expirados
            if (storageItem.expiresAt && storageItem.expiresAt < now) {
              localStorage.removeItem(key);
              removedCount++;
            }
          }
        } catch (e) {
          // Continuar mesmo se um item falhar
          console.warn(`Falha ao processar item offline ${key}:`, e);
        }
      });
    
    debug(`Limpeza de dados offline: ${removedCount} itens removidos`);
    return removedCount;
  } catch (error) {
    errorLog('Erro ao limpar dados offline expirados', error);
    return 0;
  }
};

/**
 * Verifica se há dados offline disponíveis para uma chave específica
 */
export const hasOfflineData = (key: string): boolean => {
  try {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    return localStorage.getItem(prefixedKey) !== null;
  } catch (error) {
    errorLog('Erro ao verificar dados offline', error);
    return false;
  }
};

/**
 * Obtém a idade dos dados em minutos
 */
export const getOfflineDataAge = (key: string): number | null => {
  try {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    const serialized = localStorage.getItem(prefixedKey);
    
    if (!serialized) {
      return null;
    }
    
    const storageItem: StorageItem = JSON.parse(serialized);
    const ageInMs = Date.now() - storageItem.timestamp;
    
    return Math.floor(ageInMs / (60 * 1000)); // Converter para minutos
  } catch (error) {
    errorLog('Erro ao obter idade dos dados offline', error);
    return null;
  }
};

// Chaves de armazenamento para diferentes tipos de dados
const STORAGE_KEYS = {
  AUTH: '@MFFinancas:auth',
  FILTRO: '@MFFinancas:filtro',
  CONTAS: '@MFFinancas:contas',
  USUARIO: '@MFFinancas:usuario'
};

/**
 * Salva dados no localStorage com tratamento de erros
 */
export const salvarDados = <T>(chave: string, dados: T): boolean => {
  try {
    localStorage.setItem(chave, JSON.stringify(dados));
    debug(`Dados salvos com sucesso: ${chave}`);
    return true;
  } catch (err) {
    errorLog(`Erro ao salvar dados no armazenamento local: ${chave}`, err);
    
    // Verificar se erro é devido a localStorage cheio
    if (err instanceof DOMException && 
       (err.name === 'QuotaExceededError' || 
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      errorLog('Armazenamento local está cheio. Tentando liberar espaço...');
      
      // Remover dados menos importantes para liberar espaço
      try {
        localStorage.removeItem('MFFinancas:logs');
        localStorage.removeItem('MFFinancas:cache');
        
        // Tentar novamente
        localStorage.setItem(chave, JSON.stringify(dados));
        debug(`Dados salvos com sucesso após liberar espaço: ${chave}`);
        return true;
      } catch (retryErr) {
        errorLog('Falha ao salvar mesmo após tentar liberar espaço', retryErr);
      }
    }
    
    return false;
  }
};

/**
 * Recupera dados do localStorage com tratamento de erros
 */
export const recuperarDados = <T>(chave: string, valorPadrao?: T): T | null => {
  try {
    const dados = localStorage.getItem(chave);
    if (!dados) {
      debug(`Nenhum dado encontrado para a chave: ${chave}`);
      return valorPadrao || null;
    }
    
    return JSON.parse(dados) as T;
  } catch (err) {
    errorLog(`Erro ao recuperar dados do armazenamento local: ${chave}`, err);
    
    // Em caso de erro de parsing, remover o item corrompido
    try {
      localStorage.removeItem(chave);
    } catch (removeErr) {
      // Ignorar erro ao remover
    }
    
    return valorPadrao || null;
  }
};

/**
 * Remove dados do localStorage com tratamento de erros
 */
export const removerDados = (chave: string): boolean => {
  try {
    localStorage.removeItem(chave);
    debug(`Dados removidos com sucesso: ${chave}`);
    return true;
  } catch (err) {
    errorLog(`Erro ao remover dados do armazenamento local: ${chave}`, err);
    return false;
  }
};

/**
 * Verifica se há dados salvos para determinada chave
 */
export const existemDados = (chave: string): boolean => {
  try {
    return localStorage.getItem(chave) !== null;
  } catch (err) {
    errorLog(`Erro ao verificar existência de dados: ${chave}`, err);
    return false;
  }
};

/**
 * Armazenamento offline específico para cada tipo de dado
 */
export const offlineStorage = {
  auth: {
    salvar: <T>(dados: T) => salvarDados(STORAGE_KEYS.AUTH, dados),
    recuperar: <T>(valorPadrao?: T) => recuperarDados<T>(STORAGE_KEYS.AUTH, valorPadrao),
    remover: () => removerDados(STORAGE_KEYS.AUTH),
    existe: () => existemDados(STORAGE_KEYS.AUTH)
  },
  filtro: {
    salvar: <T>(dados: T) => salvarDados(STORAGE_KEYS.FILTRO, dados),
    recuperar: <T>(valorPadrao?: T) => recuperarDados<T>(STORAGE_KEYS.FILTRO, valorPadrao),
    remover: () => removerDados(STORAGE_KEYS.FILTRO),
    existe: () => existemDados(STORAGE_KEYS.FILTRO)
  },
  contas: {
    salvar: <T>(dados: T) => salvarDados(STORAGE_KEYS.CONTAS, dados),
    recuperar: <T>(valorPadrao?: T) => recuperarDados<T>(STORAGE_KEYS.CONTAS, valorPadrao),
    remover: () => removerDados(STORAGE_KEYS.CONTAS),
    existe: () => existemDados(STORAGE_KEYS.CONTAS)
  },
  usuario: {
    salvar: <T>(dados: T) => salvarDados(STORAGE_KEYS.USUARIO, dados),
    recuperar: <T>(valorPadrao?: T) => recuperarDados<T>(STORAGE_KEYS.USUARIO, valorPadrao),
    remover: () => removerDados(STORAGE_KEYS.USUARIO),
    existe: () => existemDados(STORAGE_KEYS.USUARIO)
  }
};

export default offlineStorage; 