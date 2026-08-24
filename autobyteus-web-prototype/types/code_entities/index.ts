export interface CodeEntity {
    docstring: string;
    file_path: string;
    type: string; // This can be 'class', 'function', 'method', 'module'
  }
  
  export interface ClassEntity extends CodeEntity {
    class_name: string;
    type: 'class'; // To narrow down the type
  }
  
  export interface FunctionEntity extends CodeEntity {
    name: string;
    signature: string;
    type: 'function'; // To narrow down the type
  }
  
  export interface MethodEntity extends CodeEntity {
    name: string;
    type: 'method'; // To narrow down the type
  }
  
  export interface ModuleEntity extends CodeEntity {
    type: 'module'; // To narrow down the type
  }
  
  export interface ScoredEntity<T extends CodeEntity> {
    entity: T;
    score: number;
  }
  
  export interface SearchResult {
    total: number;
    entities: ScoredEntity<CodeEntity>[];
  }
  