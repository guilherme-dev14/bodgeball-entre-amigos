@echo off
setlocal
cd /d "%~dp0"
title BodgeBall - entre amigos
"%~dp0runtime\node.exe" "%~dp0servidor.cjs"
if errorlevel 1 pause
