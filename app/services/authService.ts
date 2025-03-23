import { supabase } from './supabase';
import { toast } from 'react-toastify';
import { CredenciaisLogin, Usuario } from '../types';
import { credenciaisLoginSchema, registroUsuarioSchema, validar } from '../schemas';
import { logger } from '../utils/logger';
import { validateAndSanitize, commonSchemas, sanitizeString } from '../utils/validators';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

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
    console.log('Iniciando registro de usuário:', email);
    
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
      console.error('Erro ao registrar usuário no Auth:', authError);
      
      // Mensagens de erro mais amigáveis
      if (authError.message.includes('already registered')) {
        toast.error('Este e-mail já está registrado. Por favor, tente fazer login.');
      } else {
        toast.error(`Erro ao registrar: ${authError.message}`);
      }
      
      return { usuario: null, token: null };
    }

    if (!authData.user) {
      console.error('Usuário não retornado após registro');
      toast.error('Erro ao criar conta. Por favor, tente novamente.');
      return { usuario: null, token: null };
    }

    console.log('Usuário registrado no Auth com sucesso');

    // Cria o perfil do usuário no banco de dados
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
      console.error('Erro ao criar perfil do usuário:', userError);
      toast.error(`Erro ao criar perfil: ${userError.message}`);
      
      // Tentar excluir o usuário Auth já que o perfil falhou
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (e) {
        console.error('Erro ao remover usuário Auth após falha no perfil:', e);
      }
      
      return { usuario: null, token: null };
    }

    console.log('Perfil de usuário criado com sucesso');
    
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
  } catch (error: any) {
    const mensagem = error.message || 'Erro ao criar conta. Tente novamente.';
    console.error('Exceção não tratada ao registrar usuário:', error);
    toast.error(mensagem);
    return { usuario: null, token: null };
  }
};

/**
 * Autentica um usuário no sistema
 * @param credenciais Credenciais de login (email e senha)
 * @returns Dados do usuário e token, ou null em caso de erro
 */
export const loginUsuario = async (
  credenciais: CredenciaisLogin
): Promise<{ usuario: Usuario | null; token: string | null }> => {
  try {
    console.log('Iniciando login de usuário:', credenciais.email);
    
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
        return { usuario: null, token: null };
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
      console.error('Erro ao fazer login:', authError);
      
      // Mensagens de erro mais amigáveis
      if (authError.message.includes('Invalid login credentials')) {
        toast.error('E-mail ou senha incorretos.');
      } else {
        toast.error(`Erro ao fazer login: ${authError.message}`);
      }
      
      return { usuario: null, token: null };
    }
    
    if (!authData.user) {
      console.error('Usuário não retornado após login');
      toast.error('Erro ao fazer login. Por favor, tente novamente.');
      return { usuario: null, token: null };
    }
    
    console.log('Autenticação bem-sucedida, buscando dados do usuário');

    // 2. Buscar dados do usuário no banco
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (userError) {
      console.error('Erro ao buscar dados do usuário:', userError);
      toast.error('Erro ao recuperar informações do perfil.');
      return { usuario: null, token: null };
    }
    
    if (!userData) {
      console.error('Dados do usuário não encontrados');
      toast.error('Perfil não encontrado. Por favor, contate o suporte.');
      return { usuario: null, token: null };
    }
    
    console.log('Login completo com sucesso');
    
    // Aplicar sanitização adicional aos dados do usuário
    const usuario: Usuario = {
      id: userData.id,
      nome: sanitizeString(userData.nome),
      email: sanitizeString(userData.email),
      senha: '' // Campo obrigatório, mas não armazenamos a senha real
    };
    
    toast.success(`Bem-vindo(a) de volta, ${usuario.nome}!`);
    
    return {
      usuario,
      token: authData.session.access_token
    };
  } catch (error: any) {
    const mensagem = error.message || 'Erro ao fazer login. Tente novamente.';
    console.error('Exceção não tratada ao fazer login:', error);
    toast.error(mensagem);
    return { usuario: null, token: null };
  }
};

// Logout de usuário
export const logoutUsuario = async (): Promise<boolean> => {
  try {
    console.log('Iniciando logout');
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error(`Erro ao sair: ${error.message}`);
      return false;
    }

    console.log('Logout realizado com sucesso');
    toast.success('Você saiu com sucesso!');
    return true;
  } catch (error) {
    console.error('Exceção não tratada ao fazer logout:', error);
    toast.error('Erro inesperado ao sair.');
    return false;
  }
};

// Verifica se o usuário está autenticado
export const verificarAutenticacao = async (): Promise<{
  usuario: Usuario | null;
  token: string | null;
}> => {
  try {
    console.log('Verificando autenticação');
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Erro ao verificar sessão:', sessionError);
      return { usuario: null, token: null };
    }

    if (!sessionData.session) {
      console.log('Nenhuma sessão encontrada');
      return { usuario: null, token: null };
    }

    const { user } = sessionData.session;
    
    if (!user) {
      console.log('Sessão encontrada, mas sem usuário');
      return { usuario: null, token: null };
    }

    console.log('Sessão ativa encontrada, buscando dados do usuário');

    // 2. Buscar informações do usuário
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single();

    if (usuarioError) {
      console.error('Erro ao buscar dados do usuário após verificar autenticação:', usuarioError);
      return { usuario: null, token: null };
    }

    if (!usuarioData) {
      console.error('Dados do usuário não encontrados após verificar autenticação');
      return { usuario: null, token: null };
    }

    console.log('Verificação de autenticação completa com sucesso');
    
    // Preparar objeto de usuário (sem senha)
    const usuario: Usuario = {
      id: usuarioData.id,
      nome: usuarioData.nome,
      email: usuarioData.email,
      fotoPerfil: usuarioData.foto_perfil,
    };

    return { 
      usuario, 
      token: sessionData.session.access_token || null 
    };
  } catch (error) {
    console.error('Exceção não tratada ao verificar autenticação:', error);
    return { usuario: null, token: null };
  }
}; 