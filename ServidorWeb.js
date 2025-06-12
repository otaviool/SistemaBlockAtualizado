const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const PORT = 8080;

const USUARIO = 'admin';
const SENHA = '1234';
let autenticado = false;

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    if (!autenticado) {
        res.send(`<h2>Login</h2>
                  <form method='post' action='/login'>
                  Usuário: <input type='text' name='usuario'><br>
                  Senha: <input type='password' name='senha'><br>
                  <button type='submit'>Entrar</button></form>`);
    } else {
        res.send(`<h2>Bem-vindo!</h2>
                  <a href='/bloquear'>Bloquear Internet</a> | 
                  <a href='/desbloquear'>Desbloquear Internet</a> | 
                  <a href='/logout'>Sair</a>`);
    }
});

app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === USUARIO && senha === SENHA) {
        autenticado = true;
        res.redirect('/');
    } else {
        res.send(`<h2>Erro: Usuário ou senha incorretos!</h2><a href='/'>Tente novamente</a>`);
    }
});

app.get('/logout', (req, res) => {
    autenticado = false;
    res.redirect('/');
});

app.get('/bloquear', (req, res) => {
    if (autenticado) {
        executarComando('netsh advfirewall set allprofiles state on');
        res.send("<h2>Internet bloqueada!</h2><a href='/'>Voltar</a>");
    } else {
        res.send("<h2>Acesso negado!</h2><a href='/'>Fazer login</a>");
    }
});

app.get('/desbloquear', (req, res) => {
    if (autenticado) {
        executarComando('netsh advfirewall set allprofiles state off');
        res.send("<h2>Internet desbloqueada!</h2><a href='/'>Voltar</a>");
    } else {
        res.send("<h2>Acesso negado!</h2><a href='/'>Fazer login</a>");
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
