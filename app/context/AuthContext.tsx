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
import { debug, error as errorLog } from '../utils/logger';

// Interface para estado de autenticação
interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
  erro: string | null;
  modoOffline: boolean;
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
  erro: string | null;
  modoOffline: boolean;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string, confirmacaoSenha: string) => Promise<boolean>;
  limparErro: () => void;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authData, setAuthData] = useState<AuthState>({
    usuario: null,
    token: null,
    carregando: true,
    erro: null,
    modoOffline: false
  });

  console.log('AuthProvider montado - Verificando autenticação existente');

  // Função para limpar mensagens de erro
  const limparErro = useCallback(() => {
    setAuthData(prev => ({ ...prev, erro: null }));
  }, []);

  // Verificar conexão com Supabase Auth no carregamento
  useEffect(() => {
    const testarConexao = async () => {
      console.log('Testando conexão com Supabase Auth...');
      try {
        const conectado = await testarConexaoSupabase();
        if (!conectado) {
          // Tentar recuperar dados do localStorage em caso de falha
          const dadosSalvos = localStorage.getItem('@MFFinancas:auth');
          if (dadosSalvos) {
            try {
              const { usuario, token } = JSON.parse(dadosSalvos);
              setAuthData(prev => ({
                ...prev,
                usuario,
                token,
                carregando: false,
                erro: 'Usando dados salvos localmente. Algumas funcionalidades podem estar limitadas.',
                modoOffline: true
              }));
              console.log('Usando dados de autenticação salvos localmente devido a problemas de conexão.');
            } catch (e) {
              localStorage.removeItem('@MFFinancas:auth');
              setAuthData(prev => ({
                ...prev,
                erro: 'Erro de conexão com o servidor. Verifique sua internet.',
                carregando: false,
                modoOffline: true
              }));
            }
          } else {
            setAuthData(prev => ({
              ...prev,
              erro: 'Erro de conexão com o servidor. Verifique sua internet.',
              carregando: false,
              modoOffline: true
            }));
          }
          errorLog('Falha na conexão com Supabase');
        } else {
          debug('Conexão com Supabase bem-sucedida');
          // Limpar erro se a conexão for bem-sucedida
          setAuthData(prev => ({
            ...prev,
            erro: null,
            modoOffline: false
          }));
        }
        await testarConexaoAuth();
      } catch (error) {
        console.error('Erro ao testar conexão:', error);
        errorLog('Falha na conexão com o servidor de autenticação', error);
        
        // Tentar recuperar dados do localStorage
        const dadosSalvos = localStorage.getItem('@MFFinancas:auth');
        if (dadosSalvos) {
          try {
            const { usuario, token } = JSON.parse(dadosSalvos);
            setAuthData(prev => ({
              ...prev,
              usuario,
              token,
              carregando: false,
              erro: 'Usando dados salvos localmente. Algumas funcionalidades podem estar limitadas.',
              modoOffline: true
            }));
          } catch (e) {
            localStorage.removeItem('@MFFinancas:auth');
            setAuthData(prev => ({
              ...prev,
              erro: 'Falha ao conectar com o servidor de autenticação',
              carregando: false,
              modoOffline: true
            }));
          }
        } else {
          setAuthData(prev => ({
            ...prev,
            erro: 'Falha ao conectar com o servidor de autenticação',
            carregando: false,
            modoOffline: true
          }));
        }
      }
    };

    testarConexao();
  }, []);

  // Função para verificar autenticação
  const verificarAuth = useCallback(async () => {
    console.log('Verificando autenticação...');
    try {
      // Define carregando como true durante a verificação
      setAuthData(prev => ({ ...prev, carregando: true, erro: null }));
      
      // Verificar conexão com o servidor antes de verificar autenticação
      const conexaoOk = await testarConexaoSupabase();
      if (!conexaoOk) {
        // Se não conseguir conectar, tentar recuperar dados do localStorage
        const dadosSalvos = localStorage.getItem('@MFFinancas:auth');
        if (dadosSalvos) {
          try {
            const { usuario, token } = JSON.parse(dadosSalvos);
            setAuthData({
              usuario,
              token,
              carregando: false,
              erro: 'Usando dados salvos localmente. Algumas funcionalidades podem estar limitadas.',
              modoOffline: true
            });
            return true;
          } catch (e) {
            localStorage.removeItem('@MFFinancas:auth');
          }
        }
        throw new Error('Não foi possível conectar ao servidor. Verifique sua internet.');
      }
      
      const resposta = await verificarAutenticacao();
      console.log('Resposta de verificação de autenticação:', resposta ? 'Autenticado' : 'Não autenticado');
      
      if (resposta && typeof resposta === 'object' && 'usuario' in resposta && 'token' in resposta && resposta.usuario && resposta.token) {
        // Salvar dados no localStorage para persistência
        localStorage.setItem('@MFFinancas:auth', JSON.stringify({
          usuario: resposta.usuario,
          token: resposta.token
        }));
        
        setAuthData({
          usuario: resposta.usuario,
          token: resposta.token,
          carregando: false,
          erro: null,
          modoOffline: false
        });
        console.log('Usuário autenticado:', resposta.usuario.email);
        return true;
      } else {
        // Limpar dados do localStorage se não estiver autenticado
        localStorage.removeItem('@MFFinancas:auth');
        
        setAuthData({
          usuario: null,
          token: null,
          carregando: false,
          erro: null,
          modoOffline: false
        });
        console.log('Usuário não autenticado');
        return false;
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      const mensagemErro = error instanceof Error ? error.message : 'Erro ao verificar autenticação';
      
      // Em caso de erro de conexão, tentar recuperar dados do localStorage
      if (mensagemErro.includes('conexão') || mensagemErro.includes('servidor')) {
        const dadosSalvos = localStorage.getItem('@MFFinancas:auth');
        if (dadosSalvos) {
          try {
            const { usuario, token } = JSON.parse(dadosSalvos);
            setAuthData({
              usuario,
              token,
              carregando: false,
              erro: 'Usando dados salvos localmente. Algumas funcionalidades podem estar limitadas.',
              modoOffline: true
            });
            return true;
          } catch (e) {
            localStorage.removeItem('@MFFinancas:auth');
          }
        }
      }
      
      setAuthData({
        usuario: null,
        token: null,
        carregando: false,
        erro: mensagemErro,
        modoOffline: false
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
      // Remover qualquer erro anterior
      setAuthData(prev => ({ ...prev, carregando: true, erro: null }));
      
      console.log('Iniciando processo de login para:', email);
      
      // Verificar conexão com o servidor antes de tentar login
      const conexaoOk = await testarConexaoSupabase();
      if (!conexaoOk) {
        setAuthData(prev => ({
          ...prev,
          carregando: false,
          erro: 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
          modoOffline: true
        }));
        return false;
      }
      
      const resposta = await loginUsuario(email, senha);
      
      // Verificar se resposta é um objeto e tem as propriedades necessárias
      if (resposta && typeof resposta === 'object' && 'usuario' in resposta && 'token' in resposta && resposta.usuario && resposta.token) {
        console.log('Login bem-sucedido');
        setAuthData({
          usuario: resposta.usuario,
          token: resposta.token,
          carregando: false,
          erro: null,
          modoOffline: false
        });
        toast.success('Login realizado com sucesso!');
        return true;
      } else if (resposta && typeof resposta === 'object' && 'error' in resposta) {
        const erro = resposta.error instanceof Error ? resposta.error.message : 'Erro desconhecido';
        console.error('Login falhou com erro específico:', erro);
        setAuthData(prev => ({
          ...prev,
          carregando: false,
          erro,
          modoOffline: false
        }));
        
        // Toast já deve ter sido mostrado pelo serviço
        return false;
      } else {
        console.error('Login falhou - dados de resposta inválidos');
        setAuthData(prev => ({
          ...prev,
          carregando: false,
          erro: 'Erro ao fazer login. Verifique suas credenciais.',
          modoOffline: false
        }));
        toast.error('Erro ao fazer login. Verifique suas credenciais.');
        return false;
      }
    } catch (error) {
      console.error('Erro durante login:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setAuthData(prev => ({
        ...prev,
        carregando: false,
        erro: errorMessage,
        modoOffline: false
      }));
      
      // Verificar se o erro parece ser de conexão
      const mensagemErro = errorMessage.toLowerCase();
      if (
        mensagemErro.includes('failed to fetch') || 
        mensagemErro.includes('network') || 
        mensagemErro.includes('conexão') || 
        mensagemErro.includes('timeout')
      ) {
        toast.error('Falha na conexão com o servidor. Verifique sua internet e tente novamente.');
        setAuthData(prev => ({
          ...prev,
          modoOffline: true
        }));
      } else {
        toast.error(`Falha no login: ${errorMessage}`);
      }
      
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
        carregando: false,
        erro: null,
        modoOffline: false
      });
      
      console.log('Logout realizado com sucesso');
      toast.info('Você saiu do sistema');
    } catch (error) {
      console.error('Erro durante logout:', error);
      const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
      setAuthData(prev => ({
        ...prev,
        carregando: false,
        erro: mensagemErro
      }));
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
      // Remover qualquer erro anterior e indicar carregamento
      setAuthData(prev => ({ ...prev, carregando: true, erro: null }));
      
      console.log('Iniciando processo de cadastro para:', email);
      
      // Verificar conexão com o servidor antes de tentar cadastro
      const conexaoOk = await testarConexaoSupabase();
      if (!conexaoOk) {
        setAuthData(prev => ({
          ...prev,
          carregando: false,
          erro: 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'
        }));
        toast.error('Erro de conexão com o servidor');
        return false;
      }
      
      if (senha !== confirmacaoSenha) {
        console.error('Cadastro falhou - senhas não coincidem');
        setAuthData(prev => ({
          ...prev,
          carregando: false,
          erro: 'As senhas não coincidem'
        }));
        toast.error('As senhas não coincidem');
        return false;
      }
      
      const resposta = await registrarUsuario(nome, email, senha, confirmacaoSenha);
      
      // Verificar se resposta é um objeto e tem as propriedades necessárias
      if (resposta && typeof resposta === 'object' && 'usuario' in resposta && 'token' in resposta && resposta.usuario && resposta.token) {
        console.log('Cadastro bem-sucedido');
        setAuthData({
          usuario: resposta.usuario,
          token: resposta.token,
          carregando: false,
          erro: null
        });
        toast.success('Cadastro realizado com sucesso!');
        return true;
      } else if (resposta && typeof resposta === 'object' && 'error' in resposta) {
        const erro = resposta.error instanceof Error ? resposta.error.message : 'Erro desconhecido';
        console.error('Cadastro falhou com erro específico:', erro);
        setAuthData(prev => ({
          ...prev,
          carregando: false,
          erro: erro
        }));
        // Toast já deve ter sido mostrado pelo serviço
        return false;
      } else {
        console.error('Cadastro falhou - dados de resposta inválidos');
        setAuthData(prev => ({
          ...prev,
          carregando: false,
          erro: 'Erro ao realizar cadastro'
        }));
        toast.error('Erro ao realizar cadastro');
        return false;
      }
    } catch (error) {
      console.error('Erro durante cadastro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setAuthData(prev => ({
        ...prev,
        carregando: false,
        erro: errorMessage
      }));
      toast.error(`Falha no cadastro: ${errorMessage}`);
      return false;
    }
  }, []);

  // Estado de depuração
  useEffect(() => {
    console.log('AuthContext estado atualizado:', {
      usuarioPresente: authData.usuario ? 'Sim' : 'Não',
      tokenPresente: authData.token ? 'Sim' : 'Não',
      carregando: authData.carregando,
      temErro: authData.erro ? 'Sim' : 'Não'
    });
    
    // Se houver erro, logar para depuração
    if (authData.erro) {
      errorLog('Erro no contexto de autenticação', { mensagem: authData.erro });
    }
  }, [authData]);

  return (
    <AuthContext.Provider
      value={{
        usuario: authData.usuario,
        token: authData.token,
        carregando: authData.carregando,
        erro: authData.erro,
        modoOffline: authData.modoOffline,
        login,
        logout,
        cadastrar,
        limparErro
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 