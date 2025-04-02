/**
 * Utilitário para diagnóstico e resolução de problemas de DNS
 */

import { error as errorLog } from './logger';

/**
 * Função que retorna instruções específicas para resolver problemas de DNS
 * de acordo com o sistema operacional do usuário
 */
export const getInstrucoesDNS = (): string => {
  // Detectar sistema operacional
  const userAgent = navigator.userAgent.toLowerCase();
  const isWindows = userAgent.indexOf('windows') !== -1;
  const isMac = userAgent.indexOf('mac') !== -1;
  const isLinux = userAgent.indexOf('linux') !== -1;
  const isAndroid = userAgent.indexOf('android') !== -1;
  const isIOS = userAgent.indexOf('iphone') !== -1 || userAgent.indexOf('ipad') !== -1;

  if (isWindows) {
    return `
      Para configurar servidores DNS no Windows:
      1. Abra o Painel de Controle > Rede e Internet > Conexões de Rede
      2. Clique com o botão direito na conexão ativa e selecione Propriedades
      3. Selecione "Protocolo TCP/IP Versão 4" e clique em Propriedades
      4. Selecione "Usar os seguintes endereços de servidor DNS" e configure:
         • DNS Primário: 1.1.1.1 (Cloudflare)
         • DNS Secundário: 8.8.8.8 (Google)
      5. Clique em OK para salvar as alterações
      6. Reinicie seu navegador
    `;
  } else if (isMac) {
    return `
      Para configurar servidores DNS no macOS:
      1. Abra Preferências do Sistema > Rede
      2. Selecione sua conexão ativa à esquerda e clique em Avançado
      3. Vá para a aba DNS
      4. Clique no botão + e adicione estes servidores:
         • 1.1.1.1 (Cloudflare)
         • 8.8.8.8 (Google)
      5. Clique em OK e depois em Aplicar
      6. Reinicie seu navegador
    `;
  } else if (isLinux) {
    return `
      Para configurar servidores DNS no Linux (Ubuntu/Debian):
      1. Abra as Configurações > Rede
      2. Clique no ícone de engrenagem ao lado da sua conexão ativa
      3. Vá para a aba IPv4 ou IPv6
      4. Altere o método para "Automático (DHCP), apenas endereços"
      5. No campo Servidores DNS, adicione: 1.1.1.1, 8.8.8.8
      6. Clique em Aplicar e reinicie sua conexão
    `;
  } else if (isAndroid) {
    return `
      Para configurar servidores DNS no Android:
      1. Vá para Configurações > Redes e Internet > WiFi
      2. Pressione longamente sua rede WiFi e selecione Modificar rede
      3. Marque a opção "Avançado"
      4. Mude IP de "DHCP" para "Estático"
      5. Role para baixo e adicione estes servidores DNS:
         • DNS 1: 1.1.1.1
         • DNS 2: 8.8.8.8
      6. Salve as alterações

      Alternativa: Instale o aplicativo "1.1.1.1" da Cloudflare na Play Store.
    `;
  } else if (isIOS) {
    return `
      Para configurar servidores DNS no iOS:
      1. Vá para Ajustes > Wi-Fi
      2. Toque no "i" ao lado da sua rede conectada
      3. Role para baixo e toque em "Configurar DNS"
      4. Selecione "Manual" e adicione estes servidores:
         • 1.1.1.1
         • 8.8.8.8
      5. Toque em Salvar

      Alternativa: Instale o aplicativo "1.1.1.1" da Cloudflare na App Store.
    `;
  } else {
    return `
      Para resolver problemas de DNS, configure servidores DNS alternativos:
      • Use os servidores DNS da Cloudflare (1.1.1.1) ou Google (8.8.8.8)
      • Procure instruções específicas para seu dispositivo em "como mudar DNS"
      • Considere usar o aplicativo 1.1.1.1 da Cloudflare se disponível
      • Verifique se seu provedor de internet está bloqueando o acesso
    `;
  }
};

/**
 * Verifica se existe algum problema conhecido com determinado domínio
 */
export const verificarDominioProblematico = (dominio: string): { problema: boolean, mensagem: string } => {
  // Lista de problemas comuns conhecidos
  const problemasDominiosConhecidos: Record<string, string> = {
    'jtsbmolnhlrpyxccwpul.supabase.co': 'O domínio do Supabase pode enfrentar problemas de resolução DNS com alguns provedores de internet.',
    'api.supabase.io': 'O domínio da API Supabase pode estar temporariamente inacessível ou bloqueado por alguns provedores.'
  };

  if (dominio in problemasDominiosConhecidos) {
    return {
      problema: true,
      mensagem: problemasDominiosConhecidos[dominio]
    };
  }

  return {
    problema: false,
    mensagem: ''
  };
};

/**
 * Sugere alternativas para acessar o serviço quando há problemas de DNS
 */
export const getSolucoesAlternativas = (servico: string): string[] => {
  const solucoes: Record<string, string[]> = {
    'supabase': [
      'Use uma conexão de rede diferente (tente dados móveis em vez de Wi-Fi)',
      'Desative temporariamente qualquer VPN ou proxy que esteja utilizando',
      'Limpe o cache do seu navegador ou tente um navegador diferente',
      'Tente acessar o aplicativo mais tarde quando o problema de DNS for resolvido',
      'Entre em contato com seu provedor de internet se o problema persistir'
    ],
    'default': [
      'Verifique sua conexão de internet',
      'Reinicie seu roteador/modem',
      'Tente usar uma VPN para acessar o serviço',
      'Verifique se o serviço está funcionando em sites como downdetector.com',
      'Aguarde alguns minutos e tente novamente'
    ]
  };

  return solucoes[servico] || solucoes['default'];
};

/**
 * Testa a conectividade DNS básica do navegador
 * Retorna true se estiver funcionando adequadamente
 */
export const testarDNSBrowser = async (): Promise<boolean> => {
  try {
    const sitesConhecidos = [
      'www.google.com',
      'www.cloudflare.com',
      'www.microsoft.com'
    ];
    
    let sucessos = 0;
    
    for (const site of sitesConhecidos) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        
        await fetch(`https://${site}/favicon.ico`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeout);
        sucessos++;
      } catch (err) {
        // Ignorar erros individuais
      }
    }
    
    // Se pelo menos dois sites estiverem acessíveis, DNS provavelmente está OK
    return sucessos >= 2;
  } catch (error) {
    errorLog('Erro ao testar DNS no navegador', error);
    return false;
  }
};

/**
 * Retorna o diagnóstico geral do problema de DNS
 */
export const diagnosticarProblemasDNS = async (dominio: string): Promise<{
  dnsGeral: boolean;
  dnsEspecifico: boolean;
  instrucoes: string;
  alternativas: string[];
}> => {
  try {
    // Verificar se DNS está funcionando em geral
    const dnsGeral = await testarDNSBrowser();
    
    // Tentar acessar especificamente o domínio com problema
    let dnsEspecifico = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      await fetch(`https://${dominio}/favicon.ico`, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeout);
      dnsEspecifico = true;
    } catch (err) {
      // Se falhar, o domínio específico tem problema
      dnsEspecifico = false;
    }
    
    return {
      dnsGeral,
      dnsEspecifico,
      instrucoes: getInstrucoesDNS(),
      alternativas: getSolucoesAlternativas(dominio.includes('supabase') ? 'supabase' : 'default')
    };
  } catch (error) {
    errorLog('Erro ao diagnosticar problemas de DNS', error);
    return {
      dnsGeral: false,
      dnsEspecifico: false,
      instrucoes: getInstrucoesDNS(),
      alternativas: getSolucoesAlternativas('default')
    };
  }
}; 