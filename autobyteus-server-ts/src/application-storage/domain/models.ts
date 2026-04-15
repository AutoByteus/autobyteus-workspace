export type ApplicationStorageLayout = {
  applicationId: string;
  rootPath: string;
  dbDir: string;
  appDatabasePath: string;
  platformDatabasePath: string;
  logsDir: string;
  workerStdoutLogPath: string;
  workerStderrLogPath: string;
  runtimeDir: string;
  engineLockPath: string;
  engineStatusPath: string;
};
