# discord-xats

Base mínima em Node.js para autenticar uma conta de bot no xat, entrar em um chat e manter a sessão conectada.

Este estágio não possui comandos, moderação, banco de dados, OpenAI ou integrações externas. Pacotes que não fazem parte da conexão são ignorados.

## Requisitos

- Ubuntu Linux
- Node.js 20 ou superior
- Conta de bot e API key do xat
- ID numérico do chat de destino

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
```

`BOT_CHAT_ID` recebe o ID numérico, não o nome do chat.

## Inicialização

```bash
npm start
```

Na primeira autenticação, a sessão é gravada em `cache/login.json`. Nas inicializações seguintes ela é reutilizada. O cliente mantém pings periódicos e tenta reconectar com backoff exponencial quando a conexão cai.

O arquivo `.env` e a sessão de login não devem ser enviados ao GitHub.

## Estrutura

- `src/config.js`: valida variáveis de ambiente.
- `src/core/SessionStore.js`: lê e grava a sessão localmente.
- `src/core/XatClient.js`: autenticação, entrada no chat, keepalive e reconexão.
- `src/protocol/xml.js`: serialização e leitura dos pacotes XML do xat.
- `src/index.js`: inicialização e encerramento do processo.

## Licença

Apache-2.0. Consulte também `THIRD_PARTY_NOTICES.md` para os avisos obrigatórios do código de origem utilizado como referência.
