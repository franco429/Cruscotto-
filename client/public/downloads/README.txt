Cartella per l'installer di Local Opener

Dopo aver buildato l'installer con:
  cd local-opener && npm run build:installer

Copia il file generato qui:
  copy local-opener\dist\cruscotto-local-opener-setup.exe client\public\downloads\

In produzione (Render), carica manualmente l'installer o usa un CDN esterno.
