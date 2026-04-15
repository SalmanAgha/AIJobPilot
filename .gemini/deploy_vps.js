const { Client } = require('ssh2');
const https = require('https');

const VPS_HOST = '31.97.62.124';
const VPS_USER = 'newuser';
const VPS_PASS = 'Salman11!!';

const VPS_PUB_KEY = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCgtqrdN8EVJYbxLO+1/OYza0Gv4YF/NHBCy9X+airCjWKGsORYvue8wGMcrAmAQtHg8FXoeKILYYDmTNq2ehbxtuoKjwYPE8YHENmCNz1GxwLCjicOlDy01sVBM1s0wd0W2STqAhE1OAqicMV+fYEdiwL4VXAsGf5rFDc/2c6wmlHQw7xbw38VwWRzAAkNlnVWSVdQJ7Hz3uzvnZp5oE+NdYhuv2J+srPX3Ul5TJB0WQCvwy8PkaZ0YOZzcPs+RebSzh2HzXiNBeD6uH/CtK4lbc33DhB6p2PNKAH3CDFYH7ilbwkVp7D2OX8KopnWJqViR8O+AR3XTjlLQTuEXn6cTs0Xe5LuQQmMN2+AqCND3VbLWWOtVndGvBmXi93a41YXX6QpVQMaDf0Wvnea5zse5DjMWAYXNh4iT/yjb2dh34YX9nU7rvJ3+VwJ6w+48OcismIb+NSLvx4De8D5C+GRA67fSPMyiFguv6tTuyEVt4kjBaNBtSIJPpSSqOYZAGHv0QD9GxDIOO0rQTbpI2Xq9VyCOsXUrX+To1Ky1nSjzSoVWoCuUgHPpaJ9iTX25JFcv487uAaUmszcIODIROPFpFixiwH8U8pvHMifLwOfQO2Ev7yjpmdChIInnUzQ9bTgVuBFr8RoyQDCnJPhKmvrI8Z8hOHrFLxCLM01s/TyLQ== aghasalmankhan14@gmail.com';

// ─── SSH Runner ───────────────────────────────────────────────────────────────
function sshExec(commands) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const results = [];

    async function runNext(index) {
      if (index >= commands.length) { conn.end(); resolve(results); return; }
      const cmd = commands[index];
      const short = cmd.trim().split('\n')[0].substring(0, 90);
      console.log(`\n\x1b[34m▶ ${short}\x1b[0m`);

      conn.exec(cmd, (err, stream) => {
        if (err) { reject(err); return; }
        let out = '';
        stream.on('data', d => { process.stdout.write(d); out += d; });
        stream.stderr.on('data', d => process.stderr.write('\x1b[33m' + d + '\x1b[0m'));
        stream.on('close', code => {
          results.push({ cmd: short, code, out });
          if (code !== 0) console.log(`\x1b[33m⚠ Exit ${code}\x1b[0m`);
          runNext(index + 1);
        });
      });
    }

    conn.on('ready', () => runNext(0));
    conn.on('error', reject);
    conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 20000 });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\x1b[36m=== JobCopilot Full VPS Deployment ===\x1b[0m');

  const deployCommands = [
    // PM2 check
    'which pm2 && echo "PM2 ready"',

    // Clone via SSH (key already on VPS)
    `cd ~ && if [ -d "jobcopilot-app" ]; then
      echo "==> Pulling latest prod..."
      cd jobcopilot-app && git fetch origin && git checkout prod && git pull origin prod
    else
      echo "==> Cloning jobcopilot..."
      GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no" git clone -b prod git@github.com:SalmanAgha/jobcopilot.git jobcopilot-app
    fi`,

    // Backend install
    'cd ~/jobcopilot-app/platform/backend && npm install --production && echo "✓ Backend deps installed"',

    // Run Prisma migrations
    'cd ~/jobcopilot-app/platform/backend && npx prisma generate && echo "✓ Prisma client generated"',

    // Frontend .env.local
    `cat > ~/jobcopilot-app/platform/frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://jobcopilot.salmanagha.dev/api
EOF
echo "✓ Frontend .env.local written"`,

    // Frontend build
    'cd ~/jobcopilot-app/platform/frontend && npm install && npm run build && echo "✓ Frontend built"',

    // Start/restart PM2 - Backend
    `cd ~/jobcopilot-app/platform/backend && \
    pm2 describe jobcopilot-backend > /dev/null 2>&1 \
      && pm2 restart jobcopilot-backend --update-env \
      || pm2 start src/index.js --name "jobcopilot-backend"
    echo "✓ Backend PM2 started"`,

    // Start/restart PM2 - Frontend
    `cd ~/jobcopilot-app/platform/frontend && \
    pm2 describe jobcopilot-frontend > /dev/null 2>&1 \
      && pm2 restart jobcopilot-frontend --update-env \
      || pm2 start npm --name "jobcopilot-frontend" -- start
    echo "✓ Frontend PM2 started"`,

    // Save PM2
    'pm2 save && echo "✓ PM2 saved"',

    // Nginx reload
    'sudo systemctl reload nginx && echo "✓ Nginx reloaded"',

    // Final status
    'pm2 list',

    'curl -s -o /dev/null -w "Frontend HTTP: %{http_code}" http://localhost:3000 && echo ""',

    'echo "\\n🚀 https://jobcopilot.salmanagha.dev is LIVE!"'
  ];

  try {
    await sshExec(deployCommands);
    console.log('\n\x1b[32m=== Deployment Complete ===\x1b[0m');
  } catch (err) {
    console.error('\x1b[31m✗ Deployment failed:', err.message, '\x1b[0m');
    process.exit(1);
  }
}

main();
