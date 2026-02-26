export class ImageGenerationResponse {
  image_urls: string[];
  revised_prompt?: string | null;

  constructor(image_urls: string[], revised_prompt?: string | null) {
    this.image_urls = image_urls;
    this.revised_prompt = revised_prompt ?? null;
  }
}

export class SpeechGenerationResponse {
  audio_urls: string[];

  constructor(audio_urls: string[]) {
    this.audio_urls = audio_urls;
  }
}
