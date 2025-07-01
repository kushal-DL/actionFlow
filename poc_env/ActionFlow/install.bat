@echo off
rem Author: Kushal Sharma
setlocal

echo ========================================
echo  ActionFlow Application Setup
echo ========================================
echo.
echo [INFO] This script will install the necessary dependencies for the app.
echo.

echo [STEP 1] Checking for .env file...
if not exist ".env" (
    echo [WARNING] .env file not found.
    echo Please create a file named '.env' in this directory with the following content:
    echo.
    echo LLM_MODEL_NAME="your_model_name_here"
    echo LLM_API_URL="http://127.0.0.1:11434"
    echo TRANSCRIPTION_SAVE_PATH="src/data/transcriptions"
    echo.
    echo [ACTION] Pausing for you to create the file...
    pause
) else (
    echo [SUCCESS] .env file found.
)
echo.

echo [STEP 2] Installing dependencies...
npm install

echo.
echo [SUCCESS] Setup complete!
echo You can now run 'launch.bat' to start the application.
echo.
pause
