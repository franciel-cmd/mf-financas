import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { debug } from '../utils/logger';
import { Button } from './ui';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tentativas, setTentativas] = useState(0);
  const [formValido, setFormValido] = useState(false);

  const { login, carregando, erro, limparErro } = useAuth();
  const navigate = useNavigate();

  // Validar formulário quando email ou senha mudarem
  useEffect(() => {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const senhaValida = senha.length >= 6;
    setFormValido(emailValido && senhaValida);
  }, [email, senha]);

  // Limpar mensagens de erro quando o usuário começa a digitar
  useEffect(() => {
    if (erro) {
      limparErro();
    }
  }, [email, senha, erro, limparErro]);

  // Exibir erro do contexto como toast se houver
  useEffect(() => {
    if (erro) {
      toast.error(erro);
    }
  }, [erro]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    debug('Tentativa de login', { email, tentativa: tentativas + 1 });
    
    if (!formValido) {
      toast.error('Por favor, preencha o formulário corretamente');
      return;
    }

    try {
      const loginSuccess = await login(email, senha);
      
      if (loginSuccess) {
        // Navegação já ocorre no AuthContext via useEffect
        navigate('/dashboard');
      } else {
        // Incrementar contador de tentativas
        setTentativas(prev => prev + 1);
      }
    } catch (error) {
      console.error('Erro durante login:', error);
      // O erro já será tratado pelo contexto
    }
  };

  return (
    <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Login</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Seu email"
            required
            disabled={carregando}
          />
        </div>
        
        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Sua senha"
            required
            disabled={carregando}
          />
        </div>
        
        <div>
          <Button
            type="submit"
            disabled={!formValido || carregando}
            className="w-full"
            color="primary"
            loading={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>
        </div>
        
        {tentativas > 2 && (
          <p className="text-sm text-gray-600 mt-4">
            Esqueceu sua senha? Entre em contato com o suporte.
          </p>
        )}
      </form>
    </div>
  );
};

export default LoginForm; 