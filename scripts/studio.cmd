@echo off
rem Starter fuer Doppelklick (Windows): npm run studio, Argumente werden durchgereicht.
cd /d "%~dp0.."
call npm run studio -- %*
pause
