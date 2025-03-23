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
  const [authData, setAuthData] = useState<AuthState>({
    token: '',
    usuario: null,
    isAuthenticated: false
  });
  const [loading, setLoading] = useState(true);

  // Verifica autenticação ao iniciar
  useEffect(() => {
    async function verificarAuth() {
      setLoading(true);
      try {
        const { usuario, token } = await verificarAutenticacao();
        
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
      const { usuario, token } = await loginUsuario(credenciais);
      
      if (!usuario || !token) {
        setLoading(false);
        return false;
      }

      setAuthData({
        token,
        usuario,
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
      const { usuario, token } = await registrarUsuario(nome, email, senha, confirmacaoSenha);
      
      if (!usuario || !token) {
        setLoading(false);
        return false;
      }

      setAuthData({
        token,
        usuario,
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