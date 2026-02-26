import { JsonStringFieldExtractor } from './json-string-field-extractor.js';

export class FileContentStreamUpdate {
  contentDelta: string;
  path?: string;
  contentComplete?: string;

  constructor(data: { contentDelta?: string; path?: string; contentComplete?: string } = {}) {
    this.contentDelta = data.contentDelta ?? '';
    this.path = data.path;
    this.contentComplete = data.contentComplete;
  }
}

class BaseFileContentStreamer {
  private contentKey: string;
  private extractor: JsonStringFieldExtractor;
  path?: string;
  content?: string;

  constructor(contentKey: string) {
    this.contentKey = contentKey;
    this.extractor = new JsonStringFieldExtractor(new Set([contentKey]), new Set(['path', contentKey]));
  }

  feed(jsonDelta: string): FileContentStreamUpdate {
    const result = this.extractor.feed(jsonDelta);

    if (result.completed['path'] && !this.path) {
      this.path = result.completed['path'];
    }

    if (result.completed[this.contentKey]) {
      this.content = result.completed[this.contentKey];
    }

    return new FileContentStreamUpdate({
      contentDelta: result.deltas[this.contentKey] ?? '',
      path: result.completed['path'],
      contentComplete: result.completed[this.contentKey]
    });
  }
}

export class WriteFileContentStreamer extends BaseFileContentStreamer {
  constructor() {
    super('content');
  }
}

export class EditFileContentStreamer extends BaseFileContentStreamer {
  constructor() {
    super('patch');
  }
}
