const { spawn } = require('child_process');
const path = require('path');

const next = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
const port = process.env.PORT || '3006';

const child = spawn(process.execPath, [next, 'dev', '--port', port], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env },
});

child.on('exit', (code) => process.exit(code ?? 0));
