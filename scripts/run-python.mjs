// Executa o Python do venv do backend (backend/.venv) em Windows, Linux ou macOS.
// Uso: node scripts/run-python.mjs <argumentos do python>
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const venvDir = path.resolve('backend', '.venv');
const python = process.platform === 'win32'
  ? path.join(venvDir, 'Scripts', 'python.exe')
  : path.join(venvDir, 'bin', 'python');

if (!existsSync(python)) {
  console.error(`Python do venv não encontrado em ${python}.`);
  console.error('Crie o ambiente com: python -m venv backend/.venv && pip install -r backend/requirements.txt');
  process.exit(1);
}

const child = spawn(python, process.argv.slice(2), { stdio: 'inherit' });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
