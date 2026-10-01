@echo off
chcp 65001 >nul
title Compilador Android - ITO App

cd /d "%~dp0"

echo ===================================================
echo        ITO APP - BUILD ANDROID (DEBUG APK)         
echo ===================================================
echo(

REM ----------------------------------------------------
REM 1. VERIFICACAO DE FERRAMENTAS E AMBIENTE
REM ----------------------------------------------------
echo [1/6] Verificando ferramentas e ambiente do sistema...

REM Verificar Node.js
where node >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
    echo [ERRO] Node.js nao foi encontrado no PATH.
    echo Por favor, instale o Node.js em: https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar NPM
where npm >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
    echo [ERRO] NPM nao foi encontrado no PATH.
    pause
    exit /b 1
)

REM Configurar JAVA_HOME caso nao esteja definido
if not defined JAVA_HOME (
    if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.9.10-hotspot" (
        set "JAVA_HOME=C:\Users\%USERNAME%\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.9.10-hotspot"
    ) else if exist "C:\Program Files\Android\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    )
)

if defined JAVA_HOME (
    echo  - JAVA_HOME configurado em: %JAVA_HOME%
    set "PATH=%JAVA_HOME%\bin;%PATH%"
) else (
    where java >nul 2>&1
    if not "%ERRORLEVEL%"=="0" (
        echo [AVISO] JAVA_HOME nao esta definido e java nao foi encontrado no PATH.
        echo O Gradle pode falhar caso nao encontre um JDK instalado.
    )
)

REM Configurar ANDROID_HOME / SDK
if not defined ANDROID_HOME (
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
        set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
    )
)

if defined ANDROID_HOME (
    echo  - ANDROID_HOME configurado em: %ANDROID_HOME%
) else (
    echo [AVISO] ANDROID_HOME nao foi detectado.
)

REM Garantir arquivo local.properties dentro da pasta android
if exist "android" (
    if not exist "android\local.properties" (
        if defined ANDROID_HOME (
            echo sdk.dir=%ANDROID_HOME:\=\\%> "android\local.properties"
            echo  - Arquivo local.properties gerado com sucesso.
        )
    )
) else (
    echo [ERRO] Pasta android nao encontrada no projeto!
    echo Certifique-se de executar npx cap add android primeiro.
    pause
    exit /b 1
)

REM ----------------------------------------------------
REM 2. VERIFICACAO DE DEPENDENCIAS DO PROJETO
REM ----------------------------------------------------
echo(
echo [2/6] Verificando dependencias do projeto (node_modules)...
if not exist "node_modules" (
    echo  - Pasta node_modules nao encontrada. Instalando dependencias...
    call npm install
    if not "%ERRORLEVEL%"=="0" (
        echo [ERRO] Falha ao instalar dependencias do NPM.
        pause
        exit /b 1
    )
) else (
    echo  - Dependencias do NPM verificadas.
)

REM ----------------------------------------------------
REM 3. COMPILACAO DO FRONTEND (Vite / React)
REM ----------------------------------------------------
echo(
echo [3/6] Executando: npm run build...
call npm run build
if not "%ERRORLEVEL%"=="0" (
    echo(
    echo [ERRO] Falha no comando npm run build. Verifique os erros acima.
    pause
    exit /b 1
)
echo  [OK] Build do frontend concluido com sucesso!

REM ----------------------------------------------------
REM 4. SINCRONIZACAO COM CAPACITOR
REM ----------------------------------------------------
echo(
echo [4/6] Executando: npx cap sync...
call npx cap sync
if not "%ERRORLEVEL%"=="0" (
    echo(
    echo [ERRO] Falha no comando npx cap sync.
    pause
    exit /b 1
)
echo  [OK] Sincronizacao do Capacitor concluida com sucesso!

REM ----------------------------------------------------
REM 5. COMPILACAO DO APK COM GRADLE (assembleDebug)
REM ----------------------------------------------------
echo(
echo [5/6] Entrando no diretorio android...
if not exist "android\gradlew.bat" (
    echo [ERRO] gradlew.bat nao encontrado dentro da pasta android!
    pause
    exit /b 1
)

echo [6/6] Executando: gradlew.bat assembleDebug...
pushd android
cmd /c "gradlew.bat assembleDebug"
set "GRADLE_EXIT=%ERRORLEVEL%"
popd

if not "%GRADLE_EXIT%"=="0" goto :gradle_failed

set "APK_PATH=%~dp0android\app\build\outputs\apk\debug\app-debug.apk"

echo(
echo ===================================================
echo             BUILD CONCLUIDO COM SUCESSO!           
echo ===================================================
echo(
if not exist "%APK_PATH%" goto :no_apk

echo  APK gerado com sucesso em:
echo  %APK_PATH%
echo(
set "OPEN_EXPLORER=N"
set /p OPEN_EXPLORER="Deseja abrir a pasta onde o APK foi gerado? (S/N): "
if /i "%OPEN_EXPLORER%"=="S" explorer.exe /select,"%APK_PATH%"
goto :finish

:gradle_failed
echo(
echo [ERRO] Falha na compilacao do Gradle (assembleDebug).
pause
exit /b 1

:no_apk
echo  [AVISO] O processo finalizou, mas o APK nao foi encontrado no caminho padrao.

:finish
echo(
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
exit /b 0