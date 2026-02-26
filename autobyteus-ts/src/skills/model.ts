export class Skill {
  name: string;
  description: string;
  content: string;
  rootPath: string;

  constructor(name: string, description: string, content: string, rootPath: string) {
    this.name = name;
    this.description = description;
    this.content = content;
    this.rootPath = rootPath;
  }
}
