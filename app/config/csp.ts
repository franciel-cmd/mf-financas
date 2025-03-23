/**
 * Política de Segurança de Conteúdo (CSP) para o aplicativo
 * 
 * Este arquivo configura as políticas de segurança de conteúdo para prevenir
 * ataques XSS, clickjacking e outras vulnerabilidades de injeção.
 */

// Definição das diretivas CSP
export const contentSecurityPolicy = {
  // Fontes permitidas para scripts
  'script-src': [
    "'self'",                 // Apenas scripts do mesmo origem
    "'unsafe-inline'",        // Necessário para alguns frameworks React
    "'unsafe-eval'",          // Necessário para desenvolvimento e alguns frameworks
    "https://cdn.jsdelivr.net", // CDN para bibliotecas comuns
    "https://cdn.tailwindcss.com", // Tailwind CDN (se usado)
    "https://apis.google.com", // APIs Google (se usadas)
  ].join(' '),

  // Fontes permitidas para estilos
  'style-src': [
    "'self'",
    "'unsafe-inline'",        // Necessário para styled-components
    "https://fonts.googleapis.com",
    "https://cdn.jsdelivr.net",
  ].join(' '),

  // Fontes permitidas para fontes
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com",
    "data:",
  ].join(' '),

  // Fontes permitidas para imagens
  'img-src': [
    "'self'",
    "data:",
    "https:",
    "blob:",
  ].join(' '),

  // Fontes permitidas para conexões
  'connect-src': [
    "'self'",
    "localhost:*",
    "http://localhost:*",
    import.meta.env.VITE_SUPABASE_URL || "",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "*", // Temporariamente permitir tudo durante debugging
  ].join(' '),

  // Impede o site de ser embarcado em frames (protege contra clickjacking)
  'frame-ancestors': [
    "'self'"
  ].join(' '),

  // Política de objetos
  'object-src': [
    "'none'"
  ].join(' '),

  // Política de base-uri (restringe uso de <base>)
  'base-uri': [
    "'self'"
  ].join(' '),

  // Fonte padrão para todos os recursos não especificados
  'default-src': [
    "'self'"
  ].join(' '),

  // Política de formulários
  'form-action': [
    "'self'"
  ].join(' '),

  // Upgrade de solicitações inseguras
  'upgrade-insecure-requests': '',
};

/**
 * Função para gerar string do cabeçalho CSP
 */
export function generateCSPHeader(): string {
  return Object.entries(contentSecurityPolicy)
    .map(([key, value]) => `${key} ${value}`)
    .join('; ');
}

/**
 * Função para aplicar cabeçalhos de segurança ao documento
 * Deve ser chamada no início da execução do aplicativo
 */
export function applySecurityHeaders(): void {
  if (typeof document !== 'undefined') {
    // Aplicar meta tag CSP
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = generateCSPHeader();
    document.head.appendChild(meta);
    
    // Cabeçalho para prevenir sniffing de MIME type
    const metaNoSniff = document.createElement('meta');
    metaNoSniff.httpEquiv = 'X-Content-Type-Options';
    metaNoSniff.content = 'nosniff';
    document.head.appendChild(metaNoSniff);
    
    // Cabeçalho para controle de referrer
    const metaReferrer = document.createElement('meta');
    metaReferrer.name = 'referrer';
    metaReferrer.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(metaReferrer);
  }
} 