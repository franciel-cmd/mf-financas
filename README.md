# MF - Finanças

Uma aplicação web para gerenciamento de contas a pagar, desenvolvida com React, TypeScript e Styled Components.

## Funcionalidades

- Dashboard com resumo financeiro
- Cadastro, edição e remoção de contas a pagar
- Filtros por status, categoria, mês e ano
- Marcação automática de contas vencidas
- Geração de relatórios em PDF e Excel
- Persistência de dados no localStorage

## Tecnologias Utilizadas

- React 18
- TypeScript
- Styled Components
- React Router
- date-fns
- jsPDF
- XLSX
- React Toastify
- UUID

## Como Executar

1. Clone o repositório
```bash
git clone [URL_DO_REPOSITÓRIO]
cd mf-financas
```

2. Instale as dependências
```bash
npm install
```

3. Execute o projeto
```bash
npm run dev
```

4. Acesse a aplicação pelo navegador
```
http://localhost:3000
```

## Estrutura do Projeto

- `/app/components`: Componentes reutilizáveis
- `/app/context`: Context API para gerenciamento de estado
- `/app/hooks`: Hooks personalizados
- `/app/pages`: Páginas da aplicação
- `/app/types`: Definições de tipos TypeScript

## Licença

Este projeto está sob a licença MIT. 
- Aplicativo móvel 