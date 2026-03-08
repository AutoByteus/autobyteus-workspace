class VoiceInputRecorderProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const { targetSampleRate } = options.processorOptions || {};
    this.targetSampleRate = targetSampleRate || 16000;
    this.samples = [];
    this.flushRequested = false;

    this.port.onmessage = (event) => {
      if (event.data?.type === 'FLUSH') {
        this.flushRequested = true;
      }
    };
  }

  createWavHeader(sampleCount) {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, sampleCount * 2 + 36, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, this.targetSampleRate, true);
    view.setUint32(28, this.targetSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, sampleCount * 2, true);

    return header;
  }

  flush() {
    const pcm = new Int16Array(this.samples.length);
    for (let i = 0; i < this.samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, this.samples[i]));
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    const header = this.createWavHeader(pcm.length);
    const wavData = new Uint8Array(header.byteLength + pcm.byteLength);
    wavData.set(new Uint8Array(header), 0);
    wavData.set(new Uint8Array(pcm.buffer), header.byteLength);

    this.port.postMessage({
      type: 'audio-ready',
      wavData,
    }, [wavData.buffer]);
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (input) {
      for (let i = 0; i < input.length; i++) {
        this.samples.push(input[i]);
      }
    }

    if (this.flushRequested) {
      this.flush();
      return false;
    }

    return true;
  }
}

registerProcessor('voice-input-recorder', VoiceInputRecorderProcessor);
