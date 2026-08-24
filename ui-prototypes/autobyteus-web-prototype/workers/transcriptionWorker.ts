import type { TranscriptionMessage, WarningMessage, SessionInitMessage, WebSocketMessage } from '~/types/transcription';
    
    interface WorkerMessage {
      type: string;
      payload?: any;
    }
    
    let websocket: WebSocket | null = null;
    
    self.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const { type, payload } = event.data;
      console.log('TranscriptionWorker received message:', type);
    
      switch (type) {
        case 'CONNECT':
          if (!payload.transcriptionWsEndpoint) {
            console.error('Missing transcriptionWsEndpoint configuration.');
            postMessage({ 
              type: 'ERROR', 
              payload: 'Missing transcriptionWsEndpoint configuration' 
            });
            return;
          }
          connect(payload.workspaceId, payload.stepId, payload.transcriptionWsEndpoint);
          break;
        case 'DISCONNECT':
          console.log('DISCONNECT message received.');
          disconnect();
          break;
        case 'SEND_AUDIO':
          console.log('SEND_AUDIO message received.');
          // Now expecting WAV data directly as ArrayBuffer
          sendAudioData(payload.wavData);
          break;
        default:
          console.warn('Unknown message type from main thread:', type);
      }
    };
    
    const connect = (workspaceId: string, stepId: string, wsEndpoint: string) => {
      console.log('Connecting to WebSocket with workspaceId:', workspaceId, 'stepId:', stepId, 'wsEndpoint:', wsEndpoint);
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log('WebSocket is already connected.');
        postMessage({ type: 'CONNECTED' });
        return;
      }
    
      try {
        const wsUrl = `${wsEndpoint}/${workspaceId}/${stepId}`;
        console.log('Worker connecting to WebSocket:', wsUrl);
    
        websocket = new WebSocket(wsUrl);
        websocket.binaryType = 'arraybuffer';
    
        websocket.onopen = () => {
          console.log('WebSocket connection established in worker.');
          postMessage({ type: 'CONNECTED' });
        };
    
        websocket.onmessage = (event) => {
          try {
            if (typeof event.data === 'string') {
              const message: WebSocketMessage = JSON.parse(event.data);
              console.log('WebSocket message received in worker:', message);
              postMessage({ type: 'MESSAGE', payload: message });
            }
          } catch (err) {
            console.error('Worker error parsing WebSocket message:', err);
            postMessage({ 
              type: 'ERROR', 
              payload: 'Error parsing WebSocket message' 
            });
          }
        };
    
        websocket.onclose = (event) => {
          console.log('WebSocket connection closed in worker:', event.code, event.reason);
          postMessage({ 
            type: 'DISCONNECTED', 
            payload: { code: event.code, reason: event.reason } 
          });
        };
    
        websocket.onerror = (event) => {
          console.error('WebSocket error in worker:', event);
          postMessage({ 
            type: 'ERROR', 
            payload: 'WebSocket connection error' 
          });
        };
      } catch (error) {
        console.error('Error establishing WebSocket connection:', error);
        postMessage({ 
          type: 'ERROR', 
          payload: 'Failed to establish WebSocket connection' 
        });
      }
    };
    
    const disconnect = () => {
      console.log('Disconnecting WebSocket.');
      if (websocket) {
        websocket.close();
        websocket = null;
        postMessage({ type: 'DISCONNECTED' });
        console.log('WebSocket disconnected.');
      } else {
        console.warn('WebSocket is already null.');
      }
    };
    
    const sendAudioData = (data: ArrayBuffer) => {
      console.log('Sending audio data to WebSocket.');
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.error('WebSocket is not connected. Cannot send audio data.');
        postMessage({ 
          type: 'ERROR', 
          payload: 'WebSocket is not connected. Cannot send audio data.' 
        });
        return;
      }
    
      try {
        websocket.send(data);
        console.log('Audio data sent to WebSocket.');
      } catch (error) {
        console.error('Error sending audio data:', error);
        postMessage({ 
          type: 'ERROR', 
          payload: 'Failed to send audio data' 
        });
      }
    };