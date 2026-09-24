@echo off
title AlphaSignals 24/7 Trading Terminal (Binance & Zerodha Kite)
color 0A
echo ========================================================
echo   ALPHASIGNALS 24/7 TERMINAL (BINANCE ^& ZERODHA KITE)
echo ========================================================
echo.
echo Starting AlphaSignals Backend ^& Auto-Exit Engine on Port 5000...
start /B "" "C:\Users\ViruSss\AppData\Local\ms-playwright-go\1.57.0\node.exe" "%~dp0server\server.js"
timeout /t 2 /nobreak >nul
echo.
echo Opening Local Browser: http://localhost:5000
start http://localhost:5000
echo.
echo Starting Official Cloudflare Global Tunnel for Mobile 4G/5G Access...
"%~dp0server\cloudflared.exe" tunnel --url http://localhost:5000
pause
