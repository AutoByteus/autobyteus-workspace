/**
 * Represents a user message formatted specifically for input to an LLM.
 */

export interface LLMUserMessageData {
  content: string;
  image_urls?: string[];
  audio_urls?: string[];
  video_urls?: string[];
}

export class LLMUserMessage {
  content: string;
  image_urls: string[];
  audio_urls: string[];
  video_urls: string[];

  constructor(data: LLMUserMessageData) {
    this.content = data.content;
    this.image_urls = data.image_urls || [];
    this.audio_urls = data.audio_urls || [];
    this.video_urls = data.video_urls || [];

    this.validate();
  }

  private validate() {
    if (typeof this.content !== 'string') {
      throw new Error("LLMUserMessage 'content' must be a string.");
    }
    if (!Array.isArray(this.image_urls) || !this.image_urls.every(u => typeof u === 'string')) {
      throw new Error("LLMUserMessage 'image_urls' must be a list of strings.");
    }
    // ... skipping other media types validation for brevity unless critical? 
    // The python code validates them all. I should too for parity.
    if (!Array.isArray(this.audio_urls) || !this.audio_urls.every(u => typeof u === 'string')) {
       throw new Error("LLMUserMessage 'audio_urls' must be a list of strings.");
    }
    if (!Array.isArray(this.video_urls) || !this.video_urls.every(u => typeof u === 'string')) {
       throw new Error("LLMUserMessage 'video_urls' must be a list of strings.");
    }

    if (!this.content && this.image_urls.length === 0 && this.audio_urls.length === 0 && this.video_urls.length === 0) {
      throw new Error("LLMUserMessage must have either content or at least one media URL.");
    }
  }

  toDict(): LLMUserMessageData {
    const data: LLMUserMessageData = {
      content: this.content
    };
    if (this.image_urls.length > 0) data.image_urls = this.image_urls;
    if (this.audio_urls.length > 0) data.audio_urls = this.audio_urls;
    if (this.video_urls.length > 0) data.video_urls = this.video_urls;
    return data;
  }

  static fromDict(data: LLMUserMessageData): LLMUserMessage {
    return new LLMUserMessage(data);
  }
}
