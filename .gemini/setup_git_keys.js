const { Client } = require('ssh2');

const conn = new Client();

const commands = [
  'rm -f ~/.ssh/jobcopilot_deploy ~/.ssh/jobcopilot_deploy.pub',
  'ssh-keygen -t rsa -b 4096 -f ~/.ssh/jobcopilot_deploy -N ""',
  'cat ~/.ssh/jobcopilot_deploy.pub >> ~/.ssh/authorized_keys',
  'printf "Host github.com\\n  HostName github.com\\n  User git\\n  IdentityFile ~/.ssh/jobcopilot_deploy\\n  StrictHostKeyChecking no\\n" > ~/.ssh/config',
  'chmod 600 ~/.ssh/config',
  'cat ~/.ssh/jobcopilot_deploy.pub',
  'cat ~/.ssh/jobcopilot_deploy'
];

conn.on('ready', () => {
  let idx = 0;
  const run = () => {
    if (idx >= commands.length) {
      conn.end();
      return;
    }
    const cmd = commands[idx++];
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('data', d => {
        if (cmd.includes('.pub')) console.log('\n--- PUBLIC KEY ---');
        else if (cmd.includes('jobcopilot_deploy')) console.log('\n--- PRIVATE KEY ---');
        process.stdout.write(d);
      });
      stream.on('close', run);
    });
  };
  run();
});

conn.connect({
  host: '31.97.62.124',
  port: 22,
  username: 'newuser',
  password: 'Salman11!!'
});
