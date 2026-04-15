const { Client } = require('ssh2');

const conn = new Client();

const password = 'Salman11!!';

conn.on('ready', () => {
  console.log('SSH Connection Ready');
  
  // Create a pseudo-terminal (PTY) to handle sudo password prompt
  conn.shell((err, stream) => {
    if (err) throw err;

    let stage = 0;
    
    stream.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);

      // Check for password prompt
      if (output.includes('[sudo] password for newuser:')) {
        stream.write(password + '\n');
      }

      // Check if first command finished and start second
      if (stage === 0 && output.includes('newuser@srv940293:')) {
        stage = 1;
        stream.write('echo "newuser ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx" | sudo tee /etc/sudoers.d/nginx-reload\n');
      } else if (stage === 1 && output.includes('newuser ALL=(ALL) NOPASSWD:')) {
        stage = 2;
        stream.write('sudo systemctl reload nginx\n');
      } else if (stage === 2 && output.includes('newuser@srv940293:')) {
        stage = 3;
        console.log('\n--- SUCCESS: SUDOERS UPDATED ---');
        stream.write('exit\n');
      }
    });

    stream.on('close', () => {
      conn.end();
    });
  });
});

conn.connect({
  host: '31.97.62.124',
  port: 22,
  username: 'newuser',
  password: password
});
