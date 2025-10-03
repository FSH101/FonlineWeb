/* eslint-disable no-console */
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

const formatMessage = (level: LogLevel, message: string) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
};

export const logger = {
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
  }
};
