const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, align } = format;

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        colorize({ all: true }),
        timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        align(),
        logFormat
    ),
    transports: [
        new transports.Console(),
        // In production, you might want to log to a file or a remote service
        // new transports.File({ filename: 'error.log', level: 'error' }),
        // new transports.File({ filename: 'combined.log' }),
    ],
});

module.exports = logger;
