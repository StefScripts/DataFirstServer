import fs from 'fs';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Simple structured logger with filtering by environment
 */
class Logger {
  private logDir: string;
  private errorLog: fs.WriteStream | null = null;
  private accessLog: fs.WriteStream | null = null;

  constructor() {
    this.logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Only create file streams in production
    if (process.env.NODE_ENV === 'production') {
      this.errorLog = fs.createWriteStream(path.join(this.logDir, 'error.log'), { flags: 'a' });

      this.accessLog = fs.createWriteStream(path.join(this.logDir, 'access.log'), { flags: 'a' });
    }
  }

  /**
   * Log a message with specific level
   */
  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    const logString = JSON.stringify(logEntry);

    // Always log to console
    switch (level) {
      case 'debug':
        // Only log debug in development
        if (process.env.NODE_ENV !== 'production') {
          console.debug(logString);
        }
        break;
      case 'info':
        console.info(logString);
        // Log access to file in production
        this.accessLog?.write(`${logString}\n`);
        break;
      case 'warn':
        console.warn(logString);
        this.errorLog?.write(`${logString}\n`);
        break;
      case 'error':
        console.error(logString);
        this.errorLog?.write(`${logString}\n`);
        break;
    }
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: any) {
    this.log('error', message, {
      message: error?.message,
      stack: error?.stack,
      ...(error && typeof error === 'object' && { details: error })
    });
  }

  /**
   * Log API request
   */
  logRequest(req: any, res: any, duration: number) {
    this.info(`${req.method} ${req.path} ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  /**
   * Properly close logger streams
   */
  close() {
    this.errorLog?.end();
    this.accessLog?.end();
  }
}

// Export singleton
export const logger = new Logger();
