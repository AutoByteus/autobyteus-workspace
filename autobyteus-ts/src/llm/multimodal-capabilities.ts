export type MultimodalCapabilityState = 'supported' | 'unsupported' | 'unknown';

export type MultimodalCapabilities = {
  image: MultimodalCapabilityState;
  audio: MultimodalCapabilityState;
  video: MultimodalCapabilityState;
};

export const UNKNOWN_MULTIMODAL_CAPABILITIES: Readonly<MultimodalCapabilities> = Object.freeze({
  image: 'unknown',
  audio: 'unknown',
  video: 'unknown',
});

export const cloneMultimodalCapabilities = (
  capabilities: MultimodalCapabilities,
): MultimodalCapabilities => ({
  image: capabilities.image,
  audio: capabilities.audio,
  video: capabilities.video,
});
