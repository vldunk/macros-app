@echo off
setlocal

cd /d "%~dp0"

set "HOST=0.0.0.0"
set "PHONE_IP=192.168.0.146"
set "PORT=8080"

echo.
echo Blueprint Nutrition phone preview
echo --------------------------------
echo Open this URL on your phone:
echo http://%PHONE_IP%:%PORT%/
echo.
echo Keep this window open while testing.
echo Press Ctrl+C to stop the server.
echo.

py -m http.server %PORT% --bind %HOST%
if errorlevel 1 (
    echo.
    echo Python launcher failed. Trying python.exe...
    python -m http.server %PORT% --bind %HOST%
)

endlocal
