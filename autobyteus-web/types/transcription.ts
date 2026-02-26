export type TranscriptionMessage = {
  type: 'transcription';
  text: string;
  timestamp: number;
}

export type WarningMessage = {
  type: 'warning';
  message: string;
}

export type SessionInitMessage = {
  type: 'session_init';
  session_id: string;
}

export type WebSocketMessage = TranscriptionMessage | WarningMessage | SessionInitMessage;

export type MessageHandler = (message: WebSocketMessage) => void;