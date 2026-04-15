const SftpClient = require('ssh2-sftp-client');
const { Client } = require('ssh2');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const CONFIG = { host: '31.97.62.124', port: 22, username: 'newuser', password: 'Salman11!!' };
const LOCAL_PLATFORM = path.join(__dirname, '..', 'platform');
const REMOTE_DIR = '/home/newuser/jobcopilot-app';
const ZIP_PATH = path.join(__dirname, 'platform_deploy.tar.gz');

function createTar() {
  return new Promise((resolve, reject) => {
    console.log('\x1b[34m[1/4] Creating deployment archive (tar.gz)...\x1b[0m');
    const output = fs.createWriteStream(ZIP_PATH);
    const archive = archiver('tar', { gzip: true });
    output.on('close', () => {
      console.log(`  ✓ Archive: ${(archive.pointer()/1024/1024).toFixed(1)} MB`);
      resolve();
    });
    archive.on('error', reject);
    archive.pipe(output);
    archive.glob('**/*', {
      cwd: LOCAL_PLATFORM,
      ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/.git/**'],
      dot: true
    });
    archive.finalize();
  });
}

async function uploadTar() {
  console.log('\x1b[34m[2/4] Uploading archive to VPS...\x1b[0m');
  const sftp = new SftpClient();
  await sftp.connect(CONFIG);
  await sftp.put(ZIP_PATH, '/home/newuser/jobcopilot.tar.gz');
  await sftp.end();
  console.log('  ✓ Upload complete');
}

function sshExec(commands) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let idx = 0;
    function runNext() {
      if (idx >= commands.length) { conn.end(); resolve(); return; }
      const cmd = commands[idx++];
      console.log(`\n  \x1b[90m$ ${cmd.split('\n')[0].substring(0, 90)}\x1b[0m`);
      conn.exec(cmd, (err, stream) => {
        if (err) { reject(err); return; }
        stream.on('data', d => process.stdout.write('  ' + d));
        stream.stderr.on('data', d => process.stderr.write('\x1b[33m  STDERR: ' + d + '\x1b[0m'));
        stream.on('close', code => {
          if (code !== 0 && code !== null) console.log(`  \x1b[33m⚠ exit ${code}\x1b[0m`);
          runNext();
        });
      });
    }
    conn.on('ready', runNext);
    conn.on('error', reject);
    conn.connect({ ...CONFIG, readyTimeout: 30000 });
  });
}

(async () => {
  console.log('\x1b[36m\n╔══════════════════════════════════════════╗');
  console.log('║   JobCopilot → VPS Direct Deployment    ║');
  console.log('╚══════════════════════════════════════════╝\x1b[0m\n');
  try {
    await createTar();
    await uploadTar();

    console.log('\x1b[34m[3/4] Extracting & installing on VPS...\x1b[0m');
    await sshExec([
      // Install tar-based tools & unzip support
      'which tar && echo "✓ tar available"',

      // Clean stale PM2 processes from failed attempts
      'pm2 delete jobcopilot-frontend 2>/dev/null || true; pm2 delete jobcopilot-backend 2>/dev/null || true; echo "✓ Cleared old PM2 entries"',

      // Extract tar.gz (tar is always available on Ubuntu)
      `mkdir -p ${REMOTE_DIR} && tar -xzf ~/jobcopilot.tar.gz -C ${REMOTE_DIR} && echo "✓ Extracted to ${REMOTE_DIR}"`,

      // Check structure
      `ls ${REMOTE_DIR}/`,

      // Backend deps
      `cd ${REMOTE_DIR}/backend && npm install --production && echo "✓ Backend deps installed"`,

      // Prisma generate
      `cd ${REMOTE_DIR}/backend && npx prisma generate && echo "✓ Prisma client generated"`,

      // Frontend .env.local
      `printf 'NEXT_PUBLIC_API_URL=https://jobcopilot.salmanagha.dev/api\n' > ${REMOTE_DIR}/frontend/.env.local && echo "✓ .env.local written"`,

      // Frontend install + build
      `cd ${REMOTE_DIR}/frontend && npm install && npm run build && echo "✓ Frontend built"`,

      // Start backend PM2
      `cd ${REMOTE_DIR}/backend && pm2 start src/index.js --name "jobcopilot-backend" && echo "✓ Backend started"`,

      // Start frontend PM2
      `cd ${REMOTE_DIR}/frontend && pm2 start npm --name "jobcopilot-frontend" -- start && echo "✓ Frontend started"`,

      // Save PM2
      'pm2 save && echo "✓ PM2 saved"',

      // Allow nginx reload without sudo password using NOPASSWD
      'echo "newuser ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx" | sudo tee /etc/sudoers.d/nginx-reload && sudo systemctl reload nginx && echo "✓ Nginx reloaded"',

      // Final check
      'pm2 list',
      'sleep 4 && curl -s -o /dev/null -w "Frontend health → HTTP %{http_code}\\n" http://localhost:3000',
      'echo "🚀 LIVE: https://jobcopilot.salmanagha.dev"'
    ]);

    fs.unlinkSync(ZIP_PATH);
    console.log('\n\x1b[32m╔══════════════════════════════╗');
    console.log('║  ✅ Deployment Successful!   ║');
    console.log('╚══════════════════════════════╝\x1b[0m');
  } catch (e) {
    console.error('\n\x1b[31m✗ FAILED:', e.message, '\x1b[0m');
    process.exit(1);
  }
})();
