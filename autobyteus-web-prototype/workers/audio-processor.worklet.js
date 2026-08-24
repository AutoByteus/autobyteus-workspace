class AudioChunkProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const { targetSampleRate, chunkDuration, overlapDuration } = options.processorOptions;
    this.targetSampleRate = targetSampleRate || 16000;
    this.chunkDuration = chunkDuration || 7;
    this.overlapDuration = overlapDuration || 0.2;  // Use configured overlapDuration

    this.chunkSize = this.targetSampleRate * this.chunkDuration;

    this.overlapSize = Math.floor(this.targetSampleRate * this.overlapDuration);

    // Main buffer for the current chunk
    this.buffer = new Float32Array(this.chunkSize);
    this.sampleCount = 0;

    // Overlap buffer from previous chunk
    this.overlapBuffer = new Float32Array(this.overlapSize);
    this.overlapCount = 0; // how many samples are currently in overlapBuffer

    this.isInputStopped = false;

    this.port.onmessage = (event) => {
      const { type } = event.data;
      if (type === 'FLUSH') {
        this.isInputStopped = true;
        this.tryFlushAndFinalize();
      }
    };
  }

  createWavHeader(pcmLength) {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // RIFF identifier
    view.setUint8(0, 'R'.charCodeAt(0));
    view.setUint8(1, 'I'.charCodeAt(0));
    view.setUint8(2, 'F'.charCodeAt(0));
    view.setUint8(3, 'F'.charCodeAt(0));
    
    // File length
    view.setUint32(4, pcmLength * 2 + 36, true);
    
    // WAVE identifier
    view.setUint8(8, 'W'.charCodeAt(0));
    view.setUint8(9, 'A'.charCodeAt(0));
    view.setUint8(10, 'V'.charCodeAt(0));
    view.setUint8(11, 'E'.charCodeAt(0));
    
    // Format chunk identifier
    view.setUint8(12, 'f'.charCodeAt(0));
    view.setUint8(13, 'm'.charCodeAt(0));
    view.setUint8(14, 't'.charCodeAt(0));
    view.setUint8(15, ' '.charCodeAt(0));
    
    // Format chunk length
    view.setUint32(16, 16, true);
    
    // Sample format (raw)
    view.setUint16(20, 1, true);
    
    // Channel count
    view.setUint16(22, 1, true);
    
    // Sample rate
    view.setUint32(24, this.targetSampleRate, true);
    
    // Byte rate
    view.setUint32(28, this.targetSampleRate * 2, true);
    
    // Block align
    view.setUint16(32, 2, true);
    
    // Bits per sample
    view.setUint16(34, 16, true);
    
    // Data chunk identifier
    view.setUint8(36, 'd'.charCodeAt(0));
    view.setUint8(37, 'a'.charCodeAt(0));
    view.setUint8(38, 't'.charCodeAt(0));
    view.setUint8(39, 'a'.charCodeAt(0));
    
    // Data chunk length
    view.setUint32(40, pcmLength * 2, true);
    
    return header;
  }

  convertFloat32ToWav(float32Samples) {
    // Convert Float32 to Int16
    const pcmBuffer = new Int16Array(float32Samples.length);
    for (let i = 0; i < float32Samples.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Samples[i]));
      pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Create WAV header
    const wavHeader = this.createWavHeader(pcmBuffer.length);
    const wavData = new Uint8Array(wavHeader.byteLength + pcmBuffer.buffer.byteLength);
    wavData.set(new Uint8Array(wavHeader), 0);
    wavData.set(new Uint8Array(pcmBuffer.buffer), wavHeader.byteLength);

    return wavData;
  }

  tryFlushAndFinalize() {
    // If we have leftover samples in the main buffer, combine them with the overlap
    if (this.sampleCount > 0) {
      const totalSamples = this.overlapCount + this.sampleCount;
      const combinedBuffer = new Float32Array(totalSamples);

      // Copy overlap portion
      combinedBuffer.set(this.overlapBuffer.subarray(0, this.overlapCount), 0);
      // Copy leftover from current buffer
      combinedBuffer.set(this.buffer.subarray(0, this.sampleCount), this.overlapCount);

      const wavData = this.convertFloat32ToWav(combinedBuffer);

      // Send final chunk
      this.port.postMessage({
        type: 'chunk',
        wavData: wavData,
        targetSampleRate: this.targetSampleRate,
        isFinal: true
      }, [wavData.buffer]);

      this.buffer = new Float32Array(this.chunkSize);
      this.sampleCount = 0;
    }

    // Notify completion
    this.port.postMessage({ type: 'flush_done' });
  }

  process(inputs, outputs, parameters) {
    // If input is stopped and no data in buffer, we're done
    if (this.isInputStopped && this.sampleCount === 0) {
      return false;
    }

    const input = inputs[0][0];
    if (!input && this.isInputStopped) {
      this.tryFlushAndFinalize();
      return false;
    }

    if (!input) return true;

    // Only process new input if not stopped
    if (!this.isInputStopped) {
      const ratio = this.targetSampleRate / sampleRate;
      
      for (let i = 0; i < input.length; i++) {
        const targetIndex = Math.floor(i * ratio);
        if (this.sampleCount < this.chunkSize && targetIndex < this.chunkSize) {
          this.buffer[this.sampleCount++] = input[i];
        }
      }

      if (this.sampleCount >= this.chunkSize) {
        const totalSamples = this.overlapCount + this.chunkSize;
        const combinedBuffer = new Float32Array(totalSamples);
        
        combinedBuffer.set(this.overlapBuffer.subarray(0, this.overlapCount), 0);
        combinedBuffer.set(this.buffer, this.overlapCount);

        const wavData = this.convertFloat32ToWav(combinedBuffer);

        this.port.postMessage({
          type: 'chunk',
          wavData: wavData,
          targetSampleRate: this.targetSampleRate,
          isFinal: false
        }, [wavData.buffer]);

        if (this.overlapSize > 0) {
          const startOverlap = this.chunkSize - this.overlapSize;
          for (let j = 0; j < this.overlapSize; j++) {
            this.overlapBuffer[j] = this.buffer[startOverlap + j];
          }
          this.overlapCount = this.overlapSize;
        }

        this.buffer = new Float32Array(this.chunkSize);
        this.sampleCount = 0;
      }
    }

    return true;
  }
}

registerProcessor('audio-chunk-processor', AudioChunkProcessor);
