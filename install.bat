@echo off
cls
echo ========================================
echo  ActionFlow Application Setup
echo ========================================
echo.
echo [INFO] This script will install the necessary dependencies for the app.
echo.
echo [STEP 1] Checking for .env file...

if exist ".env" goto install_deps

echo.
echo [ERROR] .env file not found!
echo.
echo Please create a file named '.env' in this directory with the following content:
echo.
echo # REQUIRED: The name of the model you have downloaded via `ollama run ^<model_name^>`
echo LLM_MODEL_NAME="your_model_name"
echo.
echo # OPTIONAL: The URL of your Ollama server (defaults to local)
echo LLM_API_URL="http://127.0.0.1:11434"
echo.
echo # REQUIRED: The directory to save live transcriptions
echo TRANSCRIPTION_SAVE_PATH="src/data/transcriptions"
echo.
pause
goto :eof

:install_deps
echo [SUCCESS] .env file found.
echo.
echo [STEP 2] Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed. Please check your Node.js and npm setup.
    pause
    goto :eof
)

echo.
echo [SUCCESS] All dependencies have been installed successfully.
echo.
echo You can now run 'launch.bat' to start the application.
echo.
pause
goto :eof
