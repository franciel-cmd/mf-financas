import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-toastify';
import { CredenciaisLogin, Usuario } from '../types';
import { 
  loginUsuario, 
  logoutUsuario, 
  registrarUsuario,
  verificarAutenticacao
} from '../services/authService';

// Interface para estado de autenticação
interface AuthState {
  token: string;
  usuario: Usuario | null;
  isAuthenticated: boolean;
}

interface AuthContextData {
  usuario: Usuario | null;
  token: string;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credenciais: CredenciaisLogin) => Promise<boolean>;
  logout: () => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string, confirmacaoSenha: string) => Promise<boolean>;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  console.log('AuthProvider sendo montado');
  
  const [authData, setAuthData] = useState<AuthState>({
    token: '',
    usuario: null,
    isAuthenticated: false
  });
  const [loading, setLoading] = useState(true);

  // Verifica autenticação ao iniciar
  useEffect(() => {
    console.log('useEffect de autenticação sendo executado');
    async function verificarAuth() {
      setLoading(true);
      try {
        const { usuario, token } = await verificarAutenticacao();
        
        console.log('Resultado da verificação de autenticação:', { usuario, token });
        
        if (token && usuario) {
          setAuthData({
            token,
            usuario,
            isAuthenticated: true
          });
        } else {
          setAuthData({
            token: '',
            usuario: null,
            isAuthenticated: false
          });
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setAuthData({
          token: '',
          usuario: null,
          isAuthenticated: false
        });
      } finally {
        setLoading(false);
      }
    }

    verificarAuth();
  }, []);

  async function login(credenciais: CredenciaisLogin): Promise<boolean> {
    setLoading(true);
    try {
      const result = await loginUsuario(credenciais);
      
      if (!result) {
        setLoading(false);
        return false;
      }
      
      setAuthData({
        token: result.token,
        usuario: result.usuario,
        isAuthenticated: true
      });
      
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Erro durante login:', error);
      setLoading(false);
      return false;
    }
  }

  async function logout(): Promise<void> {
    setLoading(true);
    try {
      await logoutUsuario();
      
      setAuthData({
        token: '',
        usuario: null,
        isAuthenticated: false
      });
    } catch (error) {
      console.error('Erro durante logout:', error);
    } finally {
      setLoading(false);
    }
  }

  async function cadastrar(
    nome: string, 
    email: string, 
    senha: string,
    confirmacaoSenha: string
  ): Promise<boolean> {
    setLoading(true);
    try {
      const result = await registrarUsuario(nome, email, senha, confirmacaoSenha);
      
      if (!result.usuario || !result.token) {
        setLoading(false);
        return false;
      }

      setAuthData({
        token: result.token,
        usuario: result.usuario,
        isAuthenticated: true
      });
      
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Erro durante cadastro:', error);
      setLoading(false);
      return false;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        usuario: authData.usuario,
        token: authData.token,
        isAuthenticated: authData.isAuthenticated,
        loading,
        login,
        logout,
        cadastrar
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 