// Logger 实现

import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel.INFO;
  private logFile: string | null = null;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  init(logPath: string, level: LogLevel = LogLevel.INFO) {
    this.level = level;
    this.logFile = logPath;
    
    if (logPath) {
      const dir = path.dirname(logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private format(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message} ${args.length ? JSON.stringify(args) : ''}\n`;
  }

  private write(text: string) {
    if (this.logFile) {
      fs.appendFileSync(this.logFile, text);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.level <= LogLevel.DEBUG) {
      const text = this.format('DEBUG', message, ...args);
      console.debug(text.trim());
      this.write(text);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.level <= LogLevel.INFO) {
      const text = this.format('INFO', message, ...args);
      console.log(text.trim());
      this.write(text);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.level <= LogLevel.WARN) {
      const text = this.format('WARN', message, ...args);
      console.warn(text.trim());
      this.write(text);
    }
  }

  error(message: string, ...args: any[]) {
    if (this.level <= LogLevel.ERROR) {
      const text = this.format('ERROR', message, ...args);
      console.error(text.trim());
      this.write(text);
    }
  }
}

export const logger = Logger.getInstance();
