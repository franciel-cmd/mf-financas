import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { FinancasProvider } from './context/FinancasContext'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <FinancasProvider>
        <App />
        <ToastContainer position="top-right" autoClose={3000} />
      </FinancasProvider>
    </HashRouter>
  </React.StrictMode>
) 