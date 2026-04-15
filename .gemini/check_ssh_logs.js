const { Client } = require('ssh2');

const conn = new Client();
const password = 'Salman11!!';

conn.on('ready', () => {
  conn.shell((err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('data', (data) => {
      const str = data.toString();
      output += str;
      process.stdout.write(str);
      if (str.includes('[sudo] password for newuser:')) {
        stream.write(password + '\n');
      }
      if (output.includes('newuser@srv940293:~$')) {
        if (!output.includes('journalctl')) {
          stream.write('sudo journalctl -t sshd -n 50\n');
        } else {
          stream.write('exit\n');
        }
      }
    });
    stream.on('close', () => conn.end());
  });
});

conn.connect({ host: '31.97.62.124', port: 22, username: 'newuser', password: password });
