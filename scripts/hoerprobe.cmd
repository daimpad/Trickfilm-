@echo off
rem Starter fuer Doppelklick (Windows): npm run sfx:hoerprobe, Argumente werden durchgereicht.
cd /d "%~dp0.."
call npm run sfx:hoerprobe -- %*
pause
