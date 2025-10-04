/* eslint-disable no-console */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

const formatMessage = (level: LogLevel, message: string) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
};

const shouldLogDebug = () => {
  return process.env.NODE_ENV !== 'production';
};

export const logger = {
  debug(message: string) {
    if (shouldLogDebug()) {
      console.debug(formatMessage(LogLevel.DEBUG, message));
    }
  },
  info(message: string) {
    console.log(formatMessage(LogLevel.INFO, message));
  },
  warn(message: string) {
    console.warn(formatMessage(LogLevel.WARN, message));
  },
  error(message: string, error?: unknown) {
    console.error(formatMessage(LogLevel.ERROR, message));
    if (error) {
      console.error(error);
    }
  },
};
