import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);

  // Debug para verificar o valor do contexto
  console.log('Auth Context:', context);

  if (!context) {
    console.error('AuthContext está undefined! Isso é um problema crucial.');
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
} 