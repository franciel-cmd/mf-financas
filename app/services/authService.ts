import { supabase } from './supabase';
import { toast } from 'react-toastify';
import { CredenciaisLogin, Usuario } from '../types';
import { credenciaisLoginSchema, registroUsuarioSchema, validar } from '../schemas';
import { logger } from '../utils/logger';
import { validateAndSanitize, commonSchemas, sanitizeString } from '../utils/validators';
import { z } from 'zod';

// Esquema de validação para as credenciais de registro
const registroSchema = z.object({
  nome: commonSchemas.name,
  email: commonSchemas.email,
  senha: commonSchemas.password
});

// Esquema de validação para as credenciais de login
const loginSchema = z.object({
  email: commonSchemas.email,
  senha: z.string().min(1, 'Senha é obrigatória')
});

// Tratamento de erros unificado
const handleError = (error: any, mensagem: string): void => {
  logger.error(mensagem, error);
  
  let mensagemErro = mensagem;
  
  // Se for um erro do Supabase, extraímos a mensagem
  if (error?.message) {
    mensagemErro = `${mensagem}: ${error.message}`;
    // Mensagens amigáveis para erros comuns de autenticação
    if (error.message.includes('Invalid login credentials')) {
      mensagemErro = 'E-mail ou senha incorretos.';
    } else if (error.message.includes('User already registered')) {
      mensagemErro = 'Este e-mail já está registrado.';
    } else if (error.message.includes('Email not confirmed')) {
      mensagemErro = 'Por favor, confirme seu e-mail antes de fazer login.';
    } else if (error.message.includes('Password should be at least')) {
      mensagemErro = 'A senha deve ter pelo menos 6 caracteres.';
    }
  }
  
  // Se for um erro de validação, mostramos os erros específicos
  if (error?.erros && Array.isArray(error.erros)) {
    error.erros.forEach((erro: string) => {
      toast.error(erro);
    });
    return;
  }
  
  toast.error(mensagemErro);
};

/**
 * Registra um novo usuário
 * @param nome Nome do usuário
 * @param email E-mail do usuário
 * @param senha Senha do usuário
 * @param confirmacaoSenha Confirmação da senha do usuário
 * @returns Dados do usuário e token, ou null em caso de erro
 */
export const registrarUsuario = async (
  nome: string,
  email: string,
  senha: string,
  confirmacaoSenha: string
): Promise<{ usuario: Usuario | null; token: string | null }> => {
  try {
    logger.info('Iniciando processo de registro de usuário', { email });
    
    // Validar dados de registro
    if (senha !== confirmacaoSenha) {
      throw new Error('As senhas não coincidem.');
    }
    
    const resultadoValidacao = validateAndSanitize(registroSchema, {
      nome,
      email,
      senha
    });

    if (!resultadoValidacao.success) {
      throw new Error(`Dados inválidos: ${resultadoValidacao.errors?.join(', ')}`);
    }

    const dadosValidados = resultadoValidacao.data!;

    // Limitar taxa de tentativas de registro (proteção contra ataques de força bruta)
    const storedAttempts = sessionStorage.getItem('register_attempts') || '0';
    const attempts = parseInt(storedAttempts, 10);
    
    if (attempts >= 5) {
      const lastAttempt = sessionStorage.getItem('last_register_attempt') || '0';
      const lastAttemptTime = parseInt(lastAttempt, 10);
      const now = Date.now();
      
      if (now - lastAttemptTime < 300000) { // 5 minutos
        logger.warning('Muitas tentativas de registro detectadas', { email, attempts });
        toast.error('Muitas tentativas de registro. Tente novamente em alguns minutos.');
        return { usuario: null, token: null };
      } else {
        // Reinicia o contador após 5 minutos
        sessionStorage.setItem('register_attempts', '0');
      }
    }
    
    sessionStorage.setItem('register_attempts', (attempts + 1).toString());
    sessionStorage.setItem('last_register_attempt', Date.now().toString());

    // Registro no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: dadosValidados.email,
      password: dadosValidados.senha,
      options: {
        data: {
          nome: dadosValidados.nome
        }
      }
    });

    if (authError) {
      logger.error('Erro ao registrar usuário no Auth', authError);
      throw authError;
    }

    // Cria o perfil do usuário no banco de dados
    if (authData.user) {
      logger.info('Usuário registrado com sucesso no Auth', { userId: authData.user.id });
      
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id,
          nome: dadosValidados.nome,
          email: dadosValidados.email
        })
        .select()
        .single();

      if (userError) {
        logger.error('Erro ao criar perfil do usuário', userError);
        // Continua mesmo com erro, pois o Auth já foi criado
      } else {
        logger.info('Perfil do usuário criado com sucesso', { userId: authData.user.id });
      }

      const usuario: Usuario = {
        id: authData.user.id,
        nome: dadosValidados.nome,
        email: dadosValidados.email,
        senha: '' // Não armazenamos a senha
      };

      // Registrar ação de auditoria
      logger.audit({
        type: 'USER_REGISTERED',
        userId: authData.user.id,
        details: { email: dadosValidados.email }
      });

      toast.success('Cadastro realizado com sucesso!');
      return {
        usuario,
        token: authData.session?.access_token || null
      };
    }
    
    throw new Error('Erro ao processar o registro de usuário');
  } catch (error: any) {
    const mensagem = error.message || 'Erro ao criar conta. Tente novamente.';
    logger.error('Erro no processo de registro', error);
    toast.error(mensagem);
    return { usuario: null, token: null };
  }
};

/**
 * Autentica um usuário no sistema
 * @param credenciais Credenciais de login (email e senha)
 * @returns Dados do usuário e token, ou null em caso de erro
 */
export async function loginUsuario(credenciais: CredenciaisLogin): Promise<{ usuario: Usuario; token: string } | null> {
  try {
    // Validar e sanitizar os dados de entrada
    const validationResult = validateAndSanitize(loginSchema, credenciais);
    if (!validationResult.success) {
      throw new Error(`Dados inválidos: ${validationResult.errors?.join(', ')}`);
    }
    
    const dadosValidados = validationResult.data!;
    
    // Log de tentativa de login (dados sensíveis omitidos)
    logger.audit('Tentativa de login', { email: dadosValidados.email });
    
    // Limitar taxa de tentativas de login (proteção contra ataques de força bruta)
    const storedAttempts = sessionStorage.getItem('login_attempts') || '0';
    const attempts = parseInt(storedAttempts, 10);
    
    if (attempts >= 5) {
      const lastAttempt = sessionStorage.getItem('last_login_attempt') || '0';
      const lastAttemptTime = parseInt(lastAttempt, 10);
      const now = Date.now();
      
      if (now - lastAttemptTime < 300000) { // 5 minutos
        logger.warning('Muitas tentativas de login detectadas', { email: dadosValidados.email, attempts });
        toast.error('Muitas tentativas de login. Tente novamente em alguns minutos.');
        return null;
      } else {
        // Reinicia o contador após 5 minutos
        sessionStorage.setItem('login_attempts', '0');
      }
    }
    
    sessionStorage.setItem('login_attempts', (attempts + 1).toString());
    sessionStorage.setItem('last_login_attempt', Date.now().toString());
    
    // 1. Autenticar com o Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: dadosValidados.email,
      password: dadosValidados.senha
    });
    
    if (authError) {
      // Log detalhado do erro para debugging
      logger.error('Erro na autenticação', {
        erro: authError.message,
        codigo: authError.code,
        email: dadosValidados.email
      });
      
      // Mensagem de erro amigável baseada no tipo de erro
      if (authError.message.includes('Invalid login')) {
        throw new Error('Email ou senha incorretos.');
      }
      
      throw authError;
    }
    
    if (!authData.user || !authData.session) {
      throw new Error('Erro na autenticação. Por favor, tente novamente.');
    }
    
    // 2. Buscar dados do usuário no banco
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (userError) {
      logger.error('Erro ao buscar dados do usuário', {
        erro: userError.message,
        userId: authData.user.id
      });
      
      throw userError;
    }
    
    if (!userData) {
      throw new Error('Usuário não encontrado.');
    }
    
    // Log de auditoria para login bem-sucedido
    logger.audit('Login bem-sucedido', {
      userId: authData.user.id,
      email: userData.email
    });
    
    // Aplicar sanitização adicional aos dados do usuário
    const usuario: Usuario = {
      id: userData.id,
      nome: sanitizeString(userData.nome),
      email: sanitizeString(userData.email),
      senha: '' // Campo obrigatório, mas não armazenamos a senha real
    };
    
    toast.success(`Bem-vindo(a), ${usuario.nome}!`);
    
    return {
      usuario,
      token: authData.session.access_token
    };
  } catch (error: any) {
    const mensagem = error.message || 'Erro ao fazer login. Tente novamente.';
    logger.error('Erro no processo de login', error);
    toast.error(mensagem);
    return null;
  }
}

// Logout de usuário
export const logoutUsuario = async (): Promise<boolean> => {
  try {
    // Obter o usuário atual antes de fazer logout
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    
    logger.info('Iniciando processo de logout', { userId });
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      handleError(error, 'Erro ao fazer logout');
      return false;
    }

    if (userId) {
      // Registrar ação de auditoria
      logger.audit({
        type: 'USER_LOGOUT',
        userId
      });
    }

    logger.info('Logout realizado com sucesso', { userId });
    toast.info('Você saiu do sistema.');
    return true;
  } catch (error) {
    handleError(error, 'Erro ao fazer logout');
    return false;
  }
};

// Verifica se o usuário está autenticado
export const verificarAutenticacao = async (): Promise<{
  usuario: Usuario | null;
  token: string | null;
}> => {
  try {
    logger.debug('Verificando autenticação');
    
    const { data } = await supabase.auth.getSession();

    if (data.session && data.session.user) {
      logger.debug('Sessão encontrada', { userId: data.session.user.id });
      
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      if (userError) {
        handleError(userError, 'Erro ao buscar perfil do usuário');
      }

      const nome = userData?.nome || data.session.user.user_metadata?.nome || 'Usuário';

      const usuario: Usuario = {
        id: data.session.user.id,
        nome,
        email: data.session.user.email || '',
        senha: '' // Não armazenamos a senha
      };

      return {
        usuario,
        token: data.session.access_token
      };
    }

    logger.debug('Nenhuma sessão encontrada');
    return { usuario: null, token: null };
  } catch (error) {
    handleError(error, 'Erro ao verificar autenticação');
    return { usuario: null, token: null };
  }
}; 