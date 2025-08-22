const winston = require('winston');

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    }),
  ],
});

if (process.env.NODE_ENV !== 'development') {
  logger.add(new winston.transports.File({ filename: 'error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'combined.log' }));
}

logger.exceptions.handle(
  new winston.transports.File({ filename: 'exceptions.log' })
);

process.on('uncaughtException', (err) => {
  logger.error('Exceção não capturada (uncaughtException):', { message: err.message, stack: err.stack });
  // process.exit(1); // Opcional
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Rejeição não tratada (unhandledRejection):', { reason });
  // throw reason; // Remova essa linha para não derrubar o servidor silenciosamente
});

module.exports = logger;
