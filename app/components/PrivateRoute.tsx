import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import styled from 'styled-components';
import { FiLoader } from 'react-icons/fi';

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  flex-direction: column;
  gap: 1rem;
  background-color: var(--background);

  svg {
    animation: spin 1s linear infinite;
    color: var(--primary);
    font-size: 2rem;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.p`
  color: var(--text-secondary);
  font-size: 1rem;
`;

export default function PrivateRoute() {
  const { usuario, carregando } = useAuth();
  const isAuthenticated = !!usuario;

  if (carregando) {
    return (
      <LoadingContainer>
        <FiLoader size={32} />
        <LoadingText>Carregando...</LoadingText>
      </LoadingContainer>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
} 