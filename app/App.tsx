import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { toast } from 'react-toastify';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import { FiLoader } from 'react-icons/fi';

// Lazy loading para os componentes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Contas = lazy(() => import('./pages/Contas'));
const ContasEmAberto = lazy(() => import('./pages/ContasEmAberto'));
const ContasPagas = lazy(() => import('./pages/ContasPagas'));
const ContasVencidas = lazy(() => import('./pages/ContasVencidas'));
const CadastrarConta = lazy(() => import('./pages/CadastrarConta'));
const EditarConta = lazy(() => import('./pages/EditarConta'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const Login = lazy(() => import('./pages/Login'));

// Componente de loading
const Loading = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '2rem' }} />
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

function App() {
  const location = useLocation();

  // Limpar todas as notificações toast quando a rota mudar
  useEffect(() => {
    toast.dismiss();
  }, [location.pathname]);

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        
        {/* Rotas protegidas */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="contas">
              <Route index element={<Contas />} />
              <Route path="em-aberto" element={<ContasEmAberto />} />
              <Route path="pagas" element={<ContasPagas />} />
              <Route path="vencidas" element={<ContasVencidas />} />
              <Route path="cadastrar" element={<CadastrarConta />} />
              <Route path="editar/:id" element={<EditarConta />} />
            </Route>
            <Route path="relatorios" element={<Relatorios />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App; 