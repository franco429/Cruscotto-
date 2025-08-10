# Script PowerShell per scaricare NSSM (Non-Sucking Service Manager)
# Necessario per l'installer

$nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
$outputPath = "nssm.zip"
$extractPath = "."

Write-Host "Scaricando NSSM..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $nssmUrl -OutFile $outputPath

Write-Host "Estraendo NSSM..." -ForegroundColor Yellow
Expand-Archive -Path $outputPath -DestinationPath $extractPath -Force

Write-Host "Copiando nssm.exe..." -ForegroundColor Yellow
Copy-Item -Path ".\nssm-2.24\win64\nssm.exe" -Destination ".\nssm.exe" -Force

Write-Host "Pulizia file temporanei..." -ForegroundColor Yellow
Remove-Item -Path $outputPath -Force
Remove-Item -Path ".\nssm-2.24" -Recurse -Force

Write-Host "NSSM scaricato con successo!" -ForegroundColor Green
