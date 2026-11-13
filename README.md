# Super Celso Bros

Jogo de plataforma em pixel art com **login pela conta Google**. Depois de entrar, o jogador continua conectado (o nome, a foto e o e-mail ficam visíveis na barra superior) até clicar em **ENCERRAR SESSÃO**.

## O jogo

- Ajude o **Celso** a atravessar a cidade tech até a **bandeira**.
- Bata nos blocos **?** por baixo para fazer sair dinheiro (R$ 100 por bloco, 10 blocos na fase).
- Pule os **bugs** e **vírus**. Cada batida tira uma vida (são 3). Sem vidas, fim de jogo.
- Tocar na bandeira termina a fase e mostra dinheiro, tempo e vidas.

| Ação | Teclado | Celular |
| --- | --- | --- |
| Andar | `←` `→` ou `A` `D` | botões ◀ ▶ |
| Pular | `Espaço` ou `↑` | botão PULAR |
| Iniciar / jogar de novo | `Enter` ou botão | toque |

## Como rodar

Requisitos: Node.js 22+ e um Client ID OAuth (Aplicativo da Web) no Google Cloud, com `http://localhost:3000` em **Origens JavaScript autorizadas** (a mesma configuração que você já fez).

```bash
npm install
cp .env.example .env     # preencha GOOGLE_CLIENT_ID e SESSION_SECRET
npm run dev
```

Abra <http://localhost:3000>.

> **Segurança:** o `SESSION_SECRET` do `.env` da versão anterior foi enviado em um arquivo compartilhado. Gere um novo (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) e não publique o `.env`. Esta pasta não inclui o seu `.env`; copie o seu para cá ou crie um novo a partir do `.env.example`.

## Publicar na Vercel

O projeto já está preparado para a Vercel (API em função serverless, sessão guardada em cookie criptografado, sem banco de dados).

1. Suba a pasta para um repositório no GitHub (o `.env` **não** deve ir junto; já está no `.gitignore`).
2. Na Vercel: **Add New → Project**, importe o repositório. Em *Framework Preset* deixe **Other**; não precisa de Build Command nem Output Directory.
3. Em **Settings → Environment Variables**, crie (marque *Production*):

| Nome | Valor |
| --- | --- |
| `GOOGLE_CLIENT_ID` | o mesmo Client ID OAuth que você usa localmente |
| `SESSION_SECRET` | valor novo e aleatório: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `APP_ORIGIN` | URL final do site, com `https://` e sem `/` no fim (ex.: `https://super-celso-bros.vercel.app`). Para mais de uma, separe por vírgula. |

4. No Google Cloud (**APIs e serviços → Credenciais → seu Client ID**), adicione a mesma URL em **Origens JavaScript autorizadas**.
5. Faça um **Redeploy** (variáveis só valem em deploys novos) e teste `https://SEU-SITE.vercel.app/api/version`.

Observações: login só funciona nas URLs cadastradas no Google e em `APP_ORIGIN` (URLs de *preview* da Vercel não funcionam). A sessão fica no cookie do navegador: "Encerrar sessão" apaga o cookie, mas não invalida cópias dele antes dos 30 dias.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `public/` | Site estático (HTML, CSS, `app.js`, sprites e cenário). Na Vercel é servido pela CDN. |
| `game/game.js` | Motor do jogo (canvas). Só é entregue a quem está logado, pela rota `/game/game.js`. |
| `lib/app.js` | App Express: validação do token Google, CSRF, rotas `/api/*`. |
| `lib/cookie-session.js` | Sessão em cookie criptografado (AES-256-GCM), 30 dias, sem disco. |
| `api/index.js` | Entrada da função serverless na Vercel. |
| `local-server.js` | Servidor local (`npm run dev`). |
| `vercel.json` | Roteamento de `/api/*` e `/game/game.js` para a função. |
