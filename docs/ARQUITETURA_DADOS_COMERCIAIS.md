# Arquitetura dos dados comerciais

## Decisão

O SonoShowGateway é a origem direta e oficial para:

- autenticação dos funcionários;
- consulta de vendas;
- consulta de clientes;
- demais dados mestres do ERP necessários ao fluxo comercial.

A aplicação não acessa o banco Firebird diretamente. Todas as consultas ao ERP passam pelo Gateway HTTPS com token de projeto, assinatura HMAC, timestamp e nonce.

## Responsabilidade de cada camada

### Firebird via SonoShowGateway

- credenciais e situação do funcionário;
- cadastro oficial de clientes;
- dados oficiais das vendas;
- filial, vendedor, produtos e demais referências originadas no ERP.

### PostgreSQL da aplicação

- sessões da aplicação;
- permissões por categoria;
- configurações e versões de checklists;
- respostas dos checklists;
- responsáveis, tarefas e próximas ações do follow-up;
- agenda, alertas e histórico de notificações;
- histórico de etapas e auditoria operacional;
- referências externas necessárias para relacionar registros ao ERP.

O PostgreSQL não passa a ser a origem oficial de vendas ou clientes. Se um read model ou cache for introduzido por desempenho, cada registro deverá manter a chave externa do ERP, o momento da consulta e uma política explícita de atualização.

## Contrato pendente antes do P1

As consultas de vendas e clientes devem ser criadas somente depois de confirmar no Firebird:

1. tabelas ou views autorizadas pelo Gateway;
2. chave imutável de venda, incluindo filial quando necessário;
3. chave imutável de cliente;
4. campos de status, vendedor, valores e datas;
5. regras para cancelamento e exclusão lógica;
6. paginação, filtros incrementais e volume esperado;
7. política de autorização das consultas no SonoShowGateway.

Até essa confirmação, não devem ser inventados nomes de tabelas, joins ou códigos de status do ERP.

## Fluxo previsto

1. O usuário autentica pela consulta direta ao SonoShowGateway.
2. A aplicação mantém apenas a sessão e os metadados necessários no PostgreSQL.
3. Telas comerciais consultam vendas e clientes pelo SonoShowGateway usando serviços server-side.
4. O acompanhamento criado na aplicação referencia as chaves oficiais retornadas pelo ERP.
5. Checklists, tarefas, etapas, agenda e alertas são persistidos no PostgreSQL.
6. Relatórios combinam os dados oficiais consultados do ERP com o histórico operacional da aplicação.

## Compatibilidade

As APIs de sincronização em lote existentes permanecem disponíveis para contingência e fontes auxiliares. Elas não são o caminho principal para autenticação, vendas ou clientes.
