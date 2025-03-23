import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-toastify';
import { AuthState, CredenciaisLogin, Usuario } from '../types';
import { loginUsuario, logoutUsuario, registrarUsuario, verificarAutenticacao } from '../services/authService';

interface AuthContextData {
  isAuthenticated: boolean;
  usuario: Usuario | null;
  loading: boolean;
  login: (credenciais: CredenciaisLogin) => Promise<boolean>;
  logout: () => void;
  cadastrar: (nome: string, email: string, senha: string) => Promise<boolean>;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [data, setData] = useState<AuthState>({
    token: '',
    usuario: {} as Usuario,
    isAuthenticated: false
  });

  const [loading, setLoading] = useState(true);

  // Verifica a autenticação ao iniciar
  useEffect(() => {
    async function loadStorageData() {
      try {
        setLoading(true);
        
        const { usuario, token } = await verificarAutenticacao();

        if (token && usuario) {
          setData({
            token,
            usuario,
            isAuthenticated: true
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados de autenticação:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStorageData();
  }, []);

  // Função para autenticar o usuário
  async function login(credenciais: CredenciaisLogin): Promise<boolean> {
    try {
      setLoading(true);
      
      const { usuario, token } = await loginUsuario(credenciais);

      if (!usuario || !token) {
        return false;
      }

      // Atualiza o estado
      setData({
        token,
        usuario,
        isAuthenticated: true
      });

      return true;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      toast.error('Erro ao fazer login. Tente novamente.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Função para cadastrar novo usuário
  async function cadastrar(nome: string, email: string, senha: string): Promise<boolean> {
    try {
      setLoading(true);
      
      const { usuario, token } = await registrarUsuario(nome, email, senha);

      if (!usuario || !token) {
        return false;
      }

      // Atualiza o estado
      setData({
        token,
        usuario,
        isAuthenticated: true
      });

      return true;
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      toast.error('Erro ao cadastrar. Tente novamente.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Função para fazer logout
  async function logout() {
    setLoading(true);
    
    try {
      await logoutUsuario();
      
      setData({
        token: '',
        usuario: {} as Usuario,
        isAuthenticated: false
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: data.isAuthenticated,
        usuario: data.isAuthenticated ? data.usuario : null,
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