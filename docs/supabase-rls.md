# Políticas de Segurança (RLS) do Supabase

Este documento descreve as políticas de Row Level Security (RLS) que devem ser aplicadas nas tabelas do Supabase para garantir que os usuários só possam acessar seus próprios dados.

## Tabela `contas`

```sql
-- Habilitar RLS na tabela contas
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários só podem ver suas próprias contas
CREATE POLICY "Usuários podem ver suas próprias contas" 
ON contas FOR SELECT 
USING (auth.uid() = usuario_id);

-- Política para INSERT: usuários só podem inserir contas para si mesmos
CREATE POLICY "Usuários podem inserir suas próprias contas" 
ON contas FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);

-- Política para UPDATE: usuários só podem atualizar suas próprias contas
CREATE POLICY "Usuários podem atualizar suas próprias contas" 
ON contas FOR UPDATE 
USING (auth.uid() = usuario_id);

-- Política para DELETE: usuários só podem excluir suas próprias contas
CREATE POLICY "Usuários podem excluir suas próprias contas" 
ON contas FOR DELETE 
USING (auth.uid() = usuario_id);
```

## Tabela `usuarios`

```sql
-- Habilitar RLS na tabela usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários podem ver apenas seu próprio perfil
CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON usuarios FOR SELECT 
USING (auth.uid() = id);

-- Política para INSERT: permitir apenas durante o registro (controlado pela lógica da aplicação)
CREATE POLICY "Controle de inserção de perfil" 
ON usuarios FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Política para UPDATE: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
ON usuarios FOR UPDATE 
USING (auth.uid() = id);

-- Nota: Não permitimos exclusão de usuários pela política RLS
```

## Como aplicar

1. Acesse o Dashboard do Supabase
2. Vá para a seção "SQL Editor"
3. Cole os comandos SQL acima e execute
4. Verifique na seção "Authentication > Policies" se as políticas foram aplicadas corretamente

Essas políticas garantem que cada usuário tenha acesso apenas aos seus próprios dados, independentemente de qualquer falha na lógica da aplicação. 