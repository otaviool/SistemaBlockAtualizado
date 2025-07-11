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

setInterval(() => {
  const agPath = path.join(__dirname, 'agendamentos.json');
  if (!fs.existsSync(agPath)) return;

  const agora = new Date();
  const horaAtual = agora.toTimeString().slice(0, 5); // HH:mm

  const agendados = JSON.parse(fs.readFileSync(agPath));
  agendados.forEach(ag => {
    if (ag.horario === horaAtual) {
      if (grupos[ag.grupo]) {
        grupos[ag.grupo].forEach(ip => enviarComandoRemoto(ip, ag.acao));
        registrarLog('Sistema', `${ag.acao} agendado`, ag.grupo);
      } else {
        executarComando(`netsh advfirewall set allprofiles state ${ag.acao === 'bloquear' ? 'on' : 'off'}`);
        registrarLog('Sistema', `${ag.acao} agendado`, 'todos');
      }
    }
  });
}, 60000); // verifica a cada minuto

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

function registrarLog(usuario, acao, grupo) {
  const logPath = path.join(__dirname, 'logs.json');
  const logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];

  const novoLog = {
    usuario,
    acao,
    grupo,
    data: new Date().toLocaleString('pt-BR')
  };

  logs.push(novoLog);
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
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
app.get('/agendarSite', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'views', 'Agendar.html'));
});

app.post('/agendar', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');
  const { grupo, acao, horario } = req.body;
  const agPath = path.join(__dirname, 'agendamentos.json');
  const ags = fs.existsSync(agPath) ? JSON.parse(fs.readFileSync(agPath)) : [];

  ags.push({ grupo, acao, horario, criadoPor: req.session.usuario });
  fs.writeFileSync(agPath, JSON.stringify(ags, null, 2));

  res.send(`<h2 style="text-align: center;">✅ Agendamento salvo para ${grupo} às ${horario} (${acao})</h2><a href="/" style="display:block;text-align:center;color:#007BFF;">🔙 Voltar</a>`);
});

app.get('/bloquear', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');
  const grupo = req.query.grupo;

  if (grupo && grupos[grupo]) {
    grupos[grupo].forEach(ip => enviarComandoRemoto(ip, 'bloquear'));
    registrarLog(req.session.usuario, 'bloqueou', grupo);
  } else {
    executarComando('netsh advfirewall set allprofiles state on');
    registrarLog(req.session.usuario, 'bloqueou', 'todos');
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
app.get('/bloquearSite', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');
  const site = req.query.site;
  const grupo = req.query.grupo;

  if (!site || !grupo || !grupos[grupo]) {
    return res.send(`<h2 style="color: crimson; text-align: center;">❌ Parâmetros inválidos!</h2>`);
  }

  grupos[grupo].forEach(ip => {
    http.get(`http://${ip}:3333/bloquearSite?site=${encodeURIComponent(site)}`, res => {
      let dados = '';
      res.on('data', chunk => dados += chunk);
      res.on('end', () => console.log(`Resposta de ${ip}: ${dados}`));
    }).on('error', err => {
      console.error(`Erro ao enviar comando para ${ip}: ${err.message}`);
    });
  });

  registrarLog(req.session.usuario, `bloqueou o site "${site}"`, grupo);

  res.send(`
    <h2 style="color: orange; text-align: center; margin-top: 50px;">
      🚫 Site "${site}" bloqueado no grupo ${grupo}!
    </h2>
    <a href="/" style="display: block; text-align: center; margin-top: 20px; font-weight: bold; color: #007BFF;">
      🔙 Voltar para o Painel
    </a>
  `);
});

app.get('/site', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'views', 'Site.html'));
});

app.get('/siteComando', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');
  const { site, grupo, acao } = req.query;

  if (!site || !grupo || !grupos[grupo]) {
    return res.send(`<h2 style="color: crimson; text-align: center;">❌ Parâmetros inválidos!</h2>`);
  }

  grupos[grupo].forEach(ip => {
    http.get(`http://${ip}:3333/${acao}site?site=${encodeURIComponent(site)}`, resposta => {
      let dados = '';
      resposta.on('data', chunk => dados += chunk);
      resposta.on('end', () => console.log(`Resposta de ${ip}: ${dados}`));
    }).on('error', err => {
      console.error(`Erro ao comunicar com ${ip}: ${err.message}`);
    });
  });

  registrarLog(req.session.usuario, `${acao} o site "${site}"`, grupo);

  res.send(`
    <h2 style="text-align: center; margin-top: 50px; color: ${acao === 'bloquear' ? 'crimson' : 'seagreen'};">
      ${acao === 'bloquear' ? '🚫' : '✅'} Site "${site}" ${acao}ado no grupo ${grupo}!
    </h2>
    <a href="/" style="display: block; text-align: center; margin-top: 20px; font-weight: bold; color: #007BFF;">
      🔙 Voltar para o Painel
    </a>
  `);
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
  const { nome, usuario, senha, email, cargo, departamento } = req.body;
  const caminho = path.join(__dirname, 'usuarios.json');
  const dados = fs.existsSync(caminho)
    ? JSON.parse(fs.readFileSync(caminho))
    : [];

  // ✅ Verificação do e-mail institucional
  if (!email.endsWith('@if.edu.br')) {
    return res.send(`
      <h2 style="color: crimson; text-align: center; margin-top: 50px;">
         E-mail inválido!
      </h2>
      <a href="/cadastro" style="display: block; text-align: center; margin-top: 20px; font-weight: bold; color: #007BFF;">
         Tentar novamente
      </a>
    `);
  }

  // ⚠️ Verificação de duplicidade de usuário
  if (dados.find(u => u.usuario === usuario)) {
    return res.send(`
      <h2 style="color: crimson; text-align: center; margin-top: 50px;">
        ⚠️ Usuário já cadastrado!
      </h2>
      <a href="/cadastro" style="display: block; text-align: center; margin-top: 20px; font-weight: bold; color: #007BFF;">
         Tente outro
      </a>
    `);
  }

  // ✅ Adiciona o novo usuário
  const novoUsuario = { nome, usuario, senha, email, cargo, departamento };
  dados.push(novoUsuario);
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));

  res.send(`
    <h2 style="color: green; text-align: center; margin-top: 50px;">
      ✅ Usuário cadastrado com sucesso!
    </h2>
    <a href="/" style="display: block; text-align: center; margin-top: 20px; font-weight: bold; color: #00923F;">
      Voltar para Login
    </a>
  `);
});


app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;
  const caminho = path.join(__dirname, 'usuarios.json');
  const usuarios = fs.existsSync(caminho) ? JSON.parse(fs.readFileSync(caminho)) : [];
  const valido = usuarios.find(u => u.usuario === usuario && u.senha === senha);

  if (valido) {
    req.session.autenticado = true;
    req.session.usuario = usuario;
    res.redirect('/');
  } else {
    res.sendFile(path.join(__dirname, 'views', 'Erro.html'));
  }
});

app.get('/historico', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');

  const logPath = path.join(__dirname, 'logs.json');
  const logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];

  let html = `
    <h2 style="text-align: center; margin-top: 30px;"> Histórico de Ações</h2>
    <table border="1" style="margin: 20px auto; border-collapse: collapse; width: 80%;">
      <thead>
        <tr style="background-color: #f0f0f0;">
          <th>Usuário</th>
          <th>Ação</th>
          <th>Grupo</th>
          <th>Data e Hora</th>
        </tr>
      </thead>
      <tbody>
  `;

  logs.reverse().forEach(log => {
    html += `
      <tr>
        <td style="text-align: center;">${log.usuario}</td>
        <td style="text-align: center;">${log.acao}</td>
        <td style="text-align: center;">${log.grupo}</td>
        <td style="text-align: center;">${log.data}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <div style="text-align: center;">
      <a href="/" style="font-weight: bold; color: #007BFF;"> Voltar para o Painel</a>
    </div>
  `;

  res.send(html);
});

app.get('/alterarSenha', (req, res) => {
  if (!req.session.autenticado) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'views', 'AlterarSenha.html'));
});

app.post('/alterarSenha', (req, res) => {
  const { atual, nova, confirmar } = req.body;
  const caminho = path.join(__dirname, 'usuarios.json');
  const dados = JSON.parse(fs.readFileSync(caminho));

  const index = dados.findIndex(u => u.usuario === req.session.usuario);
  if (index === -1 || dados[index].senha !== atual) {
    return res.send(`<h2 style="color: crimson;">❌ Senha atual incorreta!</h2>`);
  }
  if (nova !== confirmar) {
    return res.send(`<h2 style="color: crimson;">❌ As senhas não coincidem!</h2>`);
  }

  dados[index].senha = nova;
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
  res.send(`<h2 style="color: green;">✅ Senha alterada com sucesso!</h2>`);
});

app.get('/redefinir', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'Redefinir.html'));
});

app.post('/redefinirSenha', (req, res) => {
  const { usuario, email } = req.body;
  const caminho = path.join(__dirname, 'usuarios.json');
  const dados = JSON.parse(fs.readFileSync(caminho));
  const index = dados.findIndex(u => u.usuario === usuario && u.email === email);

  if (index === -1) {
    return res.send(`<h2 style="color: crimson;">❌ Usuário ou e-mail inválido!</h2>`);
  }

  const novaSenha = Math.random().toString(36).slice(-8); // senha aleatória
  dados[index].senha = novaSenha;
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
  res.send(`<h2 style="color: green;">✅ Senha redefinida: <code>${novaSenha}</code></h2>`);
});
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}...`);
});