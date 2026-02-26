import { describe, it, expect } from 'vitest';
import { StreamScanner } from '../../../../../src/agent/streaming/parser/stream-scanner.js';

describe('StreamScanner basics', () => {
  it('starts with empty buffer', () => {
    const scanner = new StreamScanner();
    expect(scanner.getPosition()).toBe(0);
    expect(scanner.getBufferLength()).toBe(0);
    expect(scanner.hasMoreChars()).toBe(false);
    expect(scanner.peek()).toBeUndefined();
  });

  it('can be initialized with a buffer', () => {
    const scanner = new StreamScanner('hello');
    expect(scanner.getPosition()).toBe(0);
    expect(scanner.getBufferLength()).toBe(5);
    expect(scanner.hasMoreChars()).toBe(true);
    expect(scanner.peek()).toBe('h');
  });
});

describe('StreamScanner append', () => {
  it('appends to empty buffer', () => {
    const scanner = new StreamScanner();
    scanner.append('abc');
    expect(scanner.getBufferLength()).toBe(3);
    expect(scanner.peek()).toBe('a');
  });

  it('appends multiple times', () => {
    const scanner = new StreamScanner('he');
    scanner.append('llo');
    scanner.append(' world');
    expect(scanner.getBufferLength()).toBe(11);
    expect(scanner.substring(0)).toBe('hello world');
  });
});

describe('StreamScanner navigation', () => {
  it('advances single character', () => {
    const scanner = new StreamScanner('abc');
    expect(scanner.peek()).toBe('a');
    scanner.advance();
    expect(scanner.peek()).toBe('b');
    expect(scanner.getPosition()).toBe(1);
  });

  it('advance at end is no-op', () => {
    const scanner = new StreamScanner('a');
    scanner.advance();
    expect(scanner.hasMoreChars()).toBe(false);
    scanner.advance();
    expect(scanner.getPosition()).toBe(1);
  });

  it('advanceBy moves multiple positions', () => {
    const scanner = new StreamScanner('hello world');
    scanner.advanceBy(6);
    expect(scanner.peek()).toBe('w');
    expect(scanner.getPosition()).toBe(6);
  });

  it('advanceBy clamps past end', () => {
    const scanner = new StreamScanner('abc');
    scanner.advanceBy(100);
    expect(scanner.getPosition()).toBe(3);
    expect(scanner.hasMoreChars()).toBe(false);
  });
});

describe('StreamScanner substring', () => {
  it('substring with only start returns to end', () => {
    const scanner = new StreamScanner('hello world');
    expect(scanner.substring(6)).toBe('world');
  });

  it('substring with range', () => {
    const scanner = new StreamScanner('hello world');
    expect(scanner.substring(0, 5)).toBe('hello');
  });

  it('substring with same start/end returns empty', () => {
    const scanner = new StreamScanner('hello');
    expect(scanner.substring(2, 2)).toBe('');
  });
});

describe('StreamScanner setPosition', () => {
  it('sets valid position', () => {
    const scanner = new StreamScanner('hello');
    scanner.setPosition(3);
    expect(scanner.getPosition()).toBe(3);
    expect(scanner.peek()).toBe('l');
  });

  it('clamps negative position to 0', () => {
    const scanner = new StreamScanner('hello');
    scanner.setPosition(-5);
    expect(scanner.getPosition()).toBe(0);
  });

  it('clamps position past end to buffer length', () => {
    const scanner = new StreamScanner('hello');
    scanner.setPosition(100);
    expect(scanner.getPosition()).toBe(5);
  });
});

describe('StreamScanner integration', () => {
  it('handles streaming append pattern', () => {
    const scanner = new StreamScanner();
    scanner.append('<to');
    expect(scanner.peek()).toBe('<');
    scanner.advance();
    expect(scanner.peek()).toBe('t');
    scanner.advance();
    expect(scanner.peek()).toBe('o');
    scanner.advance();
    expect(scanner.hasMoreChars()).toBe(false);

    scanner.append('ol>');
    expect(scanner.hasMoreChars()).toBe(true);
    expect(scanner.peek()).toBe('o');
  });

  it('supports rewind pattern', () => {
    const scanner = new StreamScanner("<tool name='test'>");
    scanner.advanceBy(5);
    expect(scanner.peek()).toBe(' ');
    scanner.setPosition(0);
    expect(scanner.peek()).toBe('<');
    expect(scanner.substring(0, 18)).toBe("<tool name='test'>");
  });
});

describe('StreamScanner advanced', () => {
  it('finds substrings from position', () => {
    const scanner = new StreamScanner('abc<tool>def');
    expect(scanner.find('<')).toBe(3);
    scanner.advanceBy(4);
    expect(scanner.find('>')).toBe(8);
  });

  it('consumes characters', () => {
    const scanner = new StreamScanner('hello world');
    expect(scanner.consume(5)).toBe('hello');
    expect(scanner.peek()).toBe(' ');
  });

  it('consumes remaining characters', () => {
    const scanner = new StreamScanner('hello');
    scanner.advanceBy(2);
    expect(scanner.consumeRemaining()).toBe('llo');
    expect(scanner.hasMoreChars()).toBe(false);
  });

  it('compacts consumed buffer', () => {
    const scanner = new StreamScanner('hello');
    scanner.advanceBy(5);
    scanner.compact();
    expect(scanner.getBufferLength()).toBe(0);
    expect(scanner.getPosition()).toBe(0);
  });
});
