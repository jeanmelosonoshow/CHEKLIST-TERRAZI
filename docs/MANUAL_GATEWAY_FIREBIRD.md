# Manual rápido — Firebird Gateway

## 1. Para que serve

O Firebird Gateway permite que aplicações hospedadas na Vercel consultem o Firebird sem expor o banco, a porta `3050` ou a rede interna na internet.

O fluxo é:

```text
Aplicação na Vercel
  → HTTPS + token + assinatura HMAC
Cloudflare Tunnel
  → http://127.0.0.1:8787
Gateway no servidor TS
  → Firebird
```

O Gateway aceita apenas consultas permitidas pela política de segurança. Cada projeto deve possuir seu próprio token, para que possa ser auditado, limitado ou revogado sem afetar os outros projetos.

## 2. Pré-requisitos

- Servidor TS com acesso ao Firebird.
- `SonoShowGateway.exe` de 64 bits.
- Usuário Firebird com as permissões mínimas necessárias, preferencialmente somente leitura.
- Cloudflare Tunnel apontando o endereço público para `http://127.0.0.1:8787`.
- Acesso de administrador ao Windows para instalar o serviço.
- Acesso às configurações do projeto na Vercel.

Não abra as portas `3050` ou `8787` no roteador ou firewall externo. O Gateway deve continuar ouvindo somente em `127.0.0.1`.

## 3. Instalação no servidor TS

Crie uma pasta permanente e coloque o executável nela. Exemplo:

```text
C:\Users\jean.melo\Gateway\SonoShowGateway.exe
```

Abra o PowerShell como administrador:

```powershell
cd C:\Users\jean.melo\Gateway
.\SonoShowGateway.exe configure
```

Na tela de configuração, informe:

1. Host e porta do Firebird.
2. Caminho ou alias do banco.
3. Usuário e senha do Firebird.
4. Charset utilizado pelo banco.
5. Host local `127.0.0.1` e porta `8787` para a API.

Salve e use **Testar conexão**. As configurações ficam em `C:\ProgramData\SonoShowGateway`; os segredos são protegidos pelo Windows e não ficam gravados em texto puro.

Também é possível confirmar a conexão e executar uma consulta segura de diagnóstico pelo PowerShell:

```powershell
.\SonoShowGateway.exe test-connection
.\SonoShowGateway.exe test-query
```

O resultado esperado de `test-query` contém:

```json
{
  "success": true,
  "rows": [{ "OK": 1 }]
}
```

## 4. Executar e instalar como serviço

Para um teste em primeiro plano:

```powershell
.\SonoShowGateway.exe serve
```

Enquanto esse comando estiver aberto, teste em outro PowerShell:

```powershell
Test-NetConnection 127.0.0.1 -Port 8787
Invoke-RestMethod http://127.0.0.1:8787/health
```

Para manter o Gateway ativo depois de reiniciar o Windows, instale-o como serviço. Execute como administrador:

```powershell
.\SonoShowGateway.exe service --startup auto install
.\SonoShowGateway.exe service start
Get-Service SonoShowFirebirdGateway | Format-List Status,StartType
```

O resultado correto é `Status: Running` e `StartType: Automatic`.

Comandos de manutenção do serviço:

```powershell
.\SonoShowGateway.exe service stop
.\SonoShowGateway.exe service start
.\SonoShowGateway.exe service restart
.\SonoShowGateway.exe service remove
```

Depois de alterar a configuração do banco ou do Gateway, reinicie o serviço.

## 5. Configurar e testar o Cloudflare Tunnel

O túnel deve encaminhar o domínio público para a porta local do Gateway:

```yaml
ingress:
  - hostname: gateway.jgmelo.company
    service: http://127.0.0.1:8787
  - service: http_status:404
```

Principais comandos:

```powershell
cloudflared tunnel ingress validate
cloudflared tunnel --config C:\Cloudflared\config.yml tunnel run
```

Depois que o túnel estiver ativo, teste o endereço público:

```powershell
Invoke-RestMethod https://gateway.jgmelo.company/health
```

Resposta esperada:

```text
status  version  configured
ok      1.x.x    True
```

Se a URL local funcionar e a pública não, o problema está no túnel, DNS ou configuração do Cloudflare. Se nem a URL local funcionar, verifique o serviço do Gateway.

## 6. Criar um token para o projeto

Cada projeto deve ter credenciais exclusivas. Para o Checklist Terrazi:

```powershell
cd C:\Users\jean.melo\Gateway
.\SonoShowGateway.exe token-create checklist-terrazi --rate-limit 300
```

O comando exibe algo semelhante a:

```json
{
  "project": "checklist-terrazi",
  "token_id": "ssg_EXEMPLO",
  "hmac_secret": "SEGREDO_EXIBIDO_UMA_UNICA_VEZ"
}
```

Copie o `token_id` e o `hmac_secret` imediatamente. O segredo não volta a ser exibido no comando de listagem.

Listar tokens, sem mostrar os segredos:

```powershell
.\SonoShowGateway.exe token-list
```

Revogar um token comprometido ou que não será mais utilizado:

```powershell
.\SonoShowGateway.exe token-revoke ssg_TOKEN_ID
```

Depois de revogar, crie outro token e atualize as variáveis da Vercel.

## 7. As três variáveis obrigatórias

Cadastre estas variáveis no ambiente server-side da aplicação:

```text
FIREBIRD_GATEWAY_URL=https://gateway.jgmelo.company
FIREBIRD_GATEWAY_TOKEN_ID=ID_EXIBIDO_PELO_COMANDO
FIREBIRD_GATEWAY_HMAC_SECRET=SEGREDO_EXIBIDO_PELO_COMANDO
```

### `FIREBIRD_GATEWAY_URL`

É o endereço HTTPS público que leva ao Gateway pelo Cloudflare Tunnel.

```text
FIREBIRD_GATEWAY_URL=https://gateway.jgmelo.company
```

Não use `127.0.0.1` na Vercel: na Vercel, esse endereço apontaria para a própria função, e não para o servidor TS.

### `FIREBIRD_GATEWAY_TOKEN_ID`

Identifica qual projeto está fazendo a consulta.

```text
FIREBIRD_GATEWAY_TOKEN_ID=ssg_EXEMPLO
```

O Gateway usa esse identificador para localizar o segredo correto, aplicar o limite de requisições e registrar o projeto nos logs.

### `FIREBIRD_GATEWAY_HMAC_SECRET`

É o segredo usado pela aplicação para assinar cada requisição com HMAC-SHA256.

```text
FIREBIRD_GATEWAY_HMAC_SECRET=SEGREDO_GERADO
```

A assinatura comprova que o corpo da requisição não foi alterado e que ela veio de uma aplicação autorizada. O segredo deve existir somente no servidor.

Regras importantes:

- Nunca use o prefixo `NEXT_PUBLIC_` nessas variáveis.
- Nunca coloque o segredo em JavaScript executado no navegador.
- Nunca grave valores reais no Git, README, prints públicos ou logs.
- Use um token diferente para cada projeto.
- Se o segredo vazar, revogue o token e crie outro.

## 8. Configurar na Vercel

No projeto da Vercel, acesse **Settings → Environment Variables** e crie:

| Nome | Valor |
| --- | --- |
| `FIREBIRD_GATEWAY_URL` | `https://gateway.jgmelo.company` |
| `FIREBIRD_GATEWAY_TOKEN_ID` | valor de `token_id` |
| `FIREBIRD_GATEWAY_HMAC_SECRET` | valor de `hmac_secret` |

Selecione os ambientes que usarão o Gateway:

- **Preview**, para a branch de homologação.
- **Production**, para a branch principal/produção.
- **Development**, somente se o desenvolvimento local precisar usar o Gateway.

Depois de criar ou alterar variáveis, faça um novo deploy. Um deployment que já existe não recebe automaticamente os novos valores.

Para desenvolvimento local, coloque os valores em `.env.local`, que deve permanecer ignorado pelo Git:

```dotenv
FIREBIRD_GATEWAY_URL=https://gateway.jgmelo.company
FIREBIRD_GATEWAY_TOKEN_ID=ssg_EXEMPLO
FIREBIRD_GATEWAY_HMAC_SECRET=SEGREDO_GERADO
```

## 9. Teste completo de uma consulta assinada

Este teste confirma token, assinatura HMAC, Cloudflare Tunnel, Gateway e Firebird. Execute no servidor TS:

```powershell
cd C:\Users\jean.melo\Gateway
$tokenId = (.\SonoShowGateway.exe token-list | ConvertFrom-Json)[0].token_id
'{"sql":"SELECT 1 AS OK FROM RDB$DATABASE","params":[]}' | Set-Content -NoNewline -Encoding ascii .\query.json
$assinatura = (.\SonoShowGateway.exe sign-example $tokenId .\query.json | ConvertFrom-Json)
$headers = @{
  Authorization = $assinatura.Authorization
  'X-Timestamp' = $assinatura.'X-Timestamp'
  'X-Nonce' = $assinatura.'X-Nonce'
  'X-Signature' = $assinatura.'X-Signature'
}
Invoke-RestMethod `
  -Uri 'https://gateway.jgmelo.company/query' `
  -Method Post `
  -Headers $headers `
  -ContentType 'application/json' `
  -InFile .\query.json
```

Se houver vários tokens, substitua `$tokenId` pelo identificador exato do projeto. O resultado esperado contém `success: True` e uma linha com `OK: 1`.

## 10. Diagnóstico rápido

### Gateway não responde localmente

```powershell
Get-Service SonoShowFirebirdGateway
Test-NetConnection 127.0.0.1 -Port 8787
Invoke-RestMethod http://127.0.0.1:8787/health
```

### Gateway funciona localmente, mas não pela internet

```powershell
cloudflared tunnel ingress validate
Invoke-RestMethod https://gateway.jgmelo.company/health
```

Verifique o serviço do `cloudflared`, o DNS e o destino `http://127.0.0.1:8787`.

### Resposta `401` ou `403`

Verifique se `TOKEN_ID` e `HMAC_SECRET` pertencem ao mesmo token, se ele ainda está ativo e se o deployment recebeu as variáveis corretas.

### Resposta `502`

O Gateway foi alcançado, mas a consulta ou a conexão com o Firebird falhou. Teste:

```powershell
.\SonoShowGateway.exe test-connection
.\SonoShowGateway.exe test-query
Get-Content C:\ProgramData\SonoShowGateway\logs\gateway.log -Tail 50
```

### Conferir data e hora do servidor

A assinatura possui janela de validade. Confirme que o Windows está sincronizado:

```powershell
w32tm /query /status
Get-Date
```

## 11. Checklist final

- [ ] Gateway configurado e conectado ao Firebird.
- [ ] Serviço `SonoShowFirebirdGateway` em execução automática.
- [ ] `http://127.0.0.1:8787/health` respondendo.
- [ ] Cloudflare Tunnel apontando para `127.0.0.1:8787`.
- [ ] `https://gateway.jgmelo.company/health` respondendo.
- [ ] Token exclusivo criado para o projeto.
- [ ] As três variáveis cadastradas no ambiente correto da Vercel.
- [ ] Novo deployment realizado depois da configuração das variáveis.
- [ ] Login ou consulta real da aplicação testado com sucesso.
