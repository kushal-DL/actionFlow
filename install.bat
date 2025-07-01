
@echo off
:: BatchGotAdmin
:-------------------------------------
REM  --> Check for permissions
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"

REM --> If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params = %*:"=""
    echo UAC.ShellExecute "cmd.exe", "/c %~s0 %params%", "", "runas", 1 >> "%temp%\getadmin.vbs"

    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"
:--------------------------------------

echo.
echo ==========================================================
echo  ActionFlow Local Host Configuration
echo ==========================================================
echo.
echo This script will add '127.0.0.1 actionflow.com' to your hosts file
echo so you can access the application at http://actionflow.com:9002.
echo.
echo Administrative privileges are required to modify the hosts file.
echo.

set HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts
set HOST_ENTRY=127.0.0.1 actionflow.com

findstr /C:"%HOST_ENTRY%" "%HOSTS_FILE%" >nul
if %errorlevel% equ 0 (
    echo The entry '%HOST_ENTRY%' already exists in your hosts file.
    echo No changes needed.
) else (
    echo Adding '%HOST_ENTRY%' to hosts file...
    echo. >> "%HOSTS_FILE%"
    echo %HOST_ENTRY% >> "%HOSTS_FILE%"
    if %errorlevel% equ 0 (
        echo.
        echo Successfully updated the hosts file.
    ) else (
        echo.
        echo FAILED to update the hosts file. Please try running this script as an Administrator.
    )
)

echo.
echo ==========================================================
echo  Configuration Complete
echo ==========================================================
echo.
echo You can now run the application with 'npm run dev'
echo and access it at: http://actionflow.com:9002
echo.
echo NOTE: HTTPS (https://) is not configured by this script as it
echo requires a more complex local SSL certificate setup.
echo.
pause
