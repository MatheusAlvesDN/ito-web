@echo off
setlocal
cd /d "%~dp0"
title Party Games - Frontend
echo ====================================================
echo        Iniciando Frontend Web (Vite)
echo        App: http://localhost:5173
echo ====================================================
echo.
npm run dev
pause
