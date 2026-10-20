@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js 22.13 or newer is required.& pause & exit /b 1)
if not exist node_modules (echo Installing project packages...& npm install || (pause & exit /b 1))
if not exist .env copy .env.example .env >nul
npm run dev
