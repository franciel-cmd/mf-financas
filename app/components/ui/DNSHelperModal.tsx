import React, { useState, useEffect } from 'react';
import { FiX, FiAlertTriangle, FiLifeBuoy, FiCopy, FiCheck } from 'react-icons/fi';
import { getInstrucoesDNS, getSolucoesAlternativas } from '../../utils/dnsResolver';

interface DNSHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  dominio: string;
}

const DNSHelperModal: React.FC<DNSHelperModalProps> = ({ isOpen, onClose, dominio }) => {
  const [copiado, setCopiado] = useState(false);
  const [activeTab, setActiveTab] = useState<'instrucoes' | 'alternativas'>('instrucoes');
  
  const instrucoesDNS = getInstrucoesDNS();
  const alternativas = getSolucoesAlternativas('supabase');
  
  useEffect(() => {
    // Reset estado ao abrir
    if (isOpen) {
      setCopiado(false);
      setActiveTab('instrucoes');
    }
  }, [isOpen]);
  
  const copiarInstrucoes = () => {
    navigator.clipboard.writeText(instrucoesDNS);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-red-50 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-red-800 flex items-center">
            <FiAlertTriangle className="mr-2" />
            Como resolver problemas de DNS
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <FiX size={24} />
          </button>
        </div>
        
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-sm text-yellow-800">
            <p>
              <strong>Problema detectado:</strong> Não foi possível resolver o nome do domínio <code>{dominio}</code>. 
              Isso geralmente é causado por um problema de configuração DNS na sua rede.
            </p>
          </div>
          
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'instrucoes' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('instrucoes')}
            >
              Instruções para configurar DNS
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'alternativas' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('alternativas')}
            >
              Soluções alternativas
            </button>
          </div>
          
          {activeTab === 'instrucoes' ? (
            <div>
              <p className="mb-4 text-gray-700">
                Alterar suas configurações de DNS para usar servidores mais confiáveis como o Cloudflare (1.1.1.1) 
                ou Google (8.8.8.8) geralmente resolve problemas de acesso a certos sites.
              </p>
              
              <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-4 whitespace-pre-line text-sm font-mono relative">
                {instrucoesDNS}
                <button
                  onClick={copiarInstrucoes}
                  className="absolute top-2 right-2 bg-white p-1 rounded border border-gray-200 hover:bg-gray-100"
                  title="Copiar instruções"
                >
                  {copiado ? <FiCheck className="text-green-500" /> : <FiCopy />}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-gray-700">
                Se não puder mudar suas configurações de DNS, aqui estão algumas alternativas para contornar o problema:
              </p>
              
              <ul className="list-disc pl-5 space-y-2 mb-4">
                {alternativas.map((solucao, index) => (
                  <li key={index} className="text-gray-700">{solucao}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <FiLifeBuoy className="mr-1" />
            Precisa de mais ajuda? Entre em contato com o suporte.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};

export default DNSHelperModal; 