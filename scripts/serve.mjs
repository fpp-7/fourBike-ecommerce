import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApplicationServer } from '../server/application.mjs';
export { createStaticServer } from '../server/static.mjs';

async function startPreview() {
  const portValue = process.env.PORT ?? '4173';
  if (!/^\d+$/.test(portValue) || !Number.isSafeInteger(Number(portValue)) || Number(portValue) > 65535) {
    console.error('PORT inválida. Use um número inteiro entre 0 e 65535 (padrão: 4173).');
    process.exitCode = 1;
    return;
  }

  try {
    const port = Number(portValue);
    const server = await createApplicationServer();
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE'
        ? `A porta ${port} já está em uso. Encerre a execução anterior ou escolha outra porta com PORT.`
        : `Não foi possível iniciar o fourBike: ${error.message}`);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`fourBike: http://127.0.0.1:${server.address().port}`);
    });
  } catch (error) {
    console.error(`Não foi possível iniciar o fourBike: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && realpathSync.native(path.resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  startPreview();
}
