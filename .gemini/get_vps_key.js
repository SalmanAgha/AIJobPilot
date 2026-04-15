const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  conn.exec('cat ~/.ssh/id_rsa.pub 2>/dev/null || cat ~/.ssh/id_ed25519.pub 2>/dev/null || echo "NO_KEY_FOUND"', (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('data', d => console.log('PUBLIC KEY:\n' + d));
    stream.stderr.on('data', d => {});
    stream.on('close', () => conn.end());
  });
});

conn.connect({ host: '31.97.62.124', port: 22, username: 'newuser', password: 'Salman11!!', readyTimeout: 10000 });
