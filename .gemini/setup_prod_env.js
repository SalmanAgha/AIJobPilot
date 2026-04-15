const { Client } = require('ssh2');

const conn = new Client();
const password = 'Salman11!!';

const frontendEnv = `NEXT_PUBLIC_API_URL=https://jobcopilot.salmanagha.dev/api\n`;
const backendEnv = `DATABASE_URL="file:./dev.db"\nJWT_SECRET="salman_secret_key_123_change_me"\nPORT=5000\nNODE_ENV=production\n`;

conn.on('ready', () => {
  const cmds = [
    `echo "${frontendEnv}" > ~/salmanagha.dev/jobcopilot/frontend/.env.production`,
    `echo "${backendEnv}" > ~/salmanagha.dev/jobcopilot/backend/.env`,
    `cd ~/salmanagha.dev/jobcopilot/backend && npx prisma db push` // Ensure DB exists
  ];
  
  let i = 0;
  const run = () => {
    if (i >= cmds.length) { conn.end(); return; }
    conn.exec(cmds[i++], (err, stream) => {
      stream.on('close', run);
    });
  };
  run();
});

conn.connect({ host: '31.97.62.124', port: 22, username: 'newuser', password: password });
