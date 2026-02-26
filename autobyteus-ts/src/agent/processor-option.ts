export class ProcessorOption {
  readonly name: string;
  readonly isMandatory: boolean;

  constructor(name: string, isMandatory: boolean) {
    this.name = name;
    this.isMandatory = isMandatory;
  }
}

export class HookOption {
  readonly name: string;
  readonly isMandatory: boolean;

  constructor(name: string, isMandatory: boolean) {
    this.name = name;
    this.isMandatory = isMandatory;
  }
}
