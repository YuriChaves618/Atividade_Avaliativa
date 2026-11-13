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


