@echo off
setlocal
cd /d "%~dp0"
title Party Games - Backend
echo ====================================================
echo        Iniciando Backend Python (FastAPI)
echo        Docs: http://localhost:8000/docs
echo ====================================================
echo.
npm run backend
pause
