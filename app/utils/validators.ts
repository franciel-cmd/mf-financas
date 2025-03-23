/**
 * Utilitários para validação e sanitização de entradas do usuário
 */
import { z } from 'zod';
import { logger } from './logger';

/**
 * Interface para resultados de validação
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Sanitiza uma string removendo scripts e tags HTML potencialmente perigosas
 * @param input String a ser sanitizada
 * @returns String sanitizada
 */
export function sanitizeString(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  // Converter para string para garantir
  const str = String(input);
  
  // Remover tags HTML e scripts
  return str
    .replace(/<(script|style|iframe|object|embed|applet|base|link|meta)\b[^>]*>.*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onclick\s*=/gi, '')
    .replace(/onload\s*=/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/eval\s*\(/gi, '')
    .replace(/data\s*:/gi, '');
}

/**
 * Sanitiza objetos recursivamente
 * @param obj Objeto a ser sanitizado
 * @returns Objeto sanitizado
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized = { ...obj } as T;
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      // Usar cast explícito para evitar erro de tipo
      (sanitized as any)[key] = sanitizeString(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Usar cast explícito para evitar erro de tipo
      (sanitized as any)[key] = sanitizeObject(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Valida e sanitiza dados usando schema Zod
 * @param schema Schema Zod para validação
 * @param data Dados a serem validados
 * @returns Resultado da validação com dados sanitizados se bem-sucedido
 */
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    // Primeiro valida com Zod
    const result = schema.safeParse(data);
    
    if (!result.success) {
      return {
        success: false,
        errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    
    // Se passou na validação, sanitiza os dados
    // Aqui sabemos que result.data deve ser um Record<string, any>
    const sanitizedData = sanitizeObject(result.data as any) as T;
    
    return {
      success: true,
      data: sanitizedData
    };
  } catch (error) {
    logger.error('Erro de validação', error);
    return {
      success: false,
      errors: ['Erro interno de validação']
    };
  }
}

/**
 * Schemas comuns para validação
 */
export const commonSchemas = {
  email: z.string().email('Email inválido').max(100),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  name: z.string().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Telefone inválido'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD)'),
  uuid: z.string().uuid('ID inválido'),
  amount: z.number().min(0, 'Valor não pode ser negativo'),
  positiveAmount: z.number().positive('Valor deve ser positivo'),
  percentual: z.number().min(0).max(100, 'Percentual deve estar entre 0 e 100'),
};

/**
 * Valida dados básicos na requisição, lançando erro se inválidos
 * Útil para middleware de validação
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = validateAndSanitize(schema, data);
  
  if (!result.success) {
    throw new Error(`Dados inválidos: ${result.errors?.join(', ')}`);
  }
  
  return result.data!;
} 