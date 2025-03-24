import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FiMail, FiLock, FiLogIn, FiUser } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';

const LoginContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--background);
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const LoginBanner = styled.div`
  flex: 1;
  background-color: var(--primary);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const BannerTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const BannerText = styled.p`
  font-size: 1.1rem;
  text-align: center;
  margin-bottom: 2rem;
  max-width: 500px;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const LoginFormContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const Logo = styled.div`
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--primary);
  margin-bottom: 2.5rem;
  text-align: center;
`;

const LoginForm = styled.form`
  width: 100%;
  max-width: 400px;
`;

const FormTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
`;

const InputGroup = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  overflow: hidden;
  
  &:focus-within {
    border-color: var(--primary);
  }
  
  svg {
    margin: 0 0.75rem;
    color: var(--text-secondary);
  }
`;

const FormInput = styled.input`
  flex: 1;
  padding: 0.75rem;
  border: none;
  outline: none;
  font-size: 1rem;
  color: var(--text-primary);
`;

const FormButton = styled.button`
  width: 100%;
  padding: 0.85rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  
  &:hover {
    background-color: var(--primary-dark);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  svg {
    margin-right: 0.5rem;
  }
`;

const FormFooter = styled.div`
  margin-top: 1.5rem;
  text-align: center;
  color: var(--text-secondary);
  
  a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ErrorMessage = styled.div`
  color: var(--error);
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const FormToggle = styled.div`
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 2rem;
`;

const ToggleButton = styled.button<{ active: boolean }>`
  background: none;
  border: none;
  font-size: 1rem;
  color: ${props => props.active ? 'var(--primary)' : 'var(--text-secondary)'};
  position: relative;
  cursor: pointer;
  padding-bottom: 0.5rem;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--primary);
    transform: scaleX(${props => props.active ? 1 : 0});
    transition: transform 0.3s;
  }
`;

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, cadastrar } = useAuth();
  const navigate = useNavigate();
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'E-mail inválido';
    }
    
    if (!senha) {
      newErrors.senha = 'Senha é obrigatória';
    } else if (senha.length < 6) {
      newErrors.senha = 'A senha deve ter pelo menos 6 caracteres';
    }
    
    if (!isLogin) {
      if (!nome) {
        newErrors.nome = 'Nome é obrigatório';
      }
      
      if (senha !== confirmaSenha) {
        newErrors.confirmaSenha = 'As senhas não conferem';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let success;
      
      if (isLogin) {
        success = await login({ email, senha });
      } else {
        success = await cadastrar(nome, email, senha, confirmaSenha);
      }
      
      if (success) {
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <LoginContainer>
      <LoginBanner>
        <BannerTitle>MF - Finanças</BannerTitle>
        <BannerText>
          Gerencie suas contas com facilidade e tenha controle total sobre suas finanças pessoais.
        </BannerText>
      </LoginBanner>
      
      <LoginFormContainer>
        <Logo>MF - Finanças</Logo>
        
        <LoginForm onSubmit={handleSubmit}>
          <FormToggle>
            <ToggleButton 
              type="button"
              active={isLogin}
              onClick={() => setIsLogin(true)}
            >
              Login
            </ToggleButton>
            <ToggleButton 
              type="button"
              active={!isLogin}
              onClick={() => setIsLogin(false)}
            >
              Cadastrar
            </ToggleButton>
          </FormToggle>
          
          <FormTitle>{isLogin ? 'Faça seu login' : 'Crie sua conta'}</FormTitle>
          
          {!isLogin && (
            <FormGroup>
              <FormLabel htmlFor="nome">Nome</FormLabel>
              <InputGroup>
                <FiUser />
                <FormInput
                  id="nome"
                  type="text"
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                />
              </InputGroup>
              {errors.nome && <ErrorMessage>{errors.nome}</ErrorMessage>}
            </FormGroup>
          )}
          
          <FormGroup>
            <FormLabel htmlFor="email">E-mail</FormLabel>
            <InputGroup>
              <FiMail />
              <FormInput
                id="email"
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </InputGroup>
            {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
          </FormGroup>
          
          <FormGroup>
            <FormLabel htmlFor="senha">Senha</FormLabel>
            <InputGroup>
              <FiLock />
              <FormInput
                id="senha"
                type="password"
                placeholder="Sua senha"
                value={senha}
                onChange={e => setSenha(e.target.value)}
              />
            </InputGroup>
            {errors.senha && <ErrorMessage>{errors.senha}</ErrorMessage>}
          </FormGroup>
          
          {!isLogin && (
            <FormGroup>
              <FormLabel htmlFor="confirmaSenha">Confirme sua senha</FormLabel>
              <InputGroup>
                <FiLock />
                <FormInput
                  id="confirmaSenha"
                  type="password"
                  placeholder="Confirme sua senha"
                  value={confirmaSenha}
                  onChange={e => setConfirmaSenha(e.target.value)}
                />
              </InputGroup>
              {errors.confirmaSenha && <ErrorMessage>{errors.confirmaSenha}</ErrorMessage>}
            </FormGroup>
          )}
          
          <FormButton type="submit" disabled={isSubmitting}>
            <FiLogIn size={18} />
            {isSubmitting 
              ? 'Carregando...' 
              : isLogin ? 'Entrar' : 'Cadastrar'}
          </FormButton>
          
          {isLogin && (
            <FormFooter>
              Não tem uma conta? <Link to="/login" onClick={(e) => { e.preventDefault(); setIsLogin(false); }}>Cadastre-se</Link>
            </FormFooter>
          )}
          
          {!isLogin && (
            <FormFooter>
              Já tem uma conta? <Link to="/login" onClick={(e) => { e.preventDefault(); setIsLogin(true); }}>Faça login</Link>
            </FormFooter>
          )}
        </LoginForm>
      </LoginFormContainer>
    </LoginContainer>
  );
} 