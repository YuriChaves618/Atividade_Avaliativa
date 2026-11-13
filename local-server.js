// Servidor local (npm run dev). Na Vercel quem roda o app é o api/index.js.
const app = require('./lib/app');

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`Super Celso Bros disponível em http://localhost:${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nA porta ${port} já está em uso: provavelmente outra versão do projeto ainda está rodando.`);
    console.error('Feche o outro terminal (Ctrl+C) ou encerre o processo antigo e rode de novo.\n');
  } else {
    console.error(error);
  }
  process.exit(1);
});
