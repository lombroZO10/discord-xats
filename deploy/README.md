# Deploy no Ubuntu com systemd

Este roteiro instala a ponte em `/opt/discord-xats`, mantém os segredos fora do repositório, guarda a sessão em `/var/lib/discord-xats` e executa o processo com um usuário de sistema sem shell.

Execute os comandos somente na VPS Ubuntu, depois que a branch da integração Discord estiver mesclada em `main`.

## 1. Pré-requisitos

Instale na VPS:

- Git;
- Node.js 24.17.0 ou superior;
- npm compatível com essa versão do Node.js;
- systemd.

Confirme as versões:

```bash
node --version
npm --version
systemctl --version
```

O caminho do Node precisa ser `/usr/bin/node`, igual ao `ExecStart` do serviço. Confirme com:

```bash
command -v node
```

Se a VPS usar outro caminho, edite `ExecStart` em `deploy/discord-xats.service` antes de instalar a unit.

## 2. Usuário e código

```bash
id -u discord-xats >/dev/null 2>&1 || \
  sudo useradd --system --home-dir /opt/discord-xats --shell /usr/sbin/nologin discord-xats

sudo git clone --branch main https://github.com/lombroZO10/discord-xats.git /opt/discord-xats
cd /opt/discord-xats

sudo npm install --omit=dev --ignore-scripts --no-package-lock
sudo chown -R root:discord-xats /opt/discord-xats
sudo chmod -R u=rwX,g=rX,o= /opt/discord-xats
sudo find /opt/discord-xats -type d -exec chmod g+s {} +
```

O código e as dependências ficam sob controle do root e somente leitura para o grupo do serviço. O bit `setgid` nos diretórios mantém esse grupo em arquivos criados por atualizações. O `systemd` cria `/var/lib/discord-xats` com permissão `0700` para armazenar a sessão fora do código.

## 3. Segredos

```bash
sudo install -d -o root -g root -m 0700 /etc/discord-xats
sudo install -o root -g root -m 0600 \
  /opt/discord-xats/deploy/discord-xats.env.example \
  /etc/discord-xats/discord-xats.env

sudoedit /etc/discord-xats/discord-xats.env
```

Preencha os valores reais de:

- `BOT_USER`;
- `BOT_APIKEY`;
- `BOT_CHAT_ID`;
- `DISCORD_BOT_TOKEN`;
- `DISCORD_CHANNEL_ID`.

Nunca salve o arquivo real de ambiente dentro do repositório. Mantenha a permissão `0600`.

## 4. Instalação do serviço

```bash
sudo install -o root -g root -m 0644 \
  /opt/discord-xats/deploy/discord-xats.service \
  /etc/systemd/system/discord-xats.service

sudo systemd-analyze verify /etc/systemd/system/discord-xats.service
sudo systemctl daemon-reload
sudo systemctl enable --now discord-xats
```

## 5. Verificação

```bash
sudo systemctl status discord-xats --no-pager
sudo journalctl -u discord-xats -n 100 --no-pager
```

Para acompanhar ao vivo:

```bash
sudo journalctl -u discord-xats -f
```

Uma inicialização normal deve registrar primeiro a conexão do Discord, depois a autenticação/conexão do xat. Os tokens e as chaves nunca devem aparecer no journal.

## 6. Atualização

```bash
sudo systemctl stop discord-xats
cd /opt/discord-xats
sudo git pull --ff-only origin main
sudo npm install --omit=dev --ignore-scripts --no-package-lock
sudo chown -R root:discord-xats /opt/discord-xats
sudo chmod -R u=rwX,g=rX,o= /opt/discord-xats
sudo find /opt/discord-xats -type d -exec chmod g+s {} +
sudo install -o root -g root -m 0644 \
  /opt/discord-xats/deploy/discord-xats.service \
  /etc/systemd/system/discord-xats.service
sudo systemctl daemon-reload
sudo systemctl start discord-xats
sudo systemctl status discord-xats --no-pager
```

O arquivo `/etc/discord-xats/discord-xats.env` e `/var/lib/discord-xats/login.json` não são substituídos por uma atualização do Git.

## 7. Operações úteis

```bash
sudo systemctl restart discord-xats
sudo systemctl stop discord-xats
sudo systemctl start discord-xats
sudo systemctl disable --now discord-xats
```

Se as credenciais do xat mudarem e a sessão precisar ser refeita:

```bash
sudo systemctl stop discord-xats
sudo rm -f /var/lib/discord-xats/login.json
sudo systemctl start discord-xats
```

Esse último comando remove somente a sessão local do xat; na próxima inicialização o bot autentica novamente com o `.env` protegido.
