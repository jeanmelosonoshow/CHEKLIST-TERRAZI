# Terrazi Fluxos

Primeira fase da plataforma responsiva de controle de processos e checklists. O projeto usa Next.js com TypeScript, PostgreSQL Neon, sessões server-side e Upstash Redis opcional para rate limiting distribuído.

## O que está pronto

- Login com credenciais sincronizadas do Firebird e compatibilidade com o MD5 lowercase do legado.
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

- Node.js 20 ou superior
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

A aplicação estará em `http://localhost:3000`. O primeiro acesso só funcionará depois da sincronização de usuários.

## Variáveis de ambiente

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sim | String PostgreSQL/Neon; prefira a URL com pool no Vercel. |
| `SYNC_API_TOKEN` | Sim | Bearer token exclusivo do agente Windows, mínimo 32 caracteres. |
| `UPSTASH_REDIS_REST_URL` | Recomendada | Endpoint REST do Redis. |
| `UPSTASH_REDIS_REST_TOKEN` | Recomendada | Token REST do Redis. |
| `NEXT_PUBLIC_APP_URL` | Não | URL pública usada por scripts. |

## Sincronização Firebird → Windows → Vercel/Neon

A Vercel não acessa o Firebird. Um agente na máquina Windows autorizada executa esta consulta, monta JSON e envia por HTTPS:

```sql
SELECT idfilial, categoria, idfuncionario, nomefuncionario, login, senha
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
