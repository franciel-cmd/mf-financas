import React from 'react';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';
import { useFinancas } from '../hooks/useFinancas';
import { Button } from './ui';

interface ExportacaoButtonsProps {
  className?: string;
}

export function ExportacaoButtons({ className = '' }: ExportacaoButtonsProps) {
  const { exportarParaExcel, exportarParaPDF, loading } = useFinancas();

  return (
    <div className={`flex space-x-2 ${className}`}>
      <Button
        color="success"
        onClick={exportarParaExcel}
        disabled={loading}
        className="flex items-center space-x-1"
      >
        <FaFileExcel />
        <span>Excel</span>
      </Button>
      
      <Button
        color="danger"
        onClick={exportarParaPDF}
        disabled={loading}
        className="flex items-center space-x-1"
      >
        <FaFilePdf />
        <span>PDF</span>
      </Button>
    </div>
  );
} 