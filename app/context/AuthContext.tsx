import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import { AuthState, CredenciaisLogin, Usuario } from '../types';

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
  const [data, setData] = useState<AuthState>(() => {
    try {
      const token = localStorage.getItem('@MFFinancas:token');
      const usuario = localStorage.getItem('@MFFinancas:usuario');

      if (token && usuario) {
        return {
          token,
          usuario: JSON.parse(usuario),
          isAuthenticated: true
        };
      }
    } catch (error) {
      console.error('Erro ao carregar dados de autenticação:', error);
    }

    return {
      token: '',
      usuario: {} as Usuario,
      isAuthenticated: false
    };
  });

  const [loading, setLoading] = useState(true);

  // Simula uma base de usuários (em uma aplicação real, isso seria um banco de dados)
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => {
    try {
      const storedUsuarios = localStorage.getItem('@MFFinancas:usuarios');
      if (storedUsuarios) {
        return JSON.parse(storedUsuarios);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
    // Usuário padrão para teste
    return [
      {
        id: uuidv4(),
        nome: 'Usuário Teste',
        email: 'teste@email.com',
        senha: '123456' // Em uma aplicação real, nunca armazenaria a senha em texto simples
      }
    ];
  });

  // Verifica a autenticação ao iniciar
  useEffect(() => {
    async function loadStorageData() {
      try {
        setLoading(true);
        const token = localStorage.getItem('@MFFinancas:token');
        const usuario = localStorage.getItem('@MFFinancas:usuario');

        if (token && usuario) {
          setData({
            token,
            usuario: JSON.parse(usuario),
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

  // Salva usuários no localStorage
  useEffect(() => {
    localStorage.setItem('@MFFinancas:usuarios', JSON.stringify(usuarios));
  }, [usuarios]);

  // Função para autenticar o usuário
  async function login({ email, senha }: CredenciaisLogin): Promise<boolean> {
    try {
      setLoading(true);
      
      // Simula uma chamada de API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verifica se o usuário existe
      const usuario = usuarios.find(u => u.email === email && u.senha === senha);

      if (!usuario) {
        toast.error('E-mail ou senha incorretos.');
        return false;
      }

      // Gera um token fictício (em uma aplicação real, seria um JWT)
      const token = uuidv4();

      // Salva os dados no localStorage
      localStorage.setItem('@MFFinancas:token', token);
      localStorage.setItem('@MFFinancas:usuario', JSON.stringify(usuario));

      // Atualiza o estado
      setData({
        token,
        usuario,
        isAuthenticated: true
      });

      toast.success(`Bem-vindo(a), ${usuario.nome}!`);
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
      
      // Simula uma chamada de API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verifica se o e-mail já está em uso
      if (usuarios.some(u => u.email === email)) {
        toast.error('Este e-mail já está em uso.');
        return false;
      }

      // Cria o novo usuário
      const novoUsuario: Usuario = {
        id: uuidv4(),
        nome,
        email,
        senha
      };

      // Atualiza a lista de usuários
      setUsuarios([...usuarios, novoUsuario]);

      // Loga automaticamente após o cadastro
      const token = uuidv4();

      localStorage.setItem('@MFFinancas:token', token);
      localStorage.setItem('@MFFinancas:usuario', JSON.stringify(novoUsuario));

      setData({
        token,
        usuario: novoUsuario,
        isAuthenticated: true
      });

      toast.success('Cadastro realizado com sucesso!');
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
  function logout() {
    localStorage.removeItem('@MFFinancas:token');
    localStorage.removeItem('@MFFinancas:usuario');

    setData({
      token: '',
      usuario: {} as Usuario,
      isAuthenticated: false
    });

    toast.info('Você saiu do sistema.');
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