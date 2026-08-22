# discord-xats

Ponte de mão única em Node.js que mantém uma conta conectada ao xat e encaminha as mensagens públicas do chat para um canal do Discord.

O bot não possui comandos, moderação ou banco de dados. Mensagens do Discord não voltam para o xat.

## Requisitos

- Ubuntu Linux
- Node.js 24.17.0 ou superior
- Conta de bot e API key do xat
- ID numérico do chat de destino
- Aplicação com bot criada no Discord Developer Portal
- Canal onde o bot tenha as permissões `View Channel` e `Send Messages`

## Configuração

Na VPS:

```bash
npm install
cp .env.example .env
```

Edite `.env` e informe, no mínimo:

```env
BOT_USER=usuario_do_bot
BOT_APIKEY=chave_api_do_bot
BOT_CHAT_ID=123456789
DISCORD_BOT_TOKEN=token_do_bot_discord
DISCORD_CHANNEL_ID=123456789012345678
```

`BOT_CHAT_ID` recebe o ID numérico, não o nome do chat.

`DISCORD_CHANNEL_ID` recebe o ID do canal onde as mensagens serão publicadas. Como o bot somente envia mensagens, ele usa apenas o intent padrão `Guilds`; não é necessário habilitar o intent privilegiado `Message Content`.

Nunca publique o token do Discord. Caso ele seja exposto, regenere-o imediatamente no Developer Portal.

### Preparação no Discord

1. Crie uma aplicação no [Discord Developer Portal](https://discord.com/developers/applications).
2. Abra a seção **Bot**, crie o usuário do bot e copie/reset o token para `DISCORD_BOT_TOKEN`.
3. Na instalação da aplicação, inclua o escopo `bot` e conceda somente `View Channel` e `Send Messages`.
4. Convide o bot para o servidor.
5. Ative o modo desenvolvedor do Discord, copie o ID do canal de destino e coloque-o em `DISCORD_CHANNEL_ID`.

O bot aparecerá online com a atividade definida em `DISCORD_ACTIVITY` (padrão: `xat.com`).

## Deploy no Ubuntu

O pacote inclui uma unit `systemd` com usuário isolado, reinício em falhas e sessão persistida fora do código em `/var/lib/discord-xats`. Siga o roteiro completo em [`deploy/README.md`](deploy/README.md).

## Inicialização

```bash
npm start
```

Na primeira autenticação do xat, a sessão é gravada em `cache/login.json`. Nas inicializações seguintes ela é reutilizada. O cliente mantém pings periódicos e tenta reconectar com backoff exponencial quando a conexão cai.

O bot do Discord é iniciado primeiro. Depois que o canal é validado, o cliente do xat conecta e começa a encaminhar as mensagens públicas. Mensagens de sistema e pacotes iniciados com `/` são ignorados.

O arquivo `.env` e a sessão de login não devem ser enviados ao GitHub.

## Estrutura

- `src/config.js`: valida variáveis de ambiente.
- `src/core/SessionStore.js`: lê e grava a sessão localmente.
- `src/core/XatClient.js`: autenticação, entrada no chat, eventos, keepalive e reconexão.
- `src/discord/DiscordBridge.js`: login no Discord, validação do canal e fila de envio.
- `src/protocol/xml.js`: serialização e leitura dos pacotes XML do xat.
- `src/index.js`: conecta a saída de mensagens do xat à entrada do Discord.

## Licença

Apache-2.0. Consulte também `THIRD_PARTY_NOTICES.md` para os avisos obrigatórios do código de origem utilizado como referência.
