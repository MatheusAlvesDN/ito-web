@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Party Games - Setup Inicial

echo ====================================================
echo        PARTY GAMES - INSTALACAO DE DEPENDENCIAS
echo ====================================================
echo.

echo [1/3] Verificando ambiente Node.js e instalando dependencias Frontend...
call npm --version > nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js / npm nao foi encontrado no sistema!
    echo Instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Executando 'npm install'...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao executar 'npm install'.
        pause
        exit /b 1
    )
    echo [OK] Dependencias do Frontend instaladas com sucesso!
) else (
    echo [OK] Dependencias do Frontend (node_modules) ja instaladas!
)
echo.

echo ====================================================
echo [2/3] Verificando ambiente Python e configurando Backend...

set "PYTHON_EXE="

:: 1. Tentar python no PATH
call python --version > nul 2>&1
if not errorlevel 1 (
    set "PYTHON_EXE=python"
)

:: 2. Tentar py launcher
if "!PYTHON_EXE!"=="" (
    call py --version > nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_EXE=py"
    )
)

:: 3. Tentar caminho padrao do Python 3.12 no LocalAppData
if "!PYTHON_EXE!"=="" (
    if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    )
)

:: 4. Se ainda nao encontrou
if "!PYTHON_EXE!"=="" (
    echo [ERRO] Executavel do Python nao foi localizado.
    echo Baixe ou repare a instalacao em: https://www.python.org/
    pause
    exit /b 1
)

echo Usando Python em: !PYTHON_EXE!
echo.

if not exist "backend\.venv\Scripts\python.exe" (
    echo Criando ambiente virtual Python em 'backend\.venv'...
    call "!PYTHON_EXE!" -m venv backend\.venv
    if errorlevel 1 (
        echo [ERRO] Falha ao criar ambiente virtual em 'backend\.venv'.
        pause
        exit /b 1
    )
    echo [OK] Ambiente virtual criado em 'backend\.venv'!
) else (
    echo [OK] Ambiente virtual 'backend\.venv' ja existe.
)

echo Instalando dependencias do Python a partir de 'backend\requirements.txt'...
call backend\.venv\Scripts\python.exe -m pip install --upgrade pip
call backend\.venv\Scripts\pip install -r backend\requirements.txt
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias do Backend.
    pause
    exit /b 1
)
echo [OK] Dependencias do Backend instaladas com sucesso!
echo.

echo ====================================================
echo [3/3] Inicializacao do Banco de Dados
echo Deseja popular o banco de dados inicial agora (npm run seed)? (S/N)
set /p RUN_SEED_CHOICE="Opcao [S/N]: "

if /i "!RUN_SEED_CHOICE!"=="S" (
    echo.
    echo Executando seed...
    call npm run seed
    echo.
)

echo ====================================================
echo Configuracao concluida com sucesso!
echo Agora voce pode executar o 'run.bat' para iniciar os servidores.
echo ====================================================
echo.
pause
