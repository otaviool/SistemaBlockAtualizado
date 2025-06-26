const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session'); // Adicionado
const { exec } = require('child_process');
const bcrypt = require('bcrypt'); // Adicionado
const rateLimit = require('express-rate-limit'); // Adicionado

const app = express();
const PORT = 8080;

// Configuração do rate limiting (proteção contra brute force)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5 // limite de 5 tentativas
});

// Configuração de sessão
app.use(session({
  secret: 'chave_secreta_forte_aqui', // Altere para uma string complexa
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Defina como true se usar HTTPS
}));

// Dados do usuário (em produção, use um banco de dados)
const USUARIO = 'admin';
const SENHA_HASH = bcrypt.hashSync('1234', 10); // Senha hasheada

app.use(bodyParser.urlencoded({ extended: true }));

// Rotas de autenticação
app.get('/', (req, res) => {
  if (!req.session.autenticado) {
    res.send(`
      <h2>Login</h2>
      <form method='post' action='/login'>
        Usuário: <input type='text' name='usuario'><br>
        Senha: <input type='password' name='senha'><br>
        <button type='submit'>Entrar</button>
      </form>
    `);
  } else {
    res.send(`
      <h2>Bem-vindo!</h2>
      <a href='/bloquear'>Bloquear Internet</a> | 
      <a href='/desbloquear'>Desbloquear Internet</a> | 
      <a href='/logout'>Sair</a>
    `);
  }
});

// Rota de login com proteção contra brute force
app.post('/login', limiter, async (req, res) => {
  const { usuario, senha } = req.body;
  
  if (usuario === USUARIO && await bcrypt.compare(senha, SENHA_HASH)) {
    req.session.autenticado = true;
    res.redirect('/');
  } else {
    res.status(401).send(`
      <h2>Erro: Usuário ou senha incorretos!</h2>
      <a href='/'>Tente novamente</a>
    `);
  }
});

// Rotas protegidas
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/bloquear', (req, res) => {
  if (req.session.autenticado) {
    executarComando('netsh advfirewall set allprofiles state on');
    res.send("<h2>Internet bloqueada!</h2><a href='/'>Voltar</a>");
  } else {
    res.status(403).send("<h2>Acesso negado!</h2><a href='/'>Fazer login</a>");
  }
});

app.get('/desbloquear', (req, res) => {
  if (req.session.autenticado) {
    executarComando('netsh advfirewall set allprofiles state off');
    res.send("<h2>Internet desbloqueada!</h2><a href='/'>Voltar</a>");
  } else {
    res.status(403).send("<h2>Acesso negado!</h2><a href='/'>Fazer login</a>");
  }
});

// Função para executar comandos
function executarComando(comando) {
  exec(comando, (error, stdout, stderr) => {
    if (error) console.error(`Erro: ${error.message}`);
    if (stderr) console.error(`Erro: ${stderr}`);
    console.log(`Saída: ${stdout}`);
  });
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}...`);
  console.log(`Credenciais padrão: admin/1234`);
});

