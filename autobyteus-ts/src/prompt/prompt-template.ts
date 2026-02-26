import fs from 'node:fs';

const TEMPLATE_VAR_REGEX = /{{\s*([A-Za-z_][\w]*)\s*}}/g;

export class PromptTemplate {
  template: string;
  requiredVars: Set<string>;

  constructor(options: { template?: string | null; file?: string | null }) {
    const template = options?.template ?? null;
    const file = options?.file ?? null;

    if (file) {
      if (!fs.existsSync(file)) {
        throw new Error(`Template file '${file}' does not exist.`);
      }
      this.template = fs.readFileSync(file, 'utf-8');
    } else if (template !== null && template !== undefined) {
      this.template = template;
    } else {
      throw new Error("Either 'template' or 'file' must be provided.");
    }

    this.requiredVars = new Set(
      Array.from(this.template.matchAll(TEMPLATE_VAR_REGEX)).map((match) => match[1])
    );
  }

  toDict(): Record<string, string> {
    return { template: this.template };
  }

  fill(values: Record<string, string>): string {
    return this.template.replace(TEMPLATE_VAR_REGEX, (_, varName: string) => {
      if (Object.prototype.hasOwnProperty.call(values, varName)) {
        const value = values[varName];
        return value ?? '';
      }
      return '';
    });
  }
}
