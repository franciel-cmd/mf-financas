import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Contas from './pages/Contas';
import ContasEmAberto from './pages/ContasEmAberto';
import ContasPagas from './pages/ContasPagas';
import ContasVencidas from './pages/ContasVencidas';
import CadastrarConta from './pages/CadastrarConta';
import EditarConta from './pages/EditarConta';
import Relatorios from './pages/Relatorios';

function App() {
  return (
    <Routes>
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
    </Routes>
  );
}

export default App; 