@echo off
title ActionFlow Launcher

echo Starting the ActionFlow application server...
echo This window will remain open. You can close it to stop the server.

REM Start the Next.js development server in a new window
start "ActionFlow Server" npm run dev

echo Waiting for the server to start up...
REM Give the server a moment to initialize before opening the browser
timeout /t 10 /nobreak > nul

echo Opening ActionFlow in your default browser...
start http://localhost:9002

exit
