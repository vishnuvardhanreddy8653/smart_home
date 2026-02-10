@echo off
REM Smart Home SSL/TLS Certificate Generation Script for Windows
REM This script generates self-signed certificates for development/testing

setlocal enabledelayedexpansion

Set "SCRIPT_DIR=%~dp0"
Set "CERT_DIR=%SCRIPT_DIR%certs"

echo.
echo 🔐 Smart Home SSL/TLS Certificate Generator (Windows)
echo =====================================================
echo.

REM Check if certificates already exist
if exist "%CERT_DIR%\cert.pem" if exist "%CERT_DIR%\key.pem" (
    echo ⚠️  Certificates already exist in %CERT_DIR%
    set /p REGEN="Do you want to regenerate them? (y/n): "
    if /i not "!REGEN!"=="y" (
        echo ✅ Using existing certificates
        exit /b 0
    )
    echo 🗑️  Removing old certificates...
    del "%CERT_DIR%\cert.pem" "%CERT_DIR%\key.pem"
)

REM Create certs directory if it doesn't exist
if not exist "%CERT_DIR%" mkdir "%CERT_DIR%"

echo 📝 Please answer the following questions to generate your certificate:
echo.

set /p COUNTRY="Country (e.g., US): "
set /p STATE="State/Province (e.g., California): "
set /p CITY="City (e.g., San Francisco): "
set /p ORG="Organization (e.g., Smart Home): "
set /p OU="Organizational Unit (e.g., IoT): "
set /p CN="Common Name - Domain or Hostname (e.g., localhost): "
set /p EMAIL="Email Address: "
set /p DAYS="Validity in days (e.g., 365): "

if "%DAYS%"=="" set DAYS=365

echo.
echo 🔑 Generating certificate with the following details:
echo   Country: %COUNTRY%
echo   State: %STATE%
echo   City: %CITY%
echo   Organization: %ORG%
echo   Unit: %OU%
echo   Common Name: %CN%
echo   Email: %EMAIL%
echo   Valid for: %DAYS% days
echo.

REM Check if openssl is installed
where openssl >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: OpenSSL is not installed or not in PATH
    echo.
    echo Please install OpenSSL:
    echo Option 1: Download from https://slproweb.com/products/Win32OpenSSL.html
    echo Option 2: Use Windows Subsystem for Linux (WSL)
    echo Option 3: Use choco install openssl
    echo.
    pause
    exit /b 1
)

REM Generate self-signed certificate
echo ⏳ Generating certificate...
openssl req -x509 -newkey rsa:4096 -nodes ^
    -out "%CERT_DIR%\cert.pem" ^
    -keyout "%CERT_DIR%\key.pem" ^
    -days %DAYS% ^
    -subj "/C=%COUNTRY%/ST=%STATE%/L=%CITY%/O=%ORG%/OU=%OU%/CN=%CN%/emailAddress=%EMAIL%"

if %errorlevel% equ 0 (
    echo.
    echo ✅ Certificate generation completed!
    echo.
    echo 📂 Certificate files created:
    echo    - %CERT_DIR%\cert.pem (Certificate)
    echo    - %CERT_DIR%\key.pem (Private Key)
    echo.
    
    echo 📋 Certificate Information:
    openssl x509 -in "%CERT_DIR%\cert.pem" -text -noout | find "Subject:" 
    openssl x509 -in "%CERT_DIR%\cert.pem" -text -noout | find "Issuer:" 
    openssl x509 -in "%CERT_DIR%\cert.pem" -text -noout | find "Not Before" 
    openssl x509 -in "%CERT_DIR%\cert.pem" -text -noout | find "Not After" 
    
    echo.
    echo 🚀 Next steps:
    echo    1. Update frontend/nginx.conf if certificate paths changed
    echo    2. Run: docker-compose up --build
    echo    3. Access: https://localhost
    echo.
    echo ⚠️  Note: Self-signed certificate will trigger browser warnings
    echo    Click 'Advanced' and 'Proceed to localhost' to continue
    echo.
) else (
    echo ❌ Error: Certificate generation failed
    echo Please check your inputs and try again
    pause
    exit /b 1
)

pause
