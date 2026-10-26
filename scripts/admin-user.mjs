import { createInterface, emitKeypressEvents } from 'node:readline';
import { mkdir, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setupAdmin } from '../server/auth.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
function ask(label) {
  const input = createInterface({input:process.stdin,output:process.stdout});
  return new Promise(resolve => input.question(label, answer => { input.close(); resolve(answer); }));
}
function passwordInput(label) {
  process.stdout.write(label);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve,reject) => {
    let password = '';
    const finish = () => { process.stdin.off('keypress',listener); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); };
    const listener = (text,key = {}) => {
      if (key.ctrl && key.name === 'c') { finish(); reject(new Error('Configuração cancelada.')); }
      else if (key.name === 'return' || key.name === 'enter') { finish(); resolve(password); }
      else if (key.name === 'backspace') password = password.slice(0,-1);
      else if (text && !key.ctrl && !key.meta && !/[\u0000-\u001f\u007f]/.test(text)) password += text;
    };
    process.stdin.on('keypress',listener);
  });
}
try {
  const args = process.argv.slice(2);
  let username; let reset = false; let stdin = false;
  while (args.length) {
    const arg = args.shift();
    if (arg === '--username') username = args.shift();
    else if (arg === '--reset') reset = true;
    else if (arg === '--password-stdin') stdin = true;
    else throw new Error('Use npm run admin:setup [-- --reset]. Para automação: --username nome --password-stdin.');
  }
  let password;
  if (stdin) {
    if (!username) throw new Error('Informe --username ao usar --password-stdin.');
    let value = '';
    for await (const chunk of process.stdin) {
      value += chunk.toString();
      if (value.length > 1024) throw new Error('Senha muito longa.');
    }
    password = value.replace(/\r?\n$/, '');
  } else {
    if (!process.stdin.isTTY) throw new Error('Abra um terminal interativo ou use --username nome --password-stdin.');
    username ||= await ask('Usuário do administrador: ');
    password = await passwordInput('Senha (12 a 128 caracteres, entrada oculta): ');
    if (password !== await passwordInput('Confirme a senha: ')) throw new Error('As senhas não coincidem.');
  }
  const dataDir = path.resolve(process.env.FOURBIKE_DATA_DIR || path.join(root,'data'));
  await mkdir(dataDir,{recursive:true,mode:0o700});
  const resolvedData = await realpath(dataDir);
  for (const folder of ['public','admin']) {
    const directory = await realpath(path.join(root,folder));
    const relative = path.relative(directory,resolvedData);
    if (!relative || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) throw new Error('Os dados precisam ficar fora das pastas public/ e admin/.');
  }
  const result = await setupAdmin({dataDir,username,password,reset});
  console.log(`Acesso ${reset ? 'redefinido' : 'criado'} para ${result.username}. Entre em /admin. A senha não é armazenada em texto.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
