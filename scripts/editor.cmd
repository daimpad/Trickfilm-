@echo off
rem Starter fuer Doppelklick (Windows): npm run editor, Argumente werden durchgereicht.
cd /d "%~dp0.."
call npm run editor -- %*
pause
