import {
  RunMemoryFileStore,
  type SystemInstructionCaptureResult,
} from 'autobyteus-ts';

export type SystemInstructionCaptureInput = {
  memoryDir: string;
  content: string;
  suppliedAt: number;
};

export class SystemInstructionCaptureService {
  capture(input: SystemInstructionCaptureInput): SystemInstructionCaptureResult {
    if (typeof input.memoryDir !== 'string' || input.memoryDir.trim().length === 0) {
      throw new Error('System instruction capture requires a non-empty run memory directory.');
    }
    return new RunMemoryFileStore(input.memoryDir).recordSystemInstructionSupply(
      input.content,
      input.suppliedAt,
    );
  }
}

let cachedService: SystemInstructionCaptureService | null = null;

export const getSystemInstructionCaptureService = (): SystemInstructionCaptureService => {
  cachedService ??= new SystemInstructionCaptureService();
  return cachedService;
};
