import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { debug, error as errorLog } from '../utils/logger';

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    errorLog('useAuth: contexto de autenticação não encontrado');
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  debug('useAuth: contexto de autenticação acessado', {
    autenticado: !!context.usuario,
    carregando: context.carregando,
    temErro: !!context.erro
  });

  return context;
};

export default useAuth; 