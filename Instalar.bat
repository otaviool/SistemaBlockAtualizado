@echo off
set destino=%ProgramData%\FirewallCliente

echo Criando pasta do cliente...
mkdir "%destino%" >nul 2>&1

echo Copiando ClienteFirewall.exe...
copy /Y "ClienteFirewall.exe" "%destino%\ClienteFirewall.exe"

echo Criando atalho na inicialização...
copy /Y "%destino%\ClienteFirewall.exe" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ClienteFirewall.exe"

echo Iniciando o cliente...
start "" "%destino%\ClienteFirewall.exe"

echo.
echo ✅ Cliente instalado com sucesso!
pause