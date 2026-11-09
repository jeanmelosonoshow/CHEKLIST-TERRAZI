# Terrazi Fluxos

Primeira fase da plataforma responsiva de controle de processos e checklists. O projeto usa Next.js com TypeScript, PostgreSQL Neon, sessões server-side e Upstash Redis opcional para rate limiting distribuído.

O SonoShowGateway é a origem direta da autenticação e dos dados oficiais de vendas e clientes. O PostgreSQL armazena o estado operacional criado pela aplicação — permissões, sessões, checklists, follow-ups, agenda, alertas e histórico — sem substituir o Firebird como sistema de origem. Consulte `docs/ARQUITETURA_DADOS_COMERCIAIS.md`.

## O que está pronto

- Login validado em tempo real no Firebird por meio do Gateway HTTPS assinado, com compatibilidade com o MD5 lowercase do legado.
- Senha e hash nunca são enviados ao navegador; a comparação acontece somente no servidor.
- Sessões opacas, revogáveis e armazenadas no PostgreSQL, entregues em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Controle de acesso por categoria, com negação por padrão e acesso total reservado ao funcionário `752`.
- Configuração administrativa das permissões de dashboard, visualização, inclusão e edição de checklists e relatórios.
- Criação de checklists em rascunho com campos de texto, número, data, sim/não e seleções.
- Edição protegida de checklists, permitida somente para usuários autorizados e enquanto o status for rascunho.
- Modelo para opções manuais e para seleções alimentadas por fontes sincronizadas.
- APIs autenticadas para sincronizar funcionários e futuras tabelas/consultas do Firebird.
- Registro de execuções e rate limiting via Upstash Redis, com fallback local em desenvolvimento.

## Requisitos e instalação local

- Node.js 20.19 ou superior
- PostgreSQL (Neon recomendado)
- Upstash Redis opcional em desenvolvimento e recomendado em produção

```bash
npm install
```

Copie `.env.example` para `.env.local`, preencha as variáveis e gere um `SYNC_API_TOKEN` com pelo menos 32 caracteres aleatórios. Depois:

```bash
npm run db:migrate
npm run dev
```

A aplicação estará em `http://localhost:3000`. No primeiro login válido, o usuário retornado pelo Gateway é criado ou atualizado no Neon automaticamente. O endpoint `GET /api/health` verifica PostgreSQL, SonoShowGateway e, quando configurado, Redis; ele responde `503` se uma dependência necessária estiver indisponível.

## Variáveis de ambiente

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sim | String PostgreSQL/Neon; prefira a URL com pool no Vercel. |
| `FIREBIRD_GATEWAY_URL` | Sim | URL pública do Gateway, por exemplo `https://gateway.jgmelo.company`. |
| `FIREBIRD_GATEWAY_TOKEN_ID` | Sim | Identificador do token exclusivo deste projeto. |
| `FIREBIRD_GATEWAY_HMAC_SECRET` | Sim | Segredo HMAC do token; mantenha somente nas variáveis server-side. |
| `SYNC_API_TOKEN` | Sim | Bearer token exclusivo do agente Windows, mínimo 32 caracteres. |
| `UPSTASH_REDIS_REST_URL` | Recomendada | Endpoint REST do Redis. |
| `UPSTASH_REDIS_REST_TOKEN` | Recomendada | Token REST do Redis. |
| `NEXT_PUBLIC_APP_URL` | Não | URL pública usada por scripts. |

## Autenticação Firebird via Gateway

O endpoint de login envia ao Gateway uma consulta parametrizada e assinada por HMAC. A senha informada é convertida para o hash MD5 legado antes da consulta; a senha em texto puro e o segredo HMAC nunca são enviados ao navegador nem gravados em logs. Configure as três variáveis `FIREBIRD_GATEWAY_*` na Vercel para os ambientes desejados.

No TS, crie um token exclusivo para este projeto e copie o identificador e o segredo exibidos para a Vercel:

```powershell
.\SonoShowGateway.exe token-create checklist-terrazi --rate-limit 300
```

Após o deploy, confirme primeiro a saúde do túnel com `https://gateway.jgmelo.company/health` e depois teste o login da aplicação. Um login válido também atualiza filial, categoria, nome, hash e status do funcionário no Neon, preservando sessões, permissões e os demais dados do sistema.

## Sincronização em lote (compatibilidade)

O endpoint existente de sincronização em lote foi preservado para cargas administrativas ou contingência. Ele não substitui o acesso direto ao SonoShowGateway para login, vendas e clientes. Um agente pode executar esta consulta, montar JSON e enviar por HTTPS:

```sql
SELECT idfilial, categoria, idfuncionario, nomefuncionario, login, senhaweb AS senha
FROM funcionario
WHERE status = 'A';
```

Envie o resultado para `POST /api/sync/users`, com o header `Authorization: Bearer SEU_SYNC_API_TOKEN`:

```json
{
  "fullSnapshot": true,
  "sourceTimestamp": "2026-09-22T18:00:00.000Z",
  "users": [
    {
      "idfilial": 1,
      "categoria": "ADMINISTRATIVO",
      "idfuncionario": 752,
      "nomefuncionario": "Administrador",
      "login": "admin",
      "senha": "md5_lowercase_vindo_do_firebird"
    }
  ]
}
```

`fullSnapshot: true` desativa no Neon os usuários que não vieram no lote; use `false` para cargas parciais. O funcionário `752` recebe o perfil administrativo no servidor.

### Futuras consultas/tabelas

Para listas como filiais, setores ou produtos, use `POST /api/sync/sources/{sourceKey}` com o mesmo Bearer token:

```json
{
  "label": "Setores",
  "description": "Setores ativos do ERP",
  "schema": { "id": "number", "nome": "string" },
  "fullSnapshot": true,
  "records": [
    {
      "externalId": "10",
      "label": "Expedição",
      "data": { "id": 10, "nome": "Expedição" }
    }
  ]
}
```

O `sourceKey` aceita letras minúsculas, números, hífen e sublinhado. As fontes aparecem no construtor de campos de seleção.

## Banco e migrations

- Schema tipado: `src/db/schema.ts`
- Migration inicial: `drizzle/0000_initial.sql`
- Gerar nova migration: `npm run db:generate`
- Aplicar migrations: `npm run db:migrate`
- Inspecionar dados: `npm run db:studio`

A migration `0003_permissoes_categoria.sql` cria a tabela `permissoes_categoria`. Após aplicá-la, todas as categorias começam sem permissões; o administrador deve configurá-las em **Permissões**. O funcionário `752` não depende dessa tabela e mantém acesso total pela regra central da aplicação.

A migration `0004_codigos_humanos.sql` adiciona códigos numéricos gerados automaticamente para checklists, campos e respostas. Os UUIDs continuam sendo as chaves técnicas e os códigos são apresentados no formato legível `CHK-000001`, `CMP-000001` e `RSP-000001`.

A migration `0007_cenarios_dashboard.sql` cria os cenários configuráveis do dashboard e seu histórico de versões. O administrador pode acessar **Configurar painel**, escolher indicador, barras, rosca ou tabela, testar uma consulta Firebird e cadastrar uma consulta de detalhe aberta pelo clique. O SQL fica somente no PostgreSQL e é executado no servidor pelo SonoShowGateway. As consultas aceitam `:idfilial`, `:idfuncionario`, `:categoria`, `:detalhe_valor`, `:detalhe_campo` e `:detalhe_serie`; esses valores são sempre enviados como parâmetros, nunca concatenados ao SQL.

A migration `0008_formatos_dashboard.sql` adiciona formatos independentes para rótulos e valores dos cenários: texto, inteiro, decimal, Real, percentual, data curta, data por extenso, data e hora, mês/ano, nome do mês e dia da semana. A transformação é somente visual; o valor original continua sendo usado nos parâmetros do detalhamento.

A migration `0009_formatos_colunas_dashboard.sql` adiciona regras de formato por coluna ou alias. Cada regra pode valer para a tabela principal, para o detalhamento ou para ambos, permitindo que uma mesma consulta apresente múltiplas dimensões, moedas, quantidades e datas com formatos independentes.

A migration `0010_execucao_checklists_fontes.sql` adiciona publicação e execução operacional dos checklists, identificadas por códigos `EXE-000001`. Cada execução é vinculada à filial e à venda, permanece pendente ou em andamento até a conclusão dos campos obrigatórios e conserva um histórico de eventos. Os campos de seleção podem reutilizar fontes sincronizadas ou usar listas estáticas e consultas somente de leitura no PostgreSQL ou no Firebird via SonoShowGateway.

A migration `0011_fluxos_condicionais_checklist.sql` adiciona o motor de fluxos inteligentes. O construtor desktop combina blocos de início, pergunta, decisão automática, ação, observação e encerramento, ligados por conectores condicionais. A execução mostra apenas a etapa atual, registra respostas e decisões no PostgreSQL e encerra com resultado de sucesso ou sem sucesso. Decisões automáticas podem consultar Firebird ou PostgreSQL usando `:idfilial`, `:numero_venda`, `:idfuncionario` e `:categoria`.

A migration `0012_validacao_inicial_venda.sql` adiciona comparações numéricas aos conectores (`>`, `>=`, `<` e `<=`) e o mapeamento opcional do nome do cliente retornado pela consulta. O bloco inicial pode executar uma consulta antes de criar a demanda; se nenhuma condição de aprovação corresponder ao resultado, nenhuma execução é gravada. Isso permite validar filial e número da saída com `QTDE > 0` e obter o cliente diretamente do banco.

A migration `0013_revisoes_checklist.sql` separa os estados revogado e arquivado e registra a origem/versão dos modelos. A ação **Revisar** revoga o publicado e cria atomicamente um novo rascunho editável; **Clonar** mantém o original e cria uma cópia em rascunho; **Arquivar** é uma ação independente. O construtor também permite simular rascunhos com filial e número da saída sem criar registros de execução, respostas ou eventos no PostgreSQL.

A migration `0014_itens_venda_fluxo.sql` permite mapear, no bloco inicial, os aliases de código, descrição e quantidade dos produtos retornados pela validação da venda. A execução conserva essa fotografia dos itens junto da demanda e também guarda a resposta parcial da etapa atual quando o usuário escolhe **Salvar e sair**. A simulação mantém o mesmo progresso apenas no navegador e continua sem gravar dados operacionais no PostgreSQL.

A migration `0015_portas_conexoes_fluxo.sql` adiciona portas independentes de origem e destino aos conectores. O construtor permite escolher ou arrastar diretamente no gráfico se cada seta sai ou entra pelo topo, direita, base ou esquerda do bloco, além de oferecer uma área ampliada com zoom e deslocamento pelo fundo do canvas.

A seção **Etapas** possui permissão própria por categoria e um painel responsivo preparado para apresentar uma linha por filial, venda e cliente. O molde inicial contém Separação, Desmontagem, Impermeabilização, Entrega e Montagem. A persistência operacional ficará desacoplada até que a origem dos selects e a estratégia de salvamento sejam definidas.

O MD5 existe apenas por compatibilidade e não é adequado para novas senhas. Uma fase futura pode migrar gradualmente para Argon2/bcrypt quando a sincronização não sobrescrever mais o valor.

## Verificações

```bash
npm run lint
npm test
npm run build
```

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Conecte o Neon ou adicione `DATABASE_URL`.
3. Configure `SYNC_API_TOKEN` e as variáveis do Upstash.
4. Execute `npm run db:migrate` contra produção antes do primeiro acesso.
5. Faça o deploy. O endpoint de saúde é `GET /api/health`.

Nunca coloque `.env.local`, connection strings, tokens ou dumps do Firebird no Git.


Deployment atualizado para validar a API de sincronização.
