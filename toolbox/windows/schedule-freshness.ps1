# Turns on floor 2 (freshness) on this laptop using Windows Task Scheduler:
#   every hour     -> get new listings, fingerprint them, rebuild the app
#   every day 4am  -> check for sold items, rebuild the app
# The laptop has to be on (and you logged in) for the jobs to run. Logs go to the logs folder.
# To turn it off: open Task Scheduler and delete the two tasks that start with "RACKD".
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = Join-Path $PSScriptRoot 'node\node.exe' }
if (-not (Test-Path $node)) { Write-Host 'Node.js not found. Run RACKD.bat first.'; exit 1 }
if (-not (Test-Path (Join-Path $root '.env'))) { Write-Host 'No .env file yet. Copy .env.example to .env and add your APIFY_TOKEN first.'; exit 1 }

function Job($name, $scripts, $trigger) {
  $cmd = ($scripts | ForEach-Object { "`"$node`" $_" }) -join ' && '
  $action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c $cmd" -WorkingDirectory $root
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)
  Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
  Write-Host "Scheduled: $name"
}

$hourly = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddHours((Get-Date).Hour + 1) -RepetitionInterval (New-TimeSpan -Hours 1)
Job 'RACKD new listings (hourly)' @('2-freshness\fetch-new.js', '4-algorithm\fashionclip\fingerprint.js', '5-app\build-app.js') $hourly

$daily = New-ScheduledTaskTrigger -Daily -At '4:00'
Job 'RACKD sold-item check (daily)' @('2-freshness\recheck-sold.js', '5-app\build-app.js') $daily
Write-Host 'Done. RACKD now refreshes itself while this laptop is on.'
