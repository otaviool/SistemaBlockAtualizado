const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { exec } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

const app = express();
const PORT = 8080;

// Middlewares
app.use(express.static(path.join(__dirname, 'Public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'senha-secreta-top',
  resave: false,
  saveUninitialized: false
}));

// Funções utilitárias
function enviarComandoRemoto(ip, comando) {
  http.get(`http://${ip}:3333/${comando}`, res => {
    let dados = '';
    res.on('data', chunk => dados += chunk);
    res.on('end', () => console.log(`Resposta de ${ip}: ${dados}`));
  }).on('error', err => {
    console.error(`Falha ao comunicar com ${ip}: ${err.message}`);
  });
}

function executarComando(comando) {
  exec(comando, (error, stdout, stderr) => {
    if (error) return console.error(`Erro: ${error.message}`);
    if (stderr) return console.error(`Erro: ${stderr}`);
    console.log(`Saída: ${stdout}`);
  });
}

// Grupos
const grupos = {
  lab01: ['192.168.0.10', '192.168.0.11'],
  lab02: ['192.168.0.20', '192.168.0.21'],
  lab03: ['192.168.0.30', '192.168.0.31'],
  lab04: ['192.168.0.40', '192.168.0.41'],
  lab05: ['192.168.0.50', '192.168.0.51']
};

// Rotas protegidas
app.get('/bloquear', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');
  const grupo = req.query.grupo;
  if (grupo && grupos[grupo]) {
    grupos[grupo].forEach(ip => enviarComandoRemoto(ip, 'bloquear'));
  } else {
    executarComando('netsh advfirewall set allprofiles state on');
  }
  res.sendFile(path.join(__dirname, 'views', 'Bloqueado.html'));
});

app.get('/desbloquear', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');
  const grupo = req.query.grupo;
  if (grupo && grupos[grupo]) {
    grupos[grupo].forEach(ip => enviarComandoRemoto(ip, 'desbloquear'));
  } else {
    executarComando('netsh advfirewall set allprofiles state off');
  }
  res.sendFile(path.join(__dirname, 'views', 'Desbloqueado.html'));
});

app.get('/bloquearTodos', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');
  Object.values(grupos).flat().forEach(ip => enviarComandoRemoto(ip, 'bloquear'));
  res.sendFile(path.join(__dirname, 'views', 'Bloqueado.html'));
});

app.get('/desbloquearTodos', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');
  Object.values(grupos).flat().forEach(ip => enviarComandoRemoto(ip, 'desbloquear'));
  res.sendFile(path.join(__dirname, 'views', 'Desbloqueado.html'));
});

// Login & cadastro
app.get('/', (req, res) => {
  const caminho = req.session.autenticado
    ? path.join(__dirname, 'views', 'Painel.html')
    : path.join(__dirname, 'views', 'Login.html');
  res.sendFile(caminho);
});

app.get('/cadastro', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'Cadastro.html'));
});

app.post('/cadastro', (req, res) => {
  const { usuario, senha } = req.body;
  const caminho = path.join(__dirname, 'usuarios.json');
  const dados = fs.existsSync(caminho) ? JSON.parse(fs.readFileSync(caminho)) : [];

  if (dados.find(u => u.usuario === usuario)) {
    return res.send(`<h2>Usuário já cadastrado!</h2><a href="/cadastro">Tente outro</a>`);
  }

  dados.push({ usuario, senha });
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
  res.redirect('/');
});

app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;
  const caminho = path.join(__dirname, 'usuarios.json');
  const usuarios = fs.existsSync(caminho) ? JSON.parse(fs.readFileSync(caminho)) : [];
  const valido = usuarios.find(u => u.usuario === usuario && u.senha === senha);

  if (valido) {
    req.session.autenticado = true;
    res.redirect('/');
  } else {
    res.sendFile(path.join(__dirname, 'views', 'Erro.html'));
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}...`);
});