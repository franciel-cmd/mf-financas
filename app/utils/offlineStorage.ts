/**
 * Utilitário para armazenamento e gerenciamento de dados offline
 */

import { debug, error } from './logger';

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
    error(`Erro ao salvar dados no armazenamento local: ${chave}`, err);
    
    // Verificar se erro é devido a localStorage cheio
    if (err instanceof DOMException && 
       (err.name === 'QuotaExceededError' || 
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      error('Armazenamento local está cheio. Tentando liberar espaço...');
      
      // Remover dados menos importantes para liberar espaço
      try {
        localStorage.removeItem('MFFinancas:logs');
        localStorage.removeItem('MFFinancas:cache');
        
        // Tentar novamente
        localStorage.setItem(chave, JSON.stringify(dados));
        debug(`Dados salvos com sucesso após liberar espaço: ${chave}`);
        return true;
      } catch (retryErr) {
        error('Falha ao salvar mesmo após tentar liberar espaço', retryErr);
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
    error(`Erro ao recuperar dados do armazenamento local: ${chave}`, err);
    
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
    error(`Erro ao remover dados do armazenamento local: ${chave}`, err);
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
    error(`Erro ao verificar existência de dados: ${chave}`, err);
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