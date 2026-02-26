import { LLMExtension } from './base-extension.js';

export class ExtensionRegistry {
  private extensions: LLMExtension[] = [];

  register(extension: LLMExtension): void {
    // Avoid duplicates of the same instance? Python logic checks for *type* duplicates?
    // Python: `if not any(isinstance(ext, type(extension)) for ext in self._extensions):`
    // Yes, allows only one instance per class.
    
    const alreadyExists = this.extensions.some(ext => ext.constructor === extension.constructor);
    if (!alreadyExists) {
      this.extensions.push(extension);
    }
  }

  unregister(extension: LLMExtension): void {
    const index = this.extensions.indexOf(extension);
    if (index !== -1) {
      this.extensions.splice(index, 1);
    }
  }

  get<T extends LLMExtension>(extensionClass: { new(...args: unknown[]): T }): T | null {
    const found = this.extensions.find(ext => ext instanceof extensionClass);
    return (found as T) || null;
  }

  getAll(): LLMExtension[] {
    return [...this.extensions];
  }

  clear(): void {
    this.extensions = [];
  }
}
