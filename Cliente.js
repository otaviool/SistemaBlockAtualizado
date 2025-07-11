const http = require('http');
const { exec } = require('child_process');
const url = require('url');

const PORTA = 3333;

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const comando = parsedUrl.pathname.replace('/', '').toLowerCase();
  const site = parsedUrl.query.site;

  if (comando === 'bloquear') {
    exec('netsh advfirewall set allprofiles state on');
    res.end('Internet bloqueada!');
  } else if (comando === 'desbloquear') {
    exec('netsh advfirewall set allprofiles state off');
    res.end('Internet desbloqueada!');
  } else if (comando === 'bloquearsite') {
    if (!site) {
      res.end('❌ Site não especificado!');
      return;
    }

    const regra = `netsh advfirewall firewall add rule name="Bloquear ${site}" dir=out action=block remoteip=${site}`;
    exec(regra, (err) => {
      if (err) {
        console.error(`Erro ao bloquear site: ${err.message}`);
        res.end('❌ Erro ao bloquear o site!');
      } else {
        console.log(`Site bloqueado: ${site}`);
        res.end(`🚫 Site "${site}" bloqueado!`);
      }
    });
  } else {
    res.end('Comando inválido!');
  }
}).listen(PORTA, () => {
  console.log(`Cliente ouvindo na porta ${PORTA}`);
});