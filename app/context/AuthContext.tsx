import React, { createContext, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { CredenciaisLogin, Usuario } from '../types';
import { 
  loginUsuario, 
  logoutUsuario, 
  registrarUsuario,
  verificarAutenticacao,
  testarConexaoAuth
} from '../services/authService';
import { testarConexaoSupabase } from '../services/supabase';

// Interface para estado de autenticação
interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
}

// Resultado esperado das funções de autenticação
interface AuthResult {
  usuario: Usuario | null;
  token: string | null;
}

interface AuthContextData {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string, confirmacaoSenha: string) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authData, setAuthData] = useState<AuthState>({
    usuario: null,
    token: null,
    carregando: true
  });

  console.log('AuthProvider montado - Verificando autenticação existente');

  // Verificar conexão com Supabase Auth no carregamento
  useEffect(() => {
    const testarConexao = async () => {
      console.log('Testando conexão com Supabase Auth...');
      try {
        const conectado = await testarConexaoSupabase();
        if (!conectado) {
          toast.error('Erro de conexão com o servidor. Verifique sua internet.');
        }
        await testarConexaoAuth();
      } catch (error) {
        console.error('Erro ao testar conexão:', error);
        toast.error('Falha ao conectar com o servidor de autenticação');
      }
    };

    testarConexao();
  }, []);

  // Função para verificar autenticação
  const verificarAuth = useCallback(async () => {
    console.log('Verificando autenticação...');
    try {
      // Define carregando como true durante a verificação
      setAuthData(prev => ({ ...prev, carregando: true }));
      
      const resposta = await verificarAutenticacao();
      console.log('Resposta de verificação de autenticação:', resposta ? 'Autenticado' : 'Não autenticado');
      
      if (resposta && resposta.usuario && resposta.token) {
        setAuthData({
          usuario: resposta.usuario,
          token: resposta.token,
          carregando: false
        });
        console.log('Usuário autenticado:', resposta.usuario.email);
        return true;
      } else {
        // Se não estiver autenticado, limpa os dados
        setAuthData({
          usuario: null,
          token: null,
          carregando: false
        });
        console.log('Usuário não autenticado');
        return false;
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      // Em caso de erro, assume que não está autenticado
      setAuthData({
        usuario: null,
        token: null,
        carregando: false
      });
      return false;
    }
  }, []);

  // Verificar autenticação no carregamento inicial
  useEffect(() => {
    console.log('Verificando autenticação na montagem do contexto...');
    verificarAuth();
    
    // Configurar um temporizador para verificar a autenticação a cada 15 minutos
    // Isso ajuda a detectar tokens expirados
    const intervalo = setInterval(() => {
      console.log('Verificação periódica de autenticação');
      verificarAuth();
    }, 15 * 60 * 1000); // 15 minutos
    
    return () => clearInterval(intervalo);
  }, [verificarAuth]);

  // Função de login
  const login = useCallback(async (email: string, senha: string): Promise<boolean> => {
    try {
      console.log('Iniciando processo de login para:', email);
      const resposta = await loginUsuario(email, senha);
      
      // Verifica se resposta não é um Error e tem os campos necessários
      if (resposta && 'usuario' in resposta && 'token' in resposta && resposta.usuario && resposta.token) {
        console.log('Login bem-sucedido');
        setAuthData({
          usuario: resposta.usuario,
          token: resposta.token,
          carregando: false
        });
        toast.success('Login realizado com sucesso!');
        return true;
      } else {
        console.error('Login falhou - dados de resposta inválidos');
        toast.error('Erro ao fazer login. Verifique suas credenciais.');
        return false;
      }
    } catch (error) {
      console.error('Erro durante login:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Falha no login: ${errorMessage}`);
      return false;
    }
  }, []);

  // Função de logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log('Iniciando processo de logout');
      await logoutUsuario();
      
      // Limpar dados de autenticação do estado
      setAuthData({
        usuario: null,
        token: null,
        carregando: false
      });
      
      console.log('Logout realizado com sucesso');
      toast.info('Você saiu do sistema');
    } catch (error) {
      console.error('Erro durante logout:', error);
      toast.error('Erro ao fazer logout');
    }
  }, []);

  // Função de cadastro
  const cadastrar = useCallback(async (
    nome: string, 
    email: string, 
    senha: string, 
    confirmacaoSenha: string
  ): Promise<boolean> => {
    try {
      console.log('Iniciando processo de cadastro para:', email);
      
      if (senha !== confirmacaoSenha) {
        console.error('Cadastro falhou - senhas não coincidem');
        toast.error('As senhas não coincidem');
        return false;
      }
      
      const resposta = await registrarUsuario(nome, email, senha, confirmacaoSenha);
      
      // Verifica se resposta não é um Error e tem os campos necessários
      if (resposta && 'usuario' in resposta && 'token' in resposta && resposta.usuario && resposta.token) {
        console.log('Cadastro bem-sucedido');
        setAuthData({
          usuario: resposta.usuario,
          token: resposta.token,
          carregando: false
        });
        toast.success('Cadastro realizado com sucesso!');
        return true;
      } else {
        console.error('Cadastro falhou - dados de resposta inválidos');
        toast.error('Erro ao realizar cadastro');
        return false;
      }
    } catch (error) {
      console.error('Erro durante cadastro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Falha no cadastro: ${errorMessage}`);
      return false;
    }
  }, []);

  // Estado de depuração
  useEffect(() => {
    console.log('AuthContext estado atualizado:', {
      usuarioPresente: authData.usuario ? 'Sim' : 'Não',
      tokenPresente: authData.token ? 'Sim' : 'Não',
      carregando: authData.carregando
    });
  }, [authData]);

  return (
    <AuthContext.Provider
      value={{
        usuario: authData.usuario,
        token: authData.token,
        carregando: authData.carregando,
        login,
        logout,
        cadastrar
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 