const { Client } = require('ssh2');

const conn = new Client();

// Fixing the systemctl path and ensuring the directory exists
const commands = [
  'echo "newuser ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx" | sudo tee /etc/sudoers.d/nginx-reload',
  'sudo systemctl reload nginx',
  'mkdir -p ~/salmanagha.dev/jobcopilot'
];

conn.on('ready', () => {
  let idx = 0;
  function run() {
    if (idx >= commands.length) { conn.end(); return; }
    const cmd = commands[idx++];
    console.log(`\n$ ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('data', d => process.stdout.write(d));
      stream.stderr.on('data', d => process.stderr.write(d));
      stream.on('close', run);
    });
  }
  run();
});

conn.on('error', (err) => {
  console.error('SSH Error:', err);
});

conn.connect({
  host: '31.97.62.124',
  port: 22,
  username: 'newuser',
  password: 'Salman11!!'
});
