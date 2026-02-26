export class SkillVersion {
  tag: string;
  commitHash: string;
  message: string;
  createdAt: Date;
  isActive: boolean;

  constructor(options: {
    tag: string;
    commitHash: string;
    message: string;
    createdAt: Date;
    isActive: boolean;
  }) {
    this.tag = options.tag;
    this.commitHash = options.commitHash;
    this.message = options.message;
    this.createdAt = options.createdAt;
    this.isActive = options.isActive;
  }
}
