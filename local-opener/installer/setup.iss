; Inno Setup script per Local Opener con wizard configurazione
; Richiede Inno Setup 6.x: https://jrsoftware.org/isinfo.php

#define MyAppName "Cruscotto Local Opener"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Cruscotto SGI"
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

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Installa come servizio Windows usando NSSM
Filename: "{app}\nssm.exe"; Parameters: "install {#MyServiceName} ""{app}\{#MyAppExeName}"""; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} AppDirectory ""{app}"""; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} DisplayName ""Cruscotto Local Opener Service"""; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} Description ""Servizio per aprire documenti locali da Cruscotto SGI"""; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "set {#MyServiceName} Start SERVICE_AUTO_START"; Flags: runhidden
Filename: "{app}\nssm.exe"; Parameters: "start {#MyServiceName}"; Flags: runhidden

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

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigDir, ConfigFile, ConfigContent: String;
  CompanyName, CompanyCode, IsoFolder: String;
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
  end;
end;
