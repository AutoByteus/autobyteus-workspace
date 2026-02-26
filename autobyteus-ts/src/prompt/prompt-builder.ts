import { PromptTemplate } from './prompt-template.js';

export class PromptBuilder {
  template: PromptTemplate | null = null;
  variableValues: Record<string, string> = {};

  static fromFile(filePath: string): PromptBuilder {
    const builder = new PromptBuilder();
    builder.template = new PromptTemplate({ file: filePath });
    return builder;
  }

  static fromString(templateString: string): PromptBuilder {
    const builder = new PromptBuilder();
    builder.template = new PromptTemplate({ template: templateString });
    return builder;
  }

  setVariableValue(name: string, value: string): PromptBuilder {
    this.variableValues[name] = value;
    return this;
  }

  build(): string {
    if (!this.template) {
      throw new Error('Template is not set');
    }
    return this.template.fill(this.variableValues);
  }
}
