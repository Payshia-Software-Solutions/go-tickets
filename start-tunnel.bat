@echo off
title Cloudflare Tunnel for GoTickets Localhost
echo ============================================================
echo Starting Cloudflare Tunnel to http://localhost:80 ...
echo KEEP THIS WINDOW OPEN WHILE TESTING PAYHERE!
echo ============================================================
echo.
C:\xampp\cloudflared.exe tunnel --url http://localhost:80
pause
