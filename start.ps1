# FlowState: start server, client, then open the app in the default browser.
$Root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$ServerPath = Join-Path $Root 'server'
$ClientPath = Join-Path $Root 'client'

Write-Host 'Starting FlowState server and client...'

Start-Process powershell -WorkingDirectory $ServerPath -ArgumentList @(
    '-NoExit', '-NoProfile', '-Command', 'npm run dev'
)
Start-Process powershell -WorkingDirectory $ClientPath -ArgumentList @(
    '-NoExit', '-NoProfile', '-Command', 'npm run dev'
)

Start-Sleep -Seconds 4
Start-Process 'http://localhost:5173'
