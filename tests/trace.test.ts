import { describe, it, expect } from 'vitest';
import { formatTrace, addToTrace, type TraceEntry } from '../src/trace.js';
import type { InvokeResult } from '../src/invoke.js';

describe('formatTrace', () => {
  it('formats a successful entry', () => {
    const entry: TraceEntry = {
      id: 1,
      timestamp: '2025-01-01 12:00:00',
      toolName: 'echo',
      durationMs: 123,
      isError: false,
      request: { name: 'echo', arguments: { msg: 'hi' } },
      response: { content: [{ type: 'text', text: 'hi' }] },
    };
    const out = formatTrace(entry);
    expect(out).toContain('[2025-01-01 12:00:00]');
    expect(out).toContain('echo');
    expect(out).toContain('(123ms)');
    expect(out).toContain('OK');
    expect(out).toContain('Request:');
    expect(out).toContain('Response:');
  });

  it('marks error entries', () => {
    const entry: TraceEntry = {
      id: 2,
      timestamp: '2025-01-01 12:00:01',
      toolName: 'crash',
      durationMs: 5,
      isError: true,
      request: {},
      response: { error: 'boom' },
    };
    expect(formatTrace(entry)).toContain('ERR');
  });
});

describe('addToTrace', () => {
  it('appends an entry built from invoke result', () => {
    const history: TraceEntry[] = [];
    const result: InvokeResult = {
      content: [],
      isError: false,
      trace: {
        toolName: 'echo',
        args: { msg: 'hi' },
        request: { name: 'echo', arguments: { msg: 'hi' } },
        response: { content: [] },
        durationMs: 7,
      },
    };
    const entry = addToTrace(history, result, 'echo');
    expect(history).toHaveLength(1);
    expect(history[0]).toBe(entry);
    expect(entry.id).toBe(1);
    expect(entry.toolName).toBe('echo');
    expect(entry.durationMs).toBe(7);
    expect(entry.isError).toBe(false);
    expect(typeof entry.timestamp).toBe('string');
  });

  it('increments id across multiple appends', () => {
    const history: TraceEntry[] = [];
    const make = (): InvokeResult => ({
      content: [],
      isError: false,
      trace: { toolName: 't', args: {}, request: {}, response: {}, durationMs: 1 },
    });
    const a = addToTrace(history, make(), 't');
    const b = addToTrace(history, make(), 't');
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    expect(history).toHaveLength(2);
  });
});
