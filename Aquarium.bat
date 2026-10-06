@echo off
rem Double-clic : lance le serveur de dev et ouvre le jeu dans le navigateur.
rem Fermer la fenetre "serveur" l'arrete. Si le serveur tourne deja, on ouvre
rem simplement le jeu. Pour changer de port : modifier PORT ci-dessous.
setlocal
cd /d "%~dp0"
set PORT=8642
set URL=http://localhost:%PORT%/

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
    echo Le serveur tourne deja sur le port %PORT% : j'ouvre le jeu.
    start "" "%URL%"
    exit /b 0
)

set PY=python
where python >nul 2>nul || set PY=py -3

rem cmd /k : si Python est absent ou plante, la fenetre reste ouverte et montre l'erreur.
start "Aquarium - serveur (fermer = arreter)" cmd /k %PY% dev_server.py %PORT%
timeout /t 2 /nobreak >nul
start "" "%URL%"
