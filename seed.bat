@echo off
setlocal
cd /d "%~dp0"
title Party Games - Seed Database
echo ====================================================
echo        Repopulando Banco de Dados
echo ====================================================
echo.
npm run seed
echo.
pause
