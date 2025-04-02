import React from 'react';
import { FiWifiOff, FiRefreshCw } from 'react-icons/fi';

interface OfflineAlertProps {
  fullWidth?: boolean;
  onReconnect?: () => void;
  error?: string;
}

const OfflineAlert: React.FC<OfflineAlertProps> = ({ 
  fullWidth = false, 
  onReconnect, 
  error 
}) => {
  const recarregarPagina = () => {
    window.location.reload();
  };

  const tentarReconectar = () => {
    if (onReconnect) {
      onReconnect();
    } else {
      recarregarPagina();
    }
  };

  return (
    <div className={`bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 shadow-sm ${fullWidth ? 'w-full' : ''}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">
          <FiWifiOff className="w-5 h-5 text-red-600" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">Problema de conexão detectado</h3>
          <div className="mt-1 text-sm">
            <p>
              {error || 'Não foi possível conectar com o servidor. Isso pode ser causado por um problema de DNS ou de rede.'}
            </p>
            <div className="mt-2">
              <h4 className="font-medium text-xs text-red-700 mb-1">Sugestões:</h4>
              <ul className="list-disc list-inside text-xs space-y-1 text-red-700">
                <li>Verifique se você está conectado à internet</li>
                <li>Tente usar um servidor DNS alternativo (1.1.1.1 ou 8.8.8.8)</li>
                <li>Limpe o cache do navegador ou tente outro navegador</li>
                <li>Desative qualquer VPN ou proxy que esteja utilizando</li>
              </ul>
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={tentarReconectar}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <FiRefreshCw className="mr-1.5 -ml-0.5 h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineAlert; 