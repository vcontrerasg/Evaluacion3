const env = require('./config/env');
const { connectDB } = require('./config/db');
const { ensureAdmin, seedDemoData } = require('./services/bootstrap.service');
const createApp = require('./app');

async function main() {
  await connectDB();
  await ensureAdmin();
  await seedDemoData();
  const app = createApp();
  app.listen(env.PORT, () => console.log(`Servidor escuchando en el puerto ${env.PORT}`));
}

main().catch((err) => {
  console.error(`No se pudo iniciar el servidor: ${err.name}`);
  process.exit(1);
});
