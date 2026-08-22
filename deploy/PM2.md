# Deploy com PM2 no Ubuntu

Este é o fluxo recomendado quando a VPS já utiliza PM2. O processo recebe o nome exclusivo `discord-xats`; os comandos abaixo não reiniciam nem alteram os outros bots.

## 1. Conferir o ambiente

Execute na VPS com o mesmo usuário Linux que já administra o PM2:

```bash
node --version
pm2 --version
pm2 list
```

O Node.js precisa ser `24.17.0` ou superior. Não execute os comandos seguintes como `root` se o PM2 atual pertence a outro usuário.

## 2. Baixar o projeto

Depois que a branch com a ponte do Discord estiver incorporada à `main`:

```bash
mkdir -p "$HOME/apps"
cd "$HOME/apps"
git clone https://github.com/lombroZO10/discord-xats.git
cd discord-xats
npm install --omit=dev --ignore-scripts
```

Se a pasta já existir, não clone novamente. Use a seção de atualização no fim deste arquivo.

## 3. Criar a configuração secreta

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Preencha no mínimo:

```env
BOT_USER=usuario_do_bot
BOT_APIKEY=chave_api_do_bot
BOT_CHAT_ID=123456789
DISCORD_BOT_TOKEN=token_do_bot_discord
DISCORD_CHANNEL_ID=123456789012345678
```

Não envie `.env`, token, senha, API key ou `cache/login.json` ao GitHub ou ao Codex.

## 4. Iniciar apenas este bot

```bash
pm2 start ecosystem.config.cjs --only discord-xats
pm2 save
```

Se o PM2 existente ainda não estiver configurado para iniciar após reiniciar a VPS, consulte `pm2 startup`. Não repita essa configuração sem necessidade.

## 5. Conferir a conexão

```bash
pm2 show discord-xats
pm2 logs discord-xats --lines 100
ls -l cache/login.json
```

Depois, envie uma mensagem pública de teste no xat e confirme que ela aparece no canal correto do Discord. Esse teste real só deve ser feito na VPS.

Para sair da tela contínua de logs sem parar o bot, pressione `Ctrl+C`.

## Atualizar futuramente

```bash
cd "$HOME/apps/discord-xats"
git pull --ff-only
npm install --omit=dev --ignore-scripts
pm2 restart ecosystem.config.cjs --only discord-xats --update-env
pm2 save
```

Evite `pm2 restart all`, pois esse comando também reiniciaria os outros projetos da VPS.

## Comandos úteis

```bash
pm2 status
pm2 logs discord-xats --lines 100
pm2 restart discord-xats --update-env
pm2 stop discord-xats
pm2 delete discord-xats
```
