@echo off
cd /d "%~dp0"
title Copy old data into the office server
node import-old-data.js
pause
