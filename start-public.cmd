@echo off
setlocal
title Board Arena - Public server
where node >nul 2>nul
if errorlevel 1 goto missing_node
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if errorlevel 1 goto missing_node
node -e "fetch('http://127.0.0.1:3001/api/arena/games',{signal:AbortSignal.timeout(1500)}).then(r=>process.exit(r.ok?1:0)).catch(()=>process.exit(0))"
if errorlevel 1 (
  echo The development API is still running on port 3001.
  echo Stop it with Ctrl+C before using the public server. Both would share the same database.
  goto end
)

if not exist "%~dp0api\node_modules" (
  pushd "%~dp0api"
  call npm ci
  if errorlevel 1 (
    popd
    goto failed
  )
  popd
)
if not exist "%~dp0ui_chess\node_modules" (
  pushd "%~dp0ui_chess"
  call npm ci
  if errorlevel 1 (
    popd
    goto failed
  )
  popd
)

echo Building the game website...
pushd "%~dp0ui_chess"
call npm exec -- vite build
if errorlevel 1 (
  popd
  goto failed
)
popd

set "NODE_ENV=production"
set "ARENA_SERVE_UI=1"
set "HOST=127.0.0.1"
set "PORT=8080"
echo.
echo Local website: http://127.0.0.1:8080
echo In a SECOND terminal run: cloudflared tunnel --url http://127.0.0.1:8080
echo Share the HTTPS link printed by cloudflared. Keep both windows running.
echo.
pushd "%~dp0api"
call npm run start:public
popd
goto end

:missing_node
echo Install Node.js 22.13 or newer, then run this file again.
goto failed
:failed
echo Could not start. Read the error above.
:end
pause
endlocal
