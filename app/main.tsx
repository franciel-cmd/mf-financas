import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { FinancasProvider } from './context/FinancasContext'
import { AuthProvider } from './context/AuthContext'
import { ToastContainer } from 'react-toastify'
// import { applySecurityHeaders } from './config/csp'
import 'react-toastify/dist/ReactToastify.css'
import './styles/global.css'

// Desativando CSP completamente durante debugging
// applySecurityHeaders();

// Handler global para capturar e mostrar erros não tratados
window.addEventListener('error', (event) => {
  console.error('Erro não tratado:', event.error);
});

// Handler para promessas não tratadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promessa não tratada:', event.reason);
});

// Monitorar requisições de rede
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch requisição:', args[0]);
  
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('Fetch resposta:', args[0], response.status, response.statusText);
      return response;
    })
    .catch(error => {
      console.error('Fetch erro:', args[0], error);
      // Adicionar mais informações de debug ao erro
      if (error.message === 'Failed to fetch') {
        console.error('Detalhes da requisição que falhou:', {
          url: args[0],
          options: args[1],
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'Não configurado',
          hasSupabaseKey: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY) ? 'Sim' : 'Não'
        });
      }
      throw error;
    });
};

// Componente para capturar erros em componentes React
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Atualiza o estado para que o próximo render mostre a UI alternativa
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Você também pode registrar o erro em um serviço de relatório de erros
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Você pode renderizar qualquer UI alternativa
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          backgroundColor: '#ffdddd', 
          border: '1px solid #ff0000',
          borderRadius: '5px'
        }}>
          <h2>Algo deu errado.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Detalhes do erro</summary>
            {this.state.error && this.state.error.toString()}
            <br />
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '15px',
              padding: '8px 15px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <AuthProvider>
            <FinancasProvider>
              <App />
              <ToastContainer position="top-right" autoClose={3000} />
            </FinancasProvider>
          </AuthProvider>
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>
  )
} catch (error) {
  console.error('Erro ao renderizar aplicação:', error);
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Erro ao carregar a aplicação. Verifique o console para mais detalhes.</div>';
} 