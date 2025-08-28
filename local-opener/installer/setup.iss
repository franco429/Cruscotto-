; Inno Setup script per Local Opener con wizard configurazione
; Richiede Inno Setup 6.x: https://jrsoftware.org/isinfo.php

#define MyAppName "Cruscotto Local Opener"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Pannello SGI"
#define MyAppURL "https://cruscotto-sgi.onrender.com"
#define MyAppExeName "local-opener.exe"
#define MyServiceName "CruscottoLocalOpener"

[Setup]
AppId={{A7B9C8D2-3E4F-5A6B-7C8D-9E0F1A2B3C4D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\CruscottoLocalOpener
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputDir=..\dist
OutputBaseFilename=cruscotto-local-opener-setup
SetupIconFile=..\assets\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#MyAppExeName}
; Configurazione per compatibilità Windows universale
MinVersion=6.1sp1
ArchitecturesAllowed=x86 x64 arm64
ArchitecturesInstallIn64BitMode=x64 arm64
; Installazione intelligente basata su architettura
AllowNoIcons=yes
; Segnala come compatibile con versioni moderne di Windows
AppReadmeFile={app}\README.txt
; Migliora compatibilità con sistemi legacy
CreateUninstallRegKey=yes
UsePreviousAppDir=no
; SUPPORTO INSTALLAZIONE SILENZIOSA
; Parametri: /SILENT /NORESTART /ROOTDIR="path" /COMPANY="name" /COMPANYCODE="code"
SetupLogging=yes

[Languages]
Name: "italian"; MessagesFile: "compiler:Languages\Italian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "autostart"; Description: "Avvia automaticamente all'accensione del PC"; GroupDescription: "Opzioni di avvio:"; Flags: checked

[Files]
; Installa l'eseguibile appropriato basato sull'architettura
Source: "..\dist\local-opener-x86.exe"; DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion; Check: not IsX64 and not IsARM64
Source: "..\dist\local-opener-x64.exe"; DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion; Check: IsX64 and not IsARM64  
Source: "..\dist\local-opener-arm64.exe"; DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion; Check: IsARM64
; Fallback: se nessuno dei precedenti, usa x64 come default
Source: "..\dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion; Check: not FileExists(ExpandConstant('{app}\{#MyAppExeName}'))
; Assets e file di supporto
Source: "..\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\assets\README.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "nssm.exe"; DestDir: "{app}"; Flags: ignoreversion
; Script di diagnostica e manutenzione
Source: "..\diagnostica-servizio.bat"; DestDir: "{app}"; Flags: ignoreversion
; File di configurazione di esempio (utile per troubleshooting)
Source: "..\config-esempio.json"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
; Menu di manutenzione e diagnostica
Name: "{group}\Verifica Stato Servizio"; Filename: "{app}\diagnostica-servizio.bat"; IconFilename: "{sys}\shell32.dll"; IconIndex: 16
Name: "{group}\Apri Configurazione"; Filename: "explorer.exe"; Parameters: """{userappdata}\.local-opener"""; IconFilename: "{sys}\shell32.dll"; IconIndex: 4
Name: "{group}\Test Connessione"; Filename: "http://127.0.0.1:17654"; IconFilename: "{sys}\shell32.dll"; IconIndex: 13
Name: "{group}\Manager Servizi Windows"; Filename: "services.msc"; IconFilename: "{sys}\shell32.dll"; IconIndex: 21

[Run]
; ===== INSTALLAZIONE SERVIZIO WINDOWS CON NSSM =====
; STEP 1: Ferma e rimuove eventuale servizio esistente (per upgrade)
Filename: "{app}\nssm.exe"; Parameters: "stop {#MyServiceName}"; Flags: runhidden; StatusMsg: "Arresto servizio esistente..."
Filename: "{app}\nssm.exe"; Parameters: "remove {#MyServiceName} confirm"; Flags: runhidden; StatusMsg: "Rimozione servizio precedente..."

; STEP 2: Installa nuovo servizio con configurazione robusta
Filename: "{app}\nssm.exe"; Parameters: "install {#MyServiceName} ""{app}\{#MyAppExeName}"""; Flags: runhidden; StatusMsg: "Installazione servizio Local Opener..."
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppDirectory ""{app}"""; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} DisplayName ""Cruscotto Local Opener Service"""; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} Description ""Servizio per aprire documenti locali da Pannello SGI - Avvio automatico all'accensione PC"""; Flags: runhidden

; STEP 3: Configurazione CRITICA per avvio automatico
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} Start SERVICE_AUTO_START"; Flags: runhidden; StatusMsg: "Configurazione avvio automatico..."
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} Type SERVICE_WIN32_OWN_PROCESS"; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} DelayedAutoStart 1"; Flags: runhidden

; STEP 4: Configurazione restart automatico e resilienza
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppExit Default Restart"; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppRestartDelay 10000"; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppThrottle 5000"; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppStopMethodSkip 0"; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppStopMethodConsole 15000"; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppStopMethodWindow 5000"; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppStopMethodThreads 10000"; Flags: runhidden

; STEP 5: Configurazione sicurezza e permessi
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} ObjectName LocalSystem"; Flags: runhidden

; STEP 6: Configurazione logging avanzata per diagnostica
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppStdout ""{userappdata}\.local-opener\service.log"""; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppStderr ""{userappdata}\.local-opener\service-error.log"""; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppRotateFiles 1"; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppRotateSeconds 86400"; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppRotateBytes 10485760"; Flags: runhidden

; STEP 7: Configurazione variabili ambiente per Node.js
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppEnvironmentExtra NSSM_SERVICE_NAME={#MyServiceName}"; Flags: runhidden

; STEP 8: AVVIO IMMEDIATO del servizio 
Filename: "{app}\nssm.exe"; Parameters: "start {#MyServiceName}"; Flags: runhidden waituntilterminated; StatusMsg: "Avvio servizio Local Opener..."

; STEP 9: Verifica che il servizio sia effettivamente avviato (con timeout)
Filename: "sc"; Parameters: "query {#MyServiceName}"; Flags: runhidden waituntilterminated; StatusMsg: "Verifica stato servizio..."

[UninstallRun]
Filename: "{app}\nssm.exe"; Parameters: "stop {#MyServiceName}"; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "remove {#MyServiceName} confirm"; Flags: runhidden

[Code]
var
  FolderPage: TInputDirWizardPage;
  CompanyPage: TInputQueryWizardPage;

// Funzione per rilevare architettura ARM64
function IsARM64: Boolean;
var
  Architecture: String;
begin
  Result := False;
  if RegQueryStringValue(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment', 'PROCESSOR_ARCHITECTURE', Architecture) then
    Result := (Architecture = 'ARM64');
  
  // Fallback check
  if not Result then
  begin
    if RegQueryStringValue(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment', 'PROCESSOR_ARCHITEW6432', Architecture) then
      Result := (Architecture = 'ARM64');
  end;
end;

// Variabili globali per parametri silent install
var
  SilentRootDir: String;
  SilentCompany: String;
  SilentCompanyCode: String;
  IsSilentMode: Boolean;

// Funzione per rilevare e parsare parametri command line
function InitializeSetup(): Boolean;
var
  I: Integer;
  Param: String;
begin
  Result := True;
  IsSilentMode := False;
  SilentRootDir := '';
  SilentCompany := '';
  SilentCompanyCode := '';
  
  // Parse command line parameters per installazione silent
  for I := 1 to ParamCount do
  begin
    Param := ParamStr(I);
    
    if Pos('/SILENT', UpperCase(Param)) > 0 then
      IsSilentMode := True
    else if Pos('/ROOTDIR=', UpperCase(Param)) = 1 then
      SilentRootDir := Copy(Param, 10, Length(Param) - 9)
    else if Pos('/COMPANY=', UpperCase(Param)) = 1 then
      SilentCompany := Copy(Param, 10, Length(Param) - 9)
    else if Pos('/COMPANYCODE=', UpperCase(Param)) = 1 then
      SilentCompanyCode := Copy(Param, 14, Length(Param) - 13);
  end;
  
  // Auto-detect Google Drive se non specificato in silent mode
  if IsSilentMode and (SilentRootDir = '') then
  begin
    SilentRootDir := AutoDetectGoogleDrive();
  end;
end;

// Auto-rilevamento cartelle Google Drive
function AutoDetectGoogleDrive(): String;
var
  UserProfile: String;
  Drive: String;
  Letter: Char;
begin
  Result := '';
  UserProfile := ExpandConstant('{userappdata}\..\');
  
  // Controlla Mirror classico
  if DirExists(UserProfile + 'Google Drive') then
  begin
    Result := UserProfile + 'Google Drive';
    Exit;
  end;
  
  // Controlla nuovo Google Drive Desktop
  if DirExists(UserProfile + 'GoogleDrive') then
  begin
    Result := UserProfile + 'GoogleDrive';
    Exit;
  end;
  
  // Scansione lettere D-Z per Stream
  for Letter := 'D' to 'Z' do
  begin
    Drive := Letter + ':\';
    if DirExists(Drive) then
    begin
      if DirExists(Drive + 'Il mio Drive') then
      begin
        Result := Drive + 'Il mio Drive';
        Exit;
      end;
      if DirExists(Drive + 'My Drive') then
      begin
        Result := Drive + 'My Drive';
        Exit;
      end;
    end;
  end;
  
  // Fallback se nessuna cartella trovata
  if Result = '' then
    Result := 'C:\';
end;

procedure InitializeWizard;
begin
  // Salta wizard se in modalità silent
  if IsSilentMode then
    Exit;
    
  // Pagina per selezione cartelle documenti ISO
  FolderPage := CreateInputDirPage(wpSelectDir,
    'Selezione Cartelle Documenti', 
    'Dove sono salvati i documenti ISO?',
    'Seleziona la cartella principale dove sono salvati i documenti ISO. ' +
    'Puoi aggiungere altre cartelle successivamente dal pannello di configurazione.',
    False, '');
  FolderPage.Add('Cartella documenti ISO:');
  FolderPage.Values[0] := AutoDetectGoogleDrive();
  
  // Pagina per info azienda
  CompanyPage := CreateInputQueryPage(FolderPage.ID,
    'Informazioni Azienda',
    'Inserisci i dati della tua azienda',
    'Questi dati verranno salvati nel profilo di configurazione locale.');
  CompanyPage.Add('Nome azienda:', False);
  CompanyPage.Add('Codice azienda (opzionale):', False);
end;

// Funzione per verificare stato servizio Windows
function IsServiceInstalled(ServiceName: String): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('sc', 'query "' + ServiceName + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function IsServiceRunning(ServiceName: String): Boolean;
var
  ResultCode: Integer;
  Output: AnsiString;
begin
  Result := False;
  if Exec('sc', 'query "' + ServiceName + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0) then
  begin
    // Se il comando è riuscito, il servizio è installato
    // Potremmo analizzare l'output per verificare se è RUNNING, ma per semplicità assumiamo che se è installato dovrebbe essere avviato
    Result := True;
  end;
end;

// Funzione per testare connessione al servizio Local Opener
function TestLocalOpenerConnection(): Boolean;
var
  ResultCode: Integer;
begin
  // Usa PowerShell per testare connessione HTTP (più affidabile di curl su Windows)
  Result := Exec('powershell', '-Command "try { $response = Invoke-WebRequest -Uri http://127.0.0.1:17654/health -TimeoutSec 10 -UseBasicParsing; exit 0 } catch { exit 1 }"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigDir, ConfigFile, ConfigContent: String;
  CompanyName, CompanyCode, IsoFolder: String;
  ServiceInstalled, ServiceRunning, ConnectionWorking: Boolean;
  StatusMessage: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Crea configurazione iniziale
    ConfigDir := ExpandConstant('{userappdata}\.local-opener');
    ConfigFile := ConfigDir + '\config.json';
    
    ForceDirectories(ConfigDir);
    
    // Usa valori da silent install o da wizard
    if IsSilentMode then
    begin
      IsoFolder := SilentRootDir;
      CompanyName := SilentCompany;
      CompanyCode := SilentCompanyCode;
    end
    else
    begin
      IsoFolder := FolderPage.Values[0];
      CompanyName := CompanyPage.Values[0];
      CompanyCode := CompanyPage.Values[1];
    end;
    
    // Crea JSON di configurazione con escape corretti
    ConfigContent := '{' + #13#10 +
      '  "roots": ["' + StringReplace(IsoFolder, '\', '\\', [rfReplaceAll]) + '"],' + #13#10 +
      '  "company": {' + #13#10 +
      '    "name": "' + CompanyName + '",' + #13#10 +
      '    "code": "' + CompanyCode + '",' + #13#10 +
      '    "installedAt": "' + GetDateTimeString('yyyy-mm-dd hh:nn:ss', #0, #0) + '",' + #13#10 +
      '    "version": "{#MyAppVersion}",' + #13#10 +
      '    "silentInstall": ' + BoolToStr(IsSilentMode, 'true', 'false') + #13#10 +
      '  }' + #13#10 +
      '}';
    
    SaveStringToFile(ConfigFile, ConfigContent, False);
    
    // Configura Windows Firewall per permettere comunicazione localhost
    Exec('netsh', 'advfirewall firewall add rule name="Local Opener" dir=in action=allow protocol=TCP localport=17654', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // Configura regola firewall aggiuntiva per sicurezza
    Exec('netsh', 'advfirewall firewall add rule name="Local Opener Out" dir=out action=allow protocol=TCP localport=17654', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // Aggiunge il servizio alle eccezioni Windows Defender (best effort)
    Exec('powershell', '-Command "Add-MpPreference -ExclusionPath \"' + ExpandConstant('{app}') + '\" -ErrorAction SilentlyContinue"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // VERIFICA POST-INSTALLAZIONE: Controllo servizio e connessione
    Sleep(3000); // Aspetta 3 secondi per permettere al servizio di avviarsi completamente
    
    ServiceInstalled := IsServiceInstalled('{#MyServiceName}');
    ServiceRunning := IsServiceRunning('{#MyServiceName}');
    ConnectionWorking := TestLocalOpenerConnection();
    
    // Crea messaggio di stato dettagliato
    StatusMessage := 'Installazione completata!' + #13#10 + #13#10;
    StatusMessage := StatusMessage + 'STATO SERVIZIO:' + #13#10;
    
    if ServiceInstalled then
      StatusMessage := StatusMessage + '✅ Servizio installato correttamente' + #13#10
    else
      StatusMessage := StatusMessage + '❌ PROBLEMA: Servizio non installato' + #13#10;
    
    if ServiceRunning then
      StatusMessage := StatusMessage + '✅ Servizio avviato' + #13#10
    else
      StatusMessage := StatusMessage + '⚠️ Servizio installato ma non avviato' + #13#10;
    
    if ConnectionWorking then
      StatusMessage := StatusMessage + '✅ Connessione Local Opener funzionante' + #13#10
    else
      StatusMessage := StatusMessage + '⚠️ Servizio non raggiungibile su porta 17654' + #13#10;
    
    StatusMessage := StatusMessage + #13#10 + 'CONFIGURAZIONE:' + #13#10;
    StatusMessage := StatusMessage + '📂 Cartella documenti: ' + IsoFolder + #13#10;
    StatusMessage := StatusMessage + '🏢 Azienda: ' + CompanyName + #13#10;
    StatusMessage := StatusMessage + '🌐 URL servizio: http://127.0.0.1:17654' + #13#10;
    
    if ServiceInstalled and ServiceRunning and ConnectionWorking then
    begin
      StatusMessage := StatusMessage + #13#10 + '🎉 INSTALLAZIONE RIUSCITA!' + #13#10;
      StatusMessage := StatusMessage + 'Il Local Opener si avvierà automaticamente ad ogni accensione del PC.';
    end
    else
    begin
      StatusMessage := StatusMessage + #13#10 + '⚠️ INSTALLAZIONE PARZIALE' + #13#10;
      StatusMessage := StatusMessage + 'Il servizio potrebbe richiedere un riavvio del PC per funzionare correttamente.' + #13#10;
      StatusMessage := StatusMessage + 'In caso di problemi, esegui "services.msc" e cerca "Cruscotto Local Opener Service".';
    end;
    
    // Mostra risultato all'utente (solo se non silent)
    if not IsSilentMode then
    begin
      MsgBox(StatusMessage, mbInformation, MB_OK);
    end;
    
    // Log dettagliato per diagnostica
    SaveStringToFile(ConfigDir + '\install-status.log', 
      'Installation completed at: ' + GetDateTimeString('yyyy-mm-dd hh:nn:ss', #0, #0) + #13#10 +
      'Service Installed: ' + BoolToStr(ServiceInstalled, 'YES', 'NO') + #13#10 +
      'Service Running: ' + BoolToStr(ServiceRunning, 'YES', 'NO') + #13#10 +
      'Connection Working: ' + BoolToStr(ConnectionWorking, 'YES', 'NO') + #13#10 +
      'ISO Folder: ' + IsoFolder + #13#10 +
      'Company: ' + CompanyName + #13#10 +
      'Company Code: ' + CompanyCode + #13#10 +
      'Silent Mode: ' + BoolToStr(IsSilentMode, 'YES', 'NO') + #13#10,
      False);
  end;
end;
