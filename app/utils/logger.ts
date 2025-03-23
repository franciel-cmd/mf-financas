// Níveis de log
type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'audit' | 'export';

// Interface para ação de auditoria
interface AuditAction {
  type: string;
  userId?: string;
  details?: Record<string, any>;
  timestamp?: string;
  message?: string;
}

// Interface para configuração de logs
interface LogConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  sanitizeData: boolean;
  enableRemote: boolean;
  auditEnabled: boolean;
}

// Valores sensíveis que devem ser sanitizados nos logs
const SENSITIVE_FIELDS = [
  'password', 'senha', 'token', 'secret', 'key', 'credit_card', 
  'cartao', 'cvv', 'codigo', 'auth', 'cpf', 'cnpj'
];

// Configuração padrão
const DEFAULT_CONFIG: LogConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableConsole: true,
  sanitizeData: true,
  enableRemote: false,
  auditEnabled: true
};

// Mapeamento de níveis de log para a prioridade
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
  audit: 4,
  export: 4
};

// Configuração atual
let config: LogConfig = { ...DEFAULT_CONFIG };

// Sanitizar dados sensíveis
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }
  
  return sanitized;
}

// Verificar se deve registrar o log com base no nível configurado
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[config.minLevel];
}

// Formatar a mensagem de log
function formatLogMessage(level: LogLevel, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const sanitizedData = config.sanitizeData && data ? sanitizeObject(data) : data;
  
  return JSON.stringify({
    timestamp,
    level,
    message,
    data: sanitizedData
  });
}

// Funções de log para diferentes níveis
export function debug(message: string, data?: any): void {
  if (!shouldLog('debug')) return;
  
  const formattedMessage = formatLogMessage('debug', message, data);
  
  if (config.enableConsole) {
    console.debug(formattedMessage);
  }
  
  // Implementar envio remoto se necessário
  if (config.enableRemote) {
    // sendToRemoteService(formattedMessage);
  }
}

export function info(message: string, data?: any): void {
  if (!shouldLog('info')) return;
  
  const formattedMessage = formatLogMessage('info', message, data);
  
  if (config.enableConsole) {
    console.info(formattedMessage);
  }
  
  if (config.enableRemote) {
    // sendToRemoteService(formattedMessage);
  }
}

export function warning(message: string, data?: any): void {
  if (!shouldLog('warning')) return;
  
  const formattedMessage = formatLogMessage('warning', message, data);
  
  if (config.enableConsole) {
    console.warn(formattedMessage);
  }
  
  if (config.enableRemote) {
    // sendToRemoteService(formattedMessage);
  }
}

export function error(message: string, error?: any): void {
  if (!shouldLog('error')) return;
  
  // Extrair informações úteis do erro
  const errorData = error ? {
    message: error.message,
    stack: error.stack,
    code: error.code,
    name: error.name,
    ...(error.response ? { 
      statusCode: error.response.status,
      statusText: error.response.statusText 
    } : {})
  } : undefined;
  
  const formattedMessage = formatLogMessage('error', message, errorData);
  
  if (config.enableConsole) {
    console.error(formattedMessage);
  }
  
  if (config.enableRemote) {
    // sendToRemoteService(formattedMessage, true);
  }
}

// Função de auditoria sobrecarregada
export function audit(actionOrMessage: AuditAction | string, dados?: any): void {
  if (!config.auditEnabled || !shouldLog('audit')) return;
  
  let auditAction: AuditAction;
  let message: string;
  let details: any;
  
  // Determinar qual sobrecarga está sendo usada
  if (typeof actionOrMessage === 'string') {
    // Sobrecarga com string e dados
    message = actionOrMessage;
    details = dados;
    auditAction = {
      type: 'SYSTEM',
      message: message,
      details: details,
      timestamp: new Date().toISOString()
    };
  } else {
    // Sobrecarga com objeto AuditAction
    auditAction = actionOrMessage;
    auditAction.timestamp = auditAction.timestamp || new Date().toISOString();
    message = `AUDIT: ${auditAction.type}`;
    details = auditAction;
  }
  
  const formattedMessage = formatLogMessage('audit', message, details);
  
  if (config.enableConsole) {
    console.info(formattedMessage);
  }
  
  // Logs de auditoria são mais importantes e devem ser armazenados
  if (config.enableRemote) {
    // sendToRemoteService(formattedMessage, true);
  }
  
  // Adicional: armazenar logs de auditoria localmente
  try {
    const auditLogs = JSON.parse(localStorage.getItem('mf_audit_logs') || '[]');
    auditLogs.push(auditAction);
    
    // Manter apenas os últimos 100 logs
    if (auditLogs.length > 100) {
      auditLogs.shift();
    }
    
    localStorage.setItem('mf_audit_logs', JSON.stringify(auditLogs));
  } catch (e) {
    // Ignorar erros de localStorage
  }
}

// Log específico para exportações
export function exportLog(message: string, data?: any): void {
  if (!config.auditEnabled || !shouldLog('export')) return;
  
  const formattedMessage = formatLogMessage('export', `EXPORT: ${message}`, data);
  
  if (config.enableConsole) {
    console.info(formattedMessage);
  }
  
  // Logs de exportação são importantes e devem ser armazenados
  if (config.enableRemote) {
    // sendToRemoteService(formattedMessage, true);
  }
  
  // Adicional: armazenar logs de exportação localmente
  try {
    const exportLogs = JSON.parse(localStorage.getItem('mf_export_logs') || '[]');
    const exportData = {
      timestamp: new Date().toISOString(),
      message,
      data: config.sanitizeData && data ? sanitizeObject(data) : data
    };
    
    exportLogs.push(exportData);
    
    // Manter apenas os últimos 50 logs
    if (exportLogs.length > 50) {
      exportLogs.shift();
    }
    
    localStorage.setItem('mf_export_logs', JSON.stringify(exportLogs));
  } catch (e) {
    // Ignorar erros de localStorage
  }
}

// Configurar o sistema de log
export function configure(newConfig: Partial<LogConfig>): void {
  config = { ...config, ...newConfig };
}

// Exportar a interface de log
export const logger = {
  debug,
  info,
  warning,
  error,
  audit,
  exportLog,
  configure,
}; 