@echo off
echo ========================================
echo Starting Chancify AI Backend + Ngrok
echo ========================================
echo.

echo Step 1: Starting Backend Server...
echo.
cd backend
start "Chancify Backend" cmd /k "python main.py"
timeout /t 5 >nul
echo Backend starting in new window...
echo.

echo Step 2: Starting Ngrok Tunnel...
echo.
start "Ngrok Tunnel" cmd /k "ngrok http 8000"
timeout /t 3 >nul
echo Ngrok starting in new window...
echo.

echo ========================================
echo Both services are starting!
echo ========================================
echo.
echo Backend: http://localhost:8000
echo Ngrok: Check the ngrok window for the public URL
echo.
echo Wait 10 seconds for services to start, then test:
echo https://chancifybackendnonpostrges.up.railway.app/api/auth/me
echo.
echo Press any key to exit this window (services will keep running)...
pause >nul

