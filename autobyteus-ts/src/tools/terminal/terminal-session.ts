export interface TerminalSession {
  start(cwd: string): Promise<void>;
  write(data: Buffer | string): Promise<void>;
  read(timeout?: number): Promise<Buffer | null>;
  resize(rows: number, cols: number): void;
  close(): Promise<void>;
  readonly isAlive: boolean;
  readonly selectedShell?: string | null;
}

export type TerminalSessionFactory = new (sessionId: string) => TerminalSession;
