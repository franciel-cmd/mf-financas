import { useContext } from 'react';
import { FinancasContext } from '../context/FinancasContext';

export function useFinancas() {
  const context = useContext(FinancasContext);

  if (!context) {
    throw new Error('useFinancas deve ser usado dentro de um FinancasProvider');
  }

  return context;
} 