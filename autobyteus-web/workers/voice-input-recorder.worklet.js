class VoiceInputRecorderProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.samples = [];
    this.flushRequested = false;
    this.levelTick = 0;

    this.port.onmessage = (event) => {
      if (event.data?.type === 'FLUSH') {
        this.flushRequested = true;
      }
    };
  }

  createWavHeader(sampleCount, wavSampleRate) {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, sampleCount * 2 + 36, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, wavSampleRate, true);
    view.setUint32(28, wavSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, sampleCount * 2, true);

    return header;
  }

  flush() {
    const pcm = new Int16Array(this.samples.length);
    let peak = 0;
    let sumSquares = 0;

    for (let i = 0; i < this.samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, this.samples[i]));
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      peak = Math.max(peak, Math.abs(sample));
      sumSquares += sample * sample;
    }

    const wavSampleRate = sampleRate;
    const header = this.createWavHeader(pcm.length, wavSampleRate);
    const wavData = new Uint8Array(header.byteLength + pcm.byteLength);
    wavData.set(new Uint8Array(header), 0);
    wavData.set(new Uint8Array(pcm.buffer), header.byteLength);

    const rms = pcm.length > 0 ? Math.sqrt(sumSquares / pcm.length) : 0;
    const durationMs = wavSampleRate > 0 ? Math.round((pcm.length / wavSampleRate) * 1000) : 0;

    this.port.postMessage({
      type: 'audio-ready',
      wavData,
      diagnostics: {
        inputSampleRate: sampleRate,
        wavSampleRate,
        durationMs,
        rms,
        peak,
        sampleCount: pcm.length,
      },
    }, [wavData.buffer]);
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (input) {
      let peak = 0;
      for (let i = 0; i < input.length; i++) {
        const sample = input[i];
        this.samples.push(sample);
        peak = Math.max(peak, Math.abs(sample));
      }

      this.levelTick += 1;
      if (this.levelTick >= 8) {
        this.levelTick = 0;
        this.port.postMessage({
          type: 'capture-stats',
          level: peak,
        });
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
