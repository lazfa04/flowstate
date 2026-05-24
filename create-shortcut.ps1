# Creates a desktop shortcut named "FlowState" that runs start.bat from this project root.
$Root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$BatPath = Join-Path $Root 'start.bat'
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'FlowState.lnk'

if (-not (Test-Path -LiteralPath $BatPath)) {
    Write-Error "start.bat not found at: $BatPath"
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = $BatPath
$shortcut.WorkingDirectory = $Root
$shortcut.WindowStyle = 1
$shortcut.Description = 'Start FlowState (server + client + browser)'
$shortcut.Save()

Write-Host "Shortcut created: $ShortcutPath"
Write-Host ''

Write-Host '--- How to run this script next time ---'
Write-Host 'Option A — File Explorer:'
Write-Host '  Right-click create-shortcut.ps1 -> Run with PowerShell'
Write-Host ''
Write-Host 'Option B — PowerShell (recommended if execution policy blocks scripts):'
Write-Host "  cd `"$Root`""
Write-Host '  powershell -NoProfile -ExecutionPolicy Bypass -File .\create-shortcut.ps1'
Write-Host ''
Write-Host 'Option C — From an already-open PowerShell in this folder:'
Write-Host '  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force'
Write-Host '  .\create-shortcut.ps1'
Write-Host ''
