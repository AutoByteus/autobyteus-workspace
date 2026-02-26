import { StreamScanner } from './stream-scanner.js';
import { EventEmitter } from './event-emitter.js';
import { SegmentEvent, SegmentType } from './events.js';
import { createDetectionStrategies, type DetectionStrategy } from './strategies/registry.js';

export class ParserConfig {
  static DEFAULT_JSON_PATTERNS = [
    '{"tool"',
    '{"tool_calls"',
    '{"tools"',
    '{"function"',
    '{"name"',
    '[{"tool"',
    '[{"function"',
    '[{"name"'
  ];

  parseToolCalls: boolean;
  jsonToolPatterns: string[];
  jsonToolParser?: any;
  strategyOrder: string[];
  segmentIdPrefix?: string;

  constructor(options?: {
    parseToolCalls?: boolean;
    jsonToolPatterns?: string[];
    jsonToolParser?: any;
    strategyOrder?: string[];
    segmentIdPrefix?: string;
  }) {
    this.parseToolCalls = options?.parseToolCalls ?? true;
    this.jsonToolPatterns = options?.jsonToolPatterns
      ? [...options.jsonToolPatterns]
      : [...ParserConfig.DEFAULT_JSON_PATTERNS];
    this.jsonToolParser = options?.jsonToolParser;
    this.strategyOrder = options?.strategyOrder ? [...options.strategyOrder] : ['xml_tag'];
    this.segmentIdPrefix = options?.segmentIdPrefix;
  }
}

export class ParserContext {
  private configInstance: ParserConfig;
  private scanner: StreamScanner;
  private emitter: EventEmitter;
  private currentStateRef: any;
  private strategies: DetectionStrategy[];

  constructor(config?: ParserConfig) {
    this.configInstance = config ?? new ParserConfig();
    this.scanner = new StreamScanner();
    this.emitter = new EventEmitter(this.configInstance.segmentIdPrefix);
    this.currentStateRef = null;
    this.strategies = createDetectionStrategies(this.configInstance.strategyOrder);
  }

  get config(): ParserConfig {
    return this.configInstance;
  }

  get parseToolCalls(): boolean {
    return this.configInstance.parseToolCalls;
  }

  get jsonToolPatterns(): string[] {
    return this.configInstance.jsonToolPatterns;
  }

  get jsonToolParser(): any {
    return this.configInstance.jsonToolParser;
  }

  get detectionStrategies(): DetectionStrategy[] {
    return this.strategies;
  }

  get currentState(): any {
    if (!this.currentStateRef) {
      throw new Error('No current state is set.');
    }
    return this.currentStateRef;
  }

  set currentState(state: any) {
    this.currentStateRef = state;
  }

  transitionTo(newState: any): void {
    this.currentStateRef = newState;
  }

  append(text: string): void {
    this.scanner.append(text);
  }

  peekChar(): string | undefined {
    return this.scanner.peek();
  }

  advance(): void {
    this.scanner.advance();
  }

  advanceBy(count: number): void {
    this.scanner.advanceBy(count);
  }

  hasMoreChars(): boolean {
    return this.scanner.hasMoreChars();
  }

  getPosition(): number {
    return this.scanner.getPosition();
  }

  getBufferLength(): number {
    return this.scanner.getBufferLength();
  }

  setPosition(position: number): void {
    this.scanner.setPosition(position);
  }

  rewindBy(count: number): void {
    const newPos = Math.max(0, this.scanner.getPosition() - count);
    this.scanner.setPosition(newPos);
  }

  substring(start: number, end?: number): string {
    return this.scanner.substring(start, end);
  }

  find(sub: string, start?: number): number {
    return this.scanner.find(sub, start);
  }

  consume(count: number): string {
    return this.scanner.consume(count);
  }

  consumeRemaining(): string {
    return this.scanner.consumeRemaining();
  }

  compact(minPrefix = 65536): void {
    this.scanner.compact(minPrefix);
  }

  emitSegmentStart(segmentType: SegmentType, metadata: Record<string, any> = {}): string {
    return this.emitter.emitSegmentStart(segmentType, metadata);
  }

  emitSegmentContent(delta: any): void {
    this.emitter.emitSegmentContent(delta);
  }

  emitSegmentEnd(): string | undefined {
    return this.emitter.emitSegmentEnd();
  }

  getCurrentSegmentId(): string | undefined {
    return this.emitter.getCurrentSegmentId();
  }

  getCurrentSegmentType(): SegmentType | undefined {
    return this.emitter.getCurrentSegmentType();
  }

  getCurrentSegmentContent(): string {
    return this.emitter.getCurrentSegmentContent();
  }

  getCurrentSegmentMetadata(): Record<string, any> {
    return this.emitter.getCurrentSegmentMetadata();
  }

  updateCurrentSegmentMetadata(metadata: Record<string, any>): void {
    this.emitter.updateCurrentSegmentMetadata(metadata);
  }

  getAndClearEvents(): SegmentEvent[] {
    return this.emitter.getAndClearEvents();
  }

  getEvents(): SegmentEvent[] {
    return this.emitter.getEvents();
  }

  appendTextSegment(text: string): void {
    this.emitter.appendTextSegment(text);
  }
}
