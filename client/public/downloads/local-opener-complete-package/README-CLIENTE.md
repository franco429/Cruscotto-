# 📄 LOCAL OPENER - ISTRUZIONI DI INSTALLAZIONE

## Cos'è Local Opener?

Local Opener è un componente che permette a SGI Cruscotto di aprire i vostri documenti direttamente dal vostro PC, senza doverli scaricare ogni volta. Funziona perfettamente con Google Drive Desktop.

## 🚀 Installazione Rapida (5 minuti)

### Requisiti
- ✅ Windows 10 o superiore
- ✅ Google Drive Desktop installato e configurato
- ✅ Accesso amministratore al PC

### Passaggi

1. **Estrai tutti i file** in una cartella (es. Desktop)

2. **Esegui come amministratore**:
   - Click destro su `setup-local-opener-task.bat`
   - Seleziona "Esegui come amministratore"
   - Segui le istruzioni a schermo

3. **Riavvia il PC** per completare l'installazione

4. **Verifica il funzionamento**:
   - Apri SGI Cruscotto nel browser
   - Vai alla sezione documenti
   - Clicca sull'icona 👁️ di un documento
   - Il documento si aprirà direttamente!

## 🏢 Installazione per Aziende (Multi-PC)

Se dovete installare su molti PC, usate invece:
- `setup-local-opener-enterprise.bat` (come amministratore)
- Selezionate l'opzione appropriata dal menu

## ✅ Verifica Installazione

Per verificare che tutto funzioni:
1. Eseguite `verify-local-opener-complete.bat` come amministratore
2. Controllate che tutti i test siano ✅ PASS

## ❓ Domande Frequenti

**D: È sicuro?**
R: Sì, il servizio ascolta solo localmente (127.0.0.1) e non accetta connessioni esterne.

**D: Rallenta il PC?**
R: No, usa risorse minime e si attiva solo quando necessario.

**D: Funziona con tutti i tipi di file?**
R: Sì, apre qualsiasi file con il programma predefinito di Windows.

**D: Devo installarlo su ogni PC?**
R: Sì, va installato su ogni PC che deve aprire documenti locali.

## 🆘 Supporto

In caso di problemi:
1. Eseguite `verify-local-opener-complete.bat` per diagnostica
2. Controllate i log in `C:\Logs\LocalOpener\`
3. Contattate il supporto tecnico

---

© 2024 SGI Cruscotto - Local Opener v1.2
