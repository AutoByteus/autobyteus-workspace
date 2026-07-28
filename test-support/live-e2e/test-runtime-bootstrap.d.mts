import type { ChildProcessWithoutNullStreams } from 'node:child_process';

export type TestDatabaseLocation = Readonly<{
  databasePath: string;
  databaseUrl: string;
  rootKeyPath: string;
}>;

export type MaterializedTestRuntime = Readonly<{
  runtimeRoot: string;
  runtimeEnvironmentPath: string;
  database: TestDatabaseLocation;
  serverUrl: string;
  templateBytes: Buffer;
}>;

export const workspaceRoot: string;
export const serverRoot: string;
export const trackedTestEnvironmentPath: string;
export const testDatabaseRoot: string;
export const testRuntimeRoot: string;
export const persistentTestRuntimeRoot: string;
export const builtServerEntry: string;
export function parseTrackedTestEnvironmentSource(
  source: string,
): Readonly<Record<'APP_ENV' | 'DB_TYPE' | 'DATABASE_URL' | 'AUTOBYTEUS_SERVER_HOST', string>>;
export function resolveTestDatabaseLocation(databaseUrl: string): TestDatabaseLocation;
export function readTrackedTestEnvironment(): Readonly<{
  bytes: Buffer;
  values: Readonly<Record<'APP_ENV' | 'DB_TYPE' | 'DATABASE_URL' | 'AUTOBYTEUS_SERVER_HOST', string>>;
  database: TestDatabaseLocation;
}>;
export function materializeTestRuntime(options?: {
  runtimeRoot?: string;
  databaseUrlOverride?: string;
  serverUrlOverride?: string;
}): MaterializedTestRuntime;
export function createSanitizedTestEnvironment(
  extra?: Record<string, string | undefined>,
): NodeJS.ProcessEnv;
export function reserveLoopbackPort(): Promise<number>;
export function startBuiltTestServer(options?: {
  runtimeRoot?: string;
  databaseUrlOverride?: string;
  port?: number;
  timeoutMs?: number;
  environment?: Record<string, string | undefined>;
}): Promise<MaterializedTestRuntime & {
  host: string;
  port: number;
  child: ChildProcessWithoutNullStreams;
  output(): string;
  stop(): Promise<void>;
}>;
export function executeGraphql<T>(
  serverUrl: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T>;
export function removeOwnedTestRuntime(
  runtimeRoot: string,
  database: TestDatabaseLocation,
): Promise<void>;
