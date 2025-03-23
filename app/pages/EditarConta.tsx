import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { format, parseISO } from 'date-fns';
import { FiSave, FiArrowLeft, FiTrash2 } from 'react-icons/fi';
import { useFinancas } from '../hooks/useFinancas';
import { Conta, CategoriaConta } from '../types';

const FormContainer = styled.div`
  background-color: var(--surface);
  border-radius: 0.5rem;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const FormHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  h1 {
    font-size: 1.5rem;
    color: var(--text-primary);
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
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

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  font-size: 1rem;
  background-color: var(--surface);
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
`;

const FormActionButtons = styled.div`
  display: flex;
  gap: 1rem;
`;

export default function EditarConta() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contas, atualizarConta, removerConta } = useFinancas();
  
  const [formData, setFormData] = useState({
    nome: '',
    valor: '',
    dataVencimento: '',
    categoria: 'fixa' as CategoriaConta,
    observacoes: ''
  });
  
  useEffect(() => {
    if (id) {
      const conta = contas.find(c => c.id === id);
      
      if (conta) {
        setFormData({
          nome: conta.nome,
          valor: conta.valor.toString(),
          dataVencimento: format(parseISO(conta.dataVencimento), 'yyyy-MM-dd'),
          categoria: conta.categoria,
          observacoes: conta.observacoes || ''
        });
      } else {
        // Conta não encontrada, redirecionar
        navigate('/contas');
      }
    }
  }, [id, contas, navigate]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulário
    if (!formData.nome.trim()) {
      alert('O nome da conta é obrigatório');
      return;
    }
    
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      alert('Informe um valor válido para a conta');
      return;
    }
    
    // Atualizar conta
    if (id) {
      atualizarConta(id, {
        nome: formData.nome,
        valor: parseFloat(formData.valor),
        dataVencimento: new Date(formData.dataVencimento).toISOString(),
        categoria: formData.categoria,
        observacoes: formData.observacoes || undefined
      });
      
      // Redirecionar para lista de contas
      navigate('/contas');
    }
  };
  
  const handleRemover = () => {
    if (id && window.confirm('Tem certeza que deseja remover esta conta?')) {
      removerConta(id);
      navigate('/contas');
    }
  };
  
  return (
    <div>
      <FormHeader>
        <h1>Editar Conta</h1>
        <button 
          className="btn btn-outline"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft size={18} style={{ marginRight: '0.5rem' }} />
          Voltar
        </button>
      </FormHeader>
      
      <FormContainer>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <FormGroup>
              <FormLabel htmlFor="nome">Nome da Conta*</FormLabel>
              <FormInput
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: Conta de Luz"
                required
              />
            </FormGroup>
            
            <FormGroup>
              <FormLabel htmlFor="valor">Valor*</FormLabel>
              <FormInput
                type="number"
                id="valor"
                name="valor"
                value={formData.valor}
                onChange={handleChange}
                placeholder="0,00"
                step="0.01"
                min="0.01"
                required
              />
            </FormGroup>
            
            <FormGroup>
              <FormLabel htmlFor="dataVencimento">Data de Vencimento*</FormLabel>
              <FormInput
                type="date"
                id="dataVencimento"
                name="dataVencimento"
                value={formData.dataVencimento}
                onChange={handleChange}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <FormLabel htmlFor="categoria">Categoria*</FormLabel>
              <FormSelect
                id="categoria"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                required
              >
                <option value="fixa">Despesa Fixa</option>
                <option value="variavel">Despesa Variável</option>
                <option value="cartao">Cartão de Crédito</option>
                <option value="imposto">Imposto</option>
                <option value="outro">Outro</option>
              </FormSelect>
            </FormGroup>
          </FormGrid>
          
          <FormGroup>
            <FormLabel htmlFor="observacoes">Observações</FormLabel>
            <FormTextarea
              id="observacoes"
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              placeholder="Observações sobre esta conta (opcional)"
            />
          </FormGroup>
          
          <FormActions>
            <button 
              type="button" 
              className="btn btn-danger"
              onClick={handleRemover}
            >
              <FiTrash2 size={18} style={{ marginRight: '0.5rem' }} />
              Remover Conta
            </button>
            
            <FormActionButtons>
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => navigate('/contas')}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
              >
                <FiSave size={18} style={{ marginRight: '0.5rem' }} />
                Salvar Alterações
              </button>
            </FormActionButtons>
          </FormActions>
        </form>
      </FormContainer>
    </div>
  );
} 