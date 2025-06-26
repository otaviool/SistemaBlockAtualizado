const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const http = require('http');




const app = express();
app.use(express.static(path.join(__dirname, 'Public')));
const PORT = 8080;

function enviarComandoRemoto(ip, comando) {
  http.get(`http://${ip}:3333/${comando}`, res => {
    let dados = '';
    res.on('data', chunk => dados += chunk);
    res.on('end', () => console.log(`Resposta de ${ip}: ${dados}`));
  }).on('error', err => {
    console.error(`Falha ao comunicar com ${ip}: ${err.message}`);
  });
} 

const pcs = ['192.168.0.101', '192.168.0.102'];

app.get('/bloquearTodos', (req, res) => {
  pcs.forEach(ip => enviarComandoRemoto(ip, 'bloquear'));
  res.sendFile(path.join(__dirname, 'views', 'Bloqueado.html'));
});

app.get('/desbloquearTodos', (req, res) => {
  pcs.forEach(ip => enviarComandoRemoto(ip, 'desbloquear'));
  res.sendFile(path.join(__dirname, 'views', 'Desbloqueado.html'));
});

const USUARIO = 'admin';
const SENHA = '1234';
let autenticado = false;

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    if (!autenticado) {
       res.sendFile(path.join(__dirname, 'views', 'Login.html'));
    } else {
        res.sendFile(path.join(__dirname, 'views', 'Painel.html'));
    }
});

app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === USUARIO && senha === SENHA) {
        autenticado = true;
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'views', 'Erro.html'));
     }
});

app.get('/logout', (req, res) => {
    autenticado = false;
    res.redirect('/');
});

app.get('/bloquear', (req, res) => {
    if (autenticado) {
        executarComando('netsh advfirewall set allprofiles state on');
        res.sendFile(path.join(__dirname, 'views', 'Bloqueado.html'));
    } else {
        res.redirect('/');

    }
});

app.get('/desbloquear', (req, res) => {
    if (autenticado) {
        executarComando('netsh advfirewall set allprofiles state off');
         res.sendFile(path.join(__dirname, 'views', 'Desbloqueado.html'));
} else {
           res.redirect('/');
     }
});

function executarComando(comando) {
    exec(comando, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erro: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Erro: ${stderr}`);
            return;
        }
        console.log(`Saída: ${stdout}`);
    });
}

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}...`);
});
