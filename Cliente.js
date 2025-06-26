const http = require('http');
const { exec } = require('child_process');

const PORTA = 3333;

http.createServer((req, res) => {
  const comando = req.url.replace('/', '').toLowerCase();

  if (comando === 'bloquear') {
    exec('netsh advfirewall set allprofiles state on');
    res.end('Internet bloqueada!');
  } else if (comando === 'desbloquear') {
    exec('netsh advfirewall set allprofiles state off');
    res.end('Internet desbloqueada!');
  } else {
    res.end('Comando inválido!');
  }
}).listen(PORTA, () => {
  console.log(`Cliente ouvindo na porta ${PORTA}`);
});