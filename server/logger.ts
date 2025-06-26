import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Configurazione dei livelli di log personalizzati
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colori per i diversi livelli
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Formato personalizzato per i log
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Aggiungi stack trace se presente
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Aggiungi metadata se presente
    if (Object.keys(meta).length > 0) {
      log += `\nMetadata: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Configurazione per la rotazione dei file
const fileRotateTransport = new DailyRotateFile({
  filename: path.join('logs', 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // Mantieni i log per 14 giorni
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Configurazione per gli errori (file separato)
const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join('logs', 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d', // Mantieni gli errori per 30 giorni
  level: 'error',
});

// Configurazione del logger
const logger = winston.createLogger({
  levels: logLevels,
  format: logFormat,
  transports: [
    // Console transport per development
    ...(process.env.NODE_ENV !== 'production' 
      ? [new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.simple()
          )
        })]
      : []
    ),
    // File transports
    fileRotateTransport,
    errorFileRotateTransport,
  ],
  // Gestione delle eccezioni non catturate
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join('logs', 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    })
  ],
  // Gestione dei rejection non gestiti
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join('logs', 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    })
  ],
});

// Funzioni helper per logging strutturato
export const logRequest = (req: any, res: any, duration: number) => {
  logger.http('API Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id || 'anonymous',
  });
};

export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context,
  });
};

export const logSecurity = (event: string, details: Record<string, any>) => {
  logger.warn('Security Event', {
    event,
    ...details,
  });
};

export const logDatabase = (operation: string, details: Record<string, any>) => {
  logger.info('Database Operation', {
    operation,
    ...details,
  });
};

export const logAuth = (event: string, userId?: string, details?: Record<string, any>) => {
  logger.info('Authentication Event', {
    event,
    userId,
    ...details,
  });
};

export default logger; 