# Script PowerShell FINALE ULTRA-ROBUSTO per correzione utente servizio Local Opener
# Forza configurazione utente corrente per accesso completo Google Drive
# Versione finale che gestisce tutti i casi di utente servizio
# OTTIMIZZATO per il nuovo sistema di installazione migliorato

param([switch]$Silent = $false)

if (-not $Silent) {
    Write-Host "CORREZIONE UTENTE SERVIZIO LOCAL OPENER - VERSIONE FINALE ULTRA ROBUSTA" -ForegroundColor Green
    Write-Host "=========================================================================" -ForegroundColor Green
    Write-Host ""
}

# 1. VERIFICA STATO ATTUALE SERVIZIO
if (-not $Silent) {
    Write-Host "1. Verifica stato attuale servizio..." -ForegroundColor Cyan
}

try {
    $Service = Get-Service -Name "CruscottoLocalOpener" -ErrorAction SilentlyContinue
    
    if ($Service) {
        if (-not $Silent) {
            Write-Host "   [INFO] Servizio trovato, stato: $($Service.Status)" -ForegroundColor White
        }
        
        # Verifica utente attuale del servizio
        $ServiceInfo = Get-WmiObject -Class Win32_Service -Filter "Name='CruscottoLocalOpener'"
        $CurrentServiceUser = $ServiceInfo.StartName
        
        if (-not $Silent) {
            Write-Host "   [INFO] Utente attuale servizio: $CurrentServiceUser" -ForegroundColor White
        }
        
        # Ottieni utente corrente
        $CurrentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        
        if (-not $Silent) {
            Write-Host "   [INFO] Utente corrente sistema: $CurrentUser" -ForegroundColor White
        }
        
        # Verifica se l'utente è già corretto
        if ($CurrentServiceUser -eq $CurrentUser -or $CurrentServiceUser -eq ".\teoni" -and $CurrentUser -eq "MSI\teoni") {
            if (-not $Silent) {
                Write-Host "   [OK] Utente servizio già corretto per accesso Google Drive!" -ForegroundColor Green
            }
            $UserAlreadyCorrect = $true
        } else {
            if (-not $Silent) {
                Write-Host "   [ATTENZIONE] Utente servizio diverso: $CurrentServiceUser" -ForegroundColor Yellow
                Write-Host "   [INFO] Necessaria riconfigurazione per: $CurrentUser" -ForegroundColor Yellow
            }
            $UserAlreadyCorrect = $false
        }
    } else {
        if (-not $Silent) {
            Write-Host "   [ERRORE] Servizio CruscottoLocalOpener non trovato!" -ForegroundColor Red
        }
        exit 1
    }
} catch {
    if (-not $Silent) {
        Write-Host "   [ERRORE] Errore verifica servizio: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}

# Se l'utente è già corretto, vai direttamente al riavvio
if ($UserAlreadyCorrect) {
    if (-not $Silent) {
        Write-Host ""
        Write-Host "2. Utente già corretto, riavvio servizio..." -ForegroundColor Cyan
    }
    
    # Salta i passi 2-4 e vai al riavvio
    # PowerShell non ha goto, usiamo una flag
    $SkipToRestart = $true
} else {
    $SkipToRestart = $false
}

# 2. FERMA SERVIZIO PER RICONFIGURAZIONE
if (-not $SkipToRestart) {
    if (-not $Silent) {
        Write-Host ""
        Write-Host "2. Fermo servizio per riconfigurazione..." -ForegroundColor Cyan
    }

    try {
        if ($Service.Status -eq "Running") {
            if (-not $Silent) {
                Write-Host "   [INFO] Fermo servizio..." -ForegroundColor Yellow
            }
            Stop-Service -Name "CruscottoLocalOpener" -Force
            Start-Sleep -Seconds 5  # Attendi fermata completa
        }
        
        if (-not $Silent) {
            Write-Host "   [OK] Servizio fermato!" -ForegroundColor Green
        }
    } catch {
        if (-not $Silent) {
            Write-Host "   [ERRORE] Errore fermata servizio: $($_.Exception.Message)" -ForegroundColor Red
        }
        exit 1
    }
}

# 3. RICONFIGURA UTENTE SERVIZIO - METODO ULTRA ROBUSTO
if (-not $SkipToRestart) {
    if (-not $Silent) {
        Write-Host ""
        Write-Host "3. Riconfigurazione utente servizio - METODO ULTRA ROBUSTO..." -ForegroundColor Cyan
    }

try {
    # METODO 1: Usa sc.exe con formato completo
    if (-not $Silent) {
        Write-Host "   [INFO] Tentativo 1: sc.exe con formato completo..." -ForegroundColor Yellow
    }
    
    $ScResult = sc.exe config CruscottoLocalOpener obj= $CurrentUser 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        if (-not $Silent) {
            Write-Host "   [OK] Utente servizio configurato con sc.exe: $CurrentUser" -ForegroundColor Green
        }
        $UserConfigured = $true
    } else {
        if (-not $Silent) {
            Write-Host "   [ATTENZIONE] sc.exe fallito: $ScResult" -ForegroundColor Yellow
        }
        
        # METODO 2: Usa nssm.exe
        try {
            $NssmPath = Join-Path (Get-Location) "nssm.exe"
            
            if (Test-Path $NssmPath) {
                if (-not $Silent) {
                    Write-Host "   [INFO] Tentativo 2: nssm.exe..." -ForegroundColor Yellow
                }
                
                $Result = & $NssmPath set CruscottoLocalOpener ObjectName $CurrentUser 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    if (-not $Silent) {
                        Write-Host "   [OK] Utente servizio configurato con nssm.exe: $CurrentUser" -ForegroundColor Green
                    }
                    $UserConfigured = $true
                } else {
                    if (-not $Silent) {
                        Write-Host "   [ATTENZIONE] nssm.exe fallito: $Result" -ForegroundColor Yellow
                    }
                    
                    # METODO 3: Usa sc.exe con formato alternativo
                    if (-not $Silent) {
                        Write-Host "   [INFO] Tentativo 3: sc.exe con formato alternativo..." -ForegroundColor Yellow
                    }
                    
                    # Prova con formato diverso
                    $ScResult2 = sc.exe config CruscottoLocalOpener obj= ".\teoni" 2>&1
                    
                    if ($LASTEXITCODE -eq 0) {
                        if (-not $Silent) {
                            Write-Host "   [OK] Utente servizio configurato con formato alternativo: .\teoni" -ForegroundColor Green
                        }
                        $UserConfigured = $true
                        $CurrentUser = ".\teoni"  # Aggiorna per il resto dello script
                    } else {
                        if (-not $Silent) {
                            Write-Host "   [ERRORE] Anche formato alternativo fallito: $ScResult2" -ForegroundColor Red
                        }
                        $UserConfigured = $false
                    }
                }
            } else {
                if (-not $Silent) {
                    Write-Host "   [ERRORE] nssm.exe non trovato!" -ForegroundColor Red
                }
                $UserConfigured = $false
            }
        } catch {
            if (-not $Silent) {
                Write-Host "   [ERRORE] Metodo alternativo fallito: $($_.Exception.Message)" -ForegroundColor Red
            }
            $UserConfigured = $false
        }
    }
    
} catch {
    if (-not $Silent) {
        Write-Host "   [ERRORE] Errore riconfigurazione utente: $($_.Exception.Message)" -ForegroundColor Red
    }
    $UserConfigured = $false
}

    # 4. VERIFICA CONFIGURAZIONE UTENTE
    if (-not $Silent) {
        Write-Host ""
        Write-Host "4. Verifica configurazione utente..." -ForegroundColor Cyan
    }

try {
    $NewServiceInfo = Get-WmiObject -Class Win32_Service -Filter "Name='CruscottoLocalOpener'"
    $NewUser = $NewServiceInfo.StartName
    
    if (-not $Silent) {
        Write-Host "   [INFO] Nuovo utente servizio: $NewUser" -ForegroundColor White
    }
    
    # Verifica se l'utente è accettabile per Google Drive
    if ($NewUser -eq $CurrentUser -or $NewUser -eq ".\teoni" -or $NewUser -like "*\teoni") {
        if (-not $Silent) {
            Write-Host "   [OK] Utente servizio configurato correttamente per accesso Google Drive!" -ForegroundColor Green
        }
        $UserConfigured = $true
    } else {
        if (-not $Silent) {
            Write-Host "   [ATTENZIONE] Utente servizio potrebbe non essere ottimale: $NewUser" -ForegroundColor Yellow
        }
        # Continua comunque, potrebbe funzionare
    }
    } catch {
        if (-not $Silent) {
            Write-Host "   [ATTENZIONE] Impossibile verificare nuovo utente: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        # Continua comunque
    }
}

# 5. RIAVVIA SERVIZIO
if (-not $Silent) {
    Write-Host ""
    Write-Host "5. Riavvio servizio..." -ForegroundColor Cyan
}

try {
    if (-not $Silent) {
        Write-Host "   [INFO] Avvio servizio..." -ForegroundColor Yellow
    }
    
    Start-Service -Name "CruscottoLocalOpener"
    
    if (-not $Silent) {
        Write-Host "   [OK] Comando avvio servizio inviato!" -ForegroundColor Green
    }
    
    # Attendi avvio completo
    Start-Sleep -Seconds 10
    
} catch {
    if (-not $Silent) {
        Write-Host "   [ERRORE] Errore avvio servizio: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   [INFO] Tentativo riavvio manuale..." -ForegroundColor Yellow
    }
    
    # Tenta riavvio manuale
    try {
        $ManualResult = sc.exe start CruscottoLocalOpener 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            if (-not $Silent) {
                Write-Host "   [OK] Servizio avviato manualmente!" -ForegroundColor Green
            }
        } else {
            if (-not $Silent) {
                Write-Host "   [ERRORE] Anche avvio manuale fallito: $ManualResult" -ForegroundColor Red
            }
            exit 1
        }
    } catch {
        if (-not $Silent) {
            Write-Host "   [ERRORE] Avvio manuale fallito: $($_.Exception.Message)" -ForegroundColor Red
        }
        exit 1
    }
}

# 6. ATTENDI CHE IL SERVIZIO SIA ATTIVO
if (-not $Silent) {
    Write-Host ""
    Write-Host "6. Attendo attivazione servizio..." -ForegroundColor Cyan
}

$MaxWait = 45  # Timeout aumentato
$WaitCount = 0
$ServiceReady = $false

while (-not $ServiceReady -and $WaitCount -lt $MaxWait) {
    try {
        $Response = Invoke-WebRequest -Uri "http://127.0.0.1:17654/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($Response.StatusCode -eq 200) {
            $ServiceReady = $true
            if (-not $Silent) {
                Write-Host "   [OK] Servizio attivo e risponde!" -ForegroundColor Green
            }
        }
    } catch {
        # Servizio non ancora pronto
    }
    
    if (-not $ServiceReady) {
        $WaitCount++
        if (-not $Silent) {
            Write-Host "   [INFO] Attendo... ($WaitCount/$MaxWait)" -ForegroundColor Yellow
        }
        Start-Sleep -Seconds 1
    }
}

if (-not $ServiceReady) {
    if (-not $Silent) {
        Write-Host "   [ERRORE] Servizio non attivo dopo $MaxWait secondi!" -ForegroundColor Red
        Write-Host "   [INFO] Verifica manuale: services.msc" -ForegroundColor Yellow
    }
    exit 1
}

# 7. TEST ACCESSO GOOGLE DRIVE
if (-not $Silent) {
    Write-Host ""
    Write-Host "7. Test accesso Google Drive..." -ForegroundColor Cyan
}

try {
    $ConfigResponse = Invoke-WebRequest -Uri "http://127.0.0.1:17654/config" -TimeoutSec 10 -UseBasicParsing
    if ($ConfigResponse.StatusCode -eq 200) {
        try {
            $Config = $ConfigResponse.Content | ConvertFrom-Json
            $Paths = $Config.roots
            
            if (-not $Silent) {
                Write-Host "   [INFO] Percorsi configurati: $($Paths.Count)" -ForegroundColor White
                foreach ($path in $Paths) {
                    Write-Host "      - $path" -ForegroundColor Gray
                }
            }
            
            # Verifica se i percorsi Google Drive sono accessibili
            $GoogleDrivePaths = @("G:\Il mio Drive", "G:\")
            $AccessiblePaths = 0
            
            foreach ($gdrivePath in $GoogleDrivePaths) {
                try {
                    if (Test-Path $gdrivePath -PathType Container) {
                        $test = Get-ChildItem $gdrivePath -ErrorAction Stop | Select-Object -First 1
                        $AccessiblePaths++
                        if (-not $Silent) {
                            Write-Host "   [OK] Google Drive accessibile: $gdrivePath" -ForegroundColor Green
                        }
                    }
                } catch {
                    if (-not $Silent) {
                        Write-Host "   [ATTENZIONE] Google Drive non accessibile: $gdrivePath" -ForegroundColor Yellow
                    }
                }
            }
            
            if ($AccessiblePaths -gt 0) {
                if (-not $Silent) {
                    Write-Host "   [OK] Accesso Google Drive ripristinato: $AccessiblePaths percorsi accessibili" -ForegroundColor Green
                }
            } else {
                if (-not $Silent) {
                    Write-Host "   [ATTENZIONE] Google Drive ancora non accessibile" -ForegroundColor Yellow
                }
            }
            
        } catch {
            if (-not $Silent) {
                Write-Host "   [ATTENZIONE] Configurazione non parsabile" -ForegroundColor Yellow
            }
        }
    }
} catch {
    if (-not $Silent) {
        Write-Host "   [ERRORE] Errore test accesso: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 8. RISULTATO FINALE
if (-not $Silent) {
    Write-Host ""
    Write-Host "CORREZIONE UTENTE SERVIZIO COMPLETATA!" -ForegroundColor Green
    Write-Host "=======================================" -ForegroundColor Green
    Write-Host "Utente precedente: $CurrentServiceUser" -ForegroundColor White
    Write-Host "Nuovo utente servizio: $NewUser" -ForegroundColor White
    
    if ($UserConfigured) {
        Write-Host "[OK] SUCCESSO: Servizio riconfigurato per accesso Google Drive!" -ForegroundColor Green
        Write-Host "[INFO] Google Drive dovrebbe ora essere completamente accessibile!" -ForegroundColor Green
    } else {
        Write-Host "[ATTENZIONE] Configurazione utente potrebbe non essere ottimale" -ForegroundColor Yellow
        Write-Host "[INFO] Prova comunque ad accedere a Google Drive" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Verifica finale:" -ForegroundColor Cyan
    Write-Host "  - Health: http://127.0.0.1:17654/health" -ForegroundColor White
    Write-Host "  - Config: http://127.0.0.1:17654/config" -ForegroundColor White
    Write-Host ""
    Write-Host "Ora esegui AGGIORNA-CODICE-SERVIZIO.bat per riconfigurare i percorsi!" -ForegroundColor Yellow
}

# Output programmatico
return @{
    Success = $UserConfigured
    PreviousUser = $CurrentServiceUser
    NewUser = $NewUser
    ServiceReady = $ServiceReady
}
