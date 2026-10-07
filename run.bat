@echo off
setlocal
cd /d "%~dp0"
title Party Games - Launcher

:MENU
cls
echo ====================================================
echo             PARTY GAMES - GERENCIADOR
echo ====================================================
echo.
echo  [0] Setup Inicial (Instalar dependencias Frontend e Backend)
echo  [1] Iniciar Tudo (Backend + Frontend em janelas separadas)
echo  [2] Iniciar Backend Python (npm run backend)
echo  [3] Iniciar Frontend Web (npm run dev)
echo  [4] Repopular Banco de Dados (npm run seed)
echo  [5] Sair
echo.
echo ====================================================
set /p OPTION="Escolha uma opcao (0-5): "

if "%OPTION%"=="0" goto RUN_SETUP
if "%OPTION%"=="1" goto START_ALL
if "%OPTION%"=="2" goto START_BACKEND
if "%OPTION%"=="3" goto START_FRONTEND
if "%OPTION%"=="4" goto RUN_SEED
if "%OPTION%"=="5" goto EXIT_SCRIPT

echo Opcao invalida! Tente novamente.
timeout /t 2 > nul
goto MENU

:RUN_SETUP
call setup.bat
goto MENU

:START_ALL
if not exist "node_modules" goto WARN_SETUP
if not exist "backend\.venv\Scripts\uvicorn.exe" goto WARN_SETUP

echo.
echo Iniciando Backend Python em nova janela...
start "Party Games - Backend (Port 8000)" cmd /k "cd /d ""%~dp0"" && npm run backend"
timeout /t 2 > nul
echo Iniciando Frontend Web em nova janela...
start "Party Games - Frontend (Port 5173)" cmd /k "cd /d ""%~dp0"" && npm run dev"
echo.
echo Servidores iniciados em janelas separadas!
echo  - Backend:  http://localhost:8000/docs
echo  - Frontend: http://localhost:5173
echo.
pause
goto MENU

:START_BACKEND
if not exist "backend\.venv\Scripts\uvicorn.exe" goto WARN_SETUP
echo.
echo Iniciando Backend Python...
echo Acesse http://localhost:8000/docs
echo.
npm run backend
pause
goto MENU

:START_FRONTEND
if not exist "node_modules" goto WARN_SETUP
echo.
echo Iniciando Frontend Web...
echo Acesse http://localhost:5173
echo.
npm run dev
pause
goto MENU

:RUN_SEED
if not exist "backend\.venv\Scripts\python.exe" goto WARN_SETUP
echo.
echo Executando seed no banco de dados...
echo.
npm run seed
echo.
pause
goto MENU

:WARN_SETUP
echo.
echo ====================================================
echo [AVISO] Dependencias nao configuradas!
echo E necessario executar o Setup Inicial antes de iniciar.
echo ====================================================
echo Deseja executar o setup agora? (S/N)
set /p CONFIRM_SETUP="Opcao [S/N]: "
if /i "%CONFIRM_SETUP%"=="S" (
    call setup.bat
)
goto MENU

:EXIT_SCRIPT
exit
