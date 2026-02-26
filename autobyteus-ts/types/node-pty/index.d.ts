declare module 'node-pty' {
  export interface IPty {
    write(data: string): void;
    resize(cols: number, rows: number): void;
    kill(signal?: string): void;
    onData(listener: (data: string) => void): void;
    onExit(listener: (event?: { exitCode?: number; signal?: number }) => void): void;
  }

  export type SpawnOptions = {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: Record<string, string | undefined>;
  };

  export function spawn(file: string, args?: string[], options?: SpawnOptions): IPty;
}
