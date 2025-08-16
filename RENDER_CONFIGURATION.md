# 🚀 Configurazione Render per Risolvere Problemi di Memoria

## 📋 **Problema Identificato**
Il backend su Render crasha con errore **"JavaScript heap out of memory"** durante il caricamento di documenti.

## 🔧 **Soluzioni Implementate**

### 1. **Configurazione Package.json**
```json
"start": "NODE_ENV=production node --max-old-space-size=2048 --max-semi-space-size=512 dist/index.js"
```

### 2. **Variabili d'Ambiente Render**
Configura queste variabili nel dashboard Render:

```bash
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=2048 --max-semi-space-size=512
PORT=10000
```

### 3. **Limiti Upload Ottimizzati**
- **Dimensione file max**: 50MB (ridotto da 100MB)
- **File per richiesta**: 100 (ridotto da 2000)
- **Batch processing**: 2 file alla volta (ridotto da 5)

### 4. **Configurazione Istanza Render**
- **Plan**: Starter o superiore
- **Memory**: 2GB minimo
- **CPU**: 1 vCPU minimo
- **Auto-scaling**: 1-3 istanze

### 5. **Health Check Endpoint**
```
GET /api/health
```
Monitora memoria e stato del sistema.

## 📊 **Monitoraggio Memoria**

Il server ora include:
- Logging memoria ogni minuto
- Warning a 1.5GB di utilizzo
- Garbage collection automatico a 1GB
- Endpoint health check con metriche

## 🚨 **Configurazioni Critiche**

### **Render.yaml** (già creato)
```yaml
services:
  - type: web
    name: cruscotto-backend
    resources:
      memory: 2GB
      cpu: 1x
    scaling:
      targetMemoryUtilizationPercent: 70
```

### **Limiti Excel**
- **Streaming**: Attivato per file >25MB
- **Timeout**: Ridotti per file grandi
- **Batch processing**: Ottimizzato per memoria

## 🔍 **Verifica Configurazione**

1. **Riavvia** l'istanza Render
2. **Verifica** le variabili d'ambiente
3. **Testa** l'endpoint `/api/health`
4. **Monitora** i log per warning memoria

## 📈 **Risultati Attesi**

- ✅ Eliminazione errori "out of memory"
- ✅ Upload documenti stabili
- ✅ Migliore gestione file grandi
- ✅ Monitoraggio memoria in tempo reale
- ✅ Auto-scaling basato su utilizzo memoria

## 🆘 **In Caso di Problemi**

1. **Verifica** configurazione variabili d'ambiente
2. **Controlla** log per warning memoria
3. **Riduci** dimensione file se necessario
4. **Aumenta** memoria istanza se persistente

