import { supabase } from './supabase';
import { toast } from 'react-toastify';
import { CredenciaisLogin, Usuario } from '../types';
import { credenciaisLoginSchema, registroUsuarioSchema, validar } from '../schemas';
import * as logger from '../utils/logger';
import { validateAndSanitize, commonSchemas, sanitizeString } from '../utils/validators';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { debug, error as errorLog } from '../utils/logger';

// Esquema de validação para registro
const registroSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmacaoSenha: z.string().min(6, 'Confirmação de senha deve ter pelo menos 6 caracteres')
}).refine(data => data.senha === data.confirmacaoSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmacaoSenha']
});

// Esquema de validação para login
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória')
});

// Função para verificar a conexão com Supabase Auth
export const testarConexaoAuth = async (): Promise<boolean> => {
  try {
    // Adicionar timeout de 10 segundos
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao testar conexão com Auth')), 10000);
    });
    
    const testPromise = new Promise<boolean>(async (resolve) => {
      try {
        const session = await supabase.auth.getSession();
        console.log('Teste de conexão Auth:', session ? 'Sucesso' : 'Falha');
        resolve(!!session);
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
        resolve(false);
      }
    });
    
    return await Promise.race([testPromise, timeoutPromise]);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Timeout')) {
      console.error('Timeout ao testar conexão com Auth');
    } else {
      console.error('Erro ao testar conexão com Auth:', err);
    }
    return false;
  }
};

// Função para lidar com erros de autenticação
const handleAuthError = (error: any): string => {
  const errorCode = error?.code || error?.message || 'Erro desconhecido';
  debug(`Erro de autenticação: ${errorCode}`);

  // Verificar se é um erro de rede
  if (
    error?.message?.includes('Failed to fetch') || 
    error?.message?.includes('NetworkError') || 
    error?.message?.includes('network request failed') ||
    error?.message?.includes('Tempo de conexão esgotado') ||
    error?.message?.includes('Falha na conexão')
  ) {
    return 'Erro de conexão com o servidor. Verifique sua internet.';
  }

  // Erros específicos do Supabase
  switch (errorCode) {
    case 'auth/user-not-found':
    case 'invalid_grant':
    case 'P0001':
    case 'auth/invalid-email':
    case 'auth/invalid-credential':
      return 'Email ou senha inválidos';
    case 'auth/email-already-in-use':
    case 'auth/account-exists-with-different-credential':
      return 'Este email já está em uso';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde';
    case 'auth/network-request-failed':
      return 'Erro de conexão com o servidor. Verifique sua internet.';
    case 'auth/popup-closed-by-user':
      return 'Login cancelado pelo usuário';
    case 'User already registered':
    case 'Email already in use':
      return 'Este email já está cadastrado';
    default:
      return 'Erro ao realizar autenticação. Tente novamente.';
  }
};

// Função para registrar um novo usuário
export const registrarUsuario = async (
  nome: string,
  email: string,
  senha: string,
  confirmacaoSenha: string
) => {
  logger.info('Iniciando registro de usuário', { email });
  console.log('Iniciando registro de usuário:', email);
  
  try {
    // Validar dados de entrada
    const validacao = registroSchema.safeParse({ nome, email, senha, confirmacaoSenha });
    if (!validacao.success) {
      const mensagensErro = validacao.error.errors.map(e => e.message).join(', ');
      logger.error('Erro na validação de registro', { mensagensErro });
      toast.error(mensagensErro);
      throw new Error(mensagensErro);
    }
    
    // Verificar se as senhas coincidem (redundante, mas para segurança extra)
    if (senha !== confirmacaoSenha) {
      const mensagem = 'As senhas não coincidem';
      logger.error(mensagem);
      toast.error(mensagem);
      throw new Error(mensagem);
    }
    
    console.log('Dados validados, prosseguindo com registro');
    
    // Tentar criar usuário com retry
    let retries = 2;
    let lastError = null;
    
    while (retries >= 0) {
      try {
        // Registrar usuário no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: {
              nome
            }
          }
        });
        
        if (authError) {
          // Se for erro de rede, tentar novamente
          if (
            authError.message.includes('Failed to fetch') || 
            authError.message.includes('network request failed') ||
            authError.message.includes('Tempo de conexão')
          ) {
            lastError = authError;
            retries--;
            if (retries >= 0) {
              console.log(`Tentando novamente registro. Tentativas restantes: ${retries}`);
              // Esperar um pouco antes de tentar novamente
              await new Promise(resolve => setTimeout(resolve, 1500));
              continue;
            }
          }
          throw authError;
        }
        
        if (!authData.user || !authData.session) {
          const mensagem = 'Falha ao criar usuário (dados incompletos)';
          logger.error(mensagem);
          toast.error(mensagem);
          throw new Error(mensagem);
        }
        
        logger.info('Usuário registrado com sucesso', { userId: authData.user.id });
        console.log('Usuário registrado com sucesso:', authData.user.id);
        
        // Criar perfil do usuário na tabela usuarios
        const { error: profileError } = await supabase
          .from('usuarios')
          .insert({
            id: authData.user.id,
            nome,
            email
          });
        
        if (profileError) {
          logger.error('Erro ao criar perfil do usuário', profileError);
          console.error('Erro ao criar perfil do usuário:', profileError);
          // Não impede o login, apenas loga o erro
        }
        
        toast.success('Usuário cadastrado com sucesso!');
        
        // Retorna usuário e token
        return {
          usuario: {
            id: authData.user.id,
            nome,
            email
          },
          token: authData.session.access_token
        };
      } catch (err) {
        lastError = err;
        
        // Se for erro de rede, tentamos novamente
        if (
          err instanceof Error && (
            err.message.includes('Failed to fetch') || 
            err.message.includes('network request failed') ||
            err.message.includes('Tempo de conexão')
          )
        ) {
          retries--;
          if (retries >= 0) {
            console.log(`Tentando novamente registro. Tentativas restantes: ${retries}`);
            // Esperar um pouco antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
        } else {
          // Outros erros não tentamos novamente
          break;
        }
      }
    }
    
    // Se chegamos aqui com lastError, significa que esgotamos as tentativas
    if (lastError) {
      const mensagemErro = handleAuthError(lastError);
      toast.error(mensagemErro);
      errorLog('Erro no registro após tentativas:', lastError);
      return { error: lastError, usuario: null, token: null };
    }
    
    // Caso de erro desconhecido
    toast.error('Erro ao realizar cadastro');
    return { error: new Error('Erro desconhecido no registro'), usuario: null, token: null };
    
  } catch (error) {
    // Se for um erro já tratado, apenas repassa
    if (error instanceof Error) {
      const mensagemErro = error.message;
      toast.error(mensagemErro);
      return { error, usuario: null, token: null };
    }
    
    // Caso contrário, trata como erro genérico
    const mensagemErro = handleAuthError(error);
    toast.error(mensagemErro);
    return { error, usuario: null, token: null };
  }
};

// Função para fazer login
export const loginUsuario = async (email: string, senha: string) => {
  logger.info('Iniciando login de usuário', { email });
  console.log('Iniciando login de usuário:', email);
  
  try {
    // Validar dados de entrada
    const validacao = loginSchema.safeParse({ email, senha });
    if (!validacao.success) {
      const mensagensErro = validacao.error.errors.map(e => e.message).join(', ');
      logger.error('Erro na validação de login', { mensagensErro });
      toast.error(mensagensErro);
      throw new Error(mensagensErro);
    }
    
    // Tentar login com retry em caso de erro de rede
    let retries = 2;
    let lastError = null;
    
    while (retries >= 0) {
      try {
        // Fazer login no Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: senha
        });
        
        if (error) {
          // Se for erro de rede, tentar novamente
          if (
            error.message.includes('Failed to fetch') || 
            error.message.includes('network request failed') ||
            error.message.includes('Tempo de conexão')
          ) {
            lastError = error;
            retries--;
            if (retries >= 0) {
              console.log(`Tentando novamente login. Tentativas restantes: ${retries}`);
              // Esperar um pouco antes de tentar novamente
              await new Promise(resolve => setTimeout(resolve, 1500));
              continue;
            }
          }
          throw error;
        }
        
        if (!data.user || !data.session) {
          const mensagem = 'Falha no login (dados incompletos)';
          logger.error(mensagem);
          toast.error(mensagem);
          throw new Error(mensagem);
        }
        
        logger.info('Login realizado com sucesso', { userId: data.user.id });
        console.log('Login realizado com sucesso:', data.user.id);
        
        // Buscar dados do usuário na tabela usuarios
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (userError) {
          logger.error('Erro ao buscar dados do usuário', userError);
          console.warn('Erro ao buscar dados do usuário, usando dados do Auth:', userError);
        }
        
        const nome = userData?.nome || data.user.user_metadata?.nome || 'Usuário';
        
        return {
          usuario: {
            id: data.user.id,
            nome,
            email: data.user.email as string
          },
          token: data.session.access_token
        };
      } catch (err) {
        lastError = err;
        
        // Se for erro de rede, tentamos novamente
        if (
          err instanceof Error && (
            err.message.includes('Failed to fetch') || 
            err.message.includes('network request failed') ||
            err.message.includes('Tempo de conexão')
          )
        ) {
          retries--;
          if (retries >= 0) {
            console.log(`Tentando novamente login. Tentativas restantes: ${retries}`);
            // Esperar um pouco antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
        } else {
          // Outros erros não tentamos novamente
          break;
        }
      }
    }
    
    // Se chegamos aqui com lastError, significa que esgotamos as tentativas
    if (lastError) {
      const mensagemErro = handleAuthError(lastError);
      toast.error(mensagemErro);
      errorLog('Erro no login após tentativas:', lastError);
      return { error: lastError, usuario: null, token: null };
    }
    
    toast.error('Erro ao realizar login');
    return { error: new Error('Erro desconhecido no login'), usuario: null, token: null };
  } catch (error) {
    // Se for um erro já tratado, apenas repassa
    if (error instanceof Error) {
      const mensagemErro = error.message;
      toast.error(mensagemErro);
      return { error, usuario: null, token: null };
    }
    
    // Caso contrário, trata como erro genérico
    const mensagemErro = handleAuthError(error);
    toast.error(mensagemErro);
    return { error, usuario: null, token: null };
  }
};

// Função para fazer logout
export const logoutUsuario = async () => {
  logger.info('Iniciando logout de usuário');
  console.log('Iniciando logout de usuário');
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('Erro ao fazer logout', error);
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
    
    logger.info('Logout realizado com sucesso');
    console.log('Logout realizado com sucesso');
    
    return true;
  } catch (error) {
    logger.error('Erro ao fazer logout', error);
    console.error('Erro ao fazer logout:', error);
    toast.error('Erro ao fazer logout');
    throw error;
  }
};

// Função para verificar se o usuário está autenticado
export const verificarAutenticacao = async () => {
  try {
    // Tentar verificar autenticação com retry
    let retries = 1; // Menos tentativas para esta operação que é constante
    let lastError = null;
    
    while (retries >= 0) {
      try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error) {
          // Se for erro de rede, tentar novamente
          if (
            error.message.includes('Failed to fetch') || 
            error.message.includes('network request failed') ||
            error.message.includes('Tempo de conexão')
          ) {
            lastError = error;
            retries--;
            if (retries >= 0) {
              console.log(`Tentando novamente verificação de autenticação. Tentativas restantes: ${retries}`);
              // Esperar menos tempo para esta operação
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          }
          throw error;
        }
        
        if (!sessionData.session) {
          logger.info('Usuário não autenticado (sem sessão)');
          console.log('Usuário não autenticado (sem sessão)');
          return { usuario: null, token: null };
        }
        
        // Buscar dados do usuário na tabela usuarios
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();
        
        if (userError) {
          logger.warning('Erro ao buscar dados de perfil, usando dados do Auth', userError);
          console.warn('Erro ao buscar dados de perfil, usando dados do Auth:', userError);
        }
        
        const user = sessionData.session.user;
        const nome = userData?.nome || user.user_metadata?.nome || 'Usuário';
        
        logger.info('Usuário autenticado', { userId: user.id });
        console.log('Usuário autenticado:', user.id, nome);
        
        return {
          usuario: {
            id: user.id,
            nome,
            email: user.email as string
          },
          token: sessionData.session.access_token || null
        };
      } catch (err) {
        lastError = err;
        
        // Se for erro de rede, tentamos novamente
        if (
          err instanceof Error && (
            err.message.includes('Failed to fetch') || 
            err.message.includes('network request failed') ||
            err.message.includes('Tempo de conexão')
          )
        ) {
          retries--;
          if (retries >= 0) {
            console.log(`Tentando novamente verificação. Tentativas restantes: ${retries}`);
            // Esperar um pouco antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        } else {
          // Outros erros não tentamos novamente
          break;
        }
      }
    }
    
    // Se chegamos aqui com lastError, significa que esgotamos as tentativas
    if (lastError) {
      const mensagemErro = handleAuthError(lastError);
      console.error(`Erro na verificação de autenticação: ${mensagemErro}`);
      errorLog('Erro na verificação de autenticação:', lastError);
      // Não mostramos toast aqui para não irritar o usuário em operações de fundo
      return { usuario: null, token: null };
    }
    
    return { usuario: null, token: null };
  } catch (error) {
    logger.error('Erro ao verificar autenticação', error);
    console.error('Erro ao verificar autenticação:', error);
    return { usuario: null, token: null };
  }
}; 