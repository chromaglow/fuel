# Installs the fuel launcher: two scheduled tasks + a desktop shortcut.
# Idempotent - run again any time; it replaces what exists. No elevation needed.
#
#   "fuel"           on-demand, FORCE relaunch (kill + start) - the shortcut
#   "fuel autoheal"  at logon + every 15 min, start ONLY if fuel is missing
#   Desktop\Fuel.lnk -> schtasks /Run /TN "fuel"
#
# Why Task Scheduler: a process launched from inside a Claude session lives in
# Claude Desktop's job object and dies when Desktop updates or the session
# closes (the 08-19/08-21 "fuel keeps disappearing"). Tasks run outside any
# job, parented by the service host. ASCII only (PowerShell 5.1 reads .ps1 as
# ANSI without a BOM - see WEYLD STATUS.md).

$ErrorActionPreference = 'Stop'
$fuelDir = 'C:\dev\GitHub\fuel'
$cmd = Join-Path $fuelDir 'deploy\relaunch-fuel.cmd'
if (-not (Test-Path $cmd)) { throw "missing $cmd" }

# Console apps launched by Task Scheduler flash a visible terminal window for a
# fraction of a second - enough to steal foreground focus and knock Windows
# voice typing out of its text field (diagnosed 2026-08-30). conhost --headless
# gives the whole child tree a hidden pseudoconsole, so nothing ever appears.
$conhost = Join-Path $env:SystemRoot 'System32\conhost.exe'

# --- task: fuel (on-demand force relaunch) ---
$action = New-ScheduledTaskAction -Execute $conhost -Argument "--headless cmd.exe /c `"$cmd`""
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew
try { Unregister-ScheduledTask -TaskName 'fuel' -Confirm:$false -ErrorAction Stop } catch {}
Register-ScheduledTask -TaskName 'fuel' -Action $action -Settings $settings `
  -Description 'Launch/relaunch the fuel HUD outside any app job object (survives Claude Desktop updates). Triggered by the Fuel desktop shortcut.' | Out-Null

# --- task: fuel autoheal (logon + every 15 min, start-if-missing) ---
$actionA = New-ScheduledTaskAction -Execute $conhost -Argument "--headless cmd.exe /c `"$cmd`" /auto"
$t1 = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$t2 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration ([TimeSpan]::FromDays(3650))
$settingsA = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew -StartWhenAvailable
try { Unregister-ScheduledTask -TaskName 'fuel autoheal' -Confirm:$false -ErrorAction Stop } catch {}
Register-ScheduledTask -TaskName 'fuel autoheal' -Action $actionA -Trigger $t1, $t2 -Settings $settingsA `
  -Description 'Start the fuel HUD if it is not running. Checks at logon and every 15 minutes; never restarts a healthy instance.' | Out-Null

# --- desktop shortcut ---
$desktop = [Environment]::GetFolderPath('Desktop')
$sh = New-Object -ComObject WScript.Shell
$lnk = $sh.CreateShortcut((Join-Path $desktop 'Fuel.lnk'))
$lnk.TargetPath = 'C:\Windows\System32\schtasks.exe'
$lnk.Arguments = '/Run /TN "fuel"'
$lnk.WorkingDirectory = $fuelDir
$lnk.WindowStyle = 7  # minimized - the schtasks console barely flashes
$lnk.IconLocation = (Join-Path $fuelDir 'node_modules\electron\dist\electron.exe') + ',0'
$lnk.Description = 'Launch / relaunch the fuel HUD (runs via Task Scheduler so Claude updates cannot kill it)'
$lnk.Save()

Write-Host 'Installed: tasks "fuel" + "fuel autoheal", Desktop\Fuel.lnk'
Get-ScheduledTask -TaskName 'fuel', 'fuel autoheal' | Select-Object TaskName, State
