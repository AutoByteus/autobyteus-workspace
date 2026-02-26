import fs from 'node:fs';
import path from 'node:path';

export class WorkingContextSnapshotStore {
  baseDir: string;
  agentId: string;
  private readonly agentRootSubdir: string;

  constructor(
    baseDir: string,
    agentId: string,
    options: { agentRootSubdir?: string } = {}
  ) {
    this.baseDir = baseDir;
    this.agentId = agentId;
    this.agentRootSubdir = options.agentRootSubdir ?? 'agents';
  }

  exists(agentId: string): boolean {
    return fs.existsSync(this.getPath(agentId));
  }

  read(agentId: string): Record<string, unknown> | null {
    const filePath = this.getPath(agentId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  }

  write(agentId: string, payload: Record<string, unknown>): void {
    const filePath = this.getPath(agentId);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf-8');
  }

  private getPath(agentId: string): string {
    if (!this.agentRootSubdir) {
      return path.join(this.baseDir, 'working_context_snapshot.json');
    }
    return path.join(this.baseDir, this.agentRootSubdir, agentId, 'working_context_snapshot.json');
  }
}
