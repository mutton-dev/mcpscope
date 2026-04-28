import { describe, it, expect } from 'vitest';
import {
  initialState,
  reduce,
  type AppState,
  type AppAction,
} from '../src/appState.js';
import type { McpCapabilities } from '../src/client.js';

const caps: McpCapabilities = {
  tools: [
    { name: 'echo', description: 'echo it', inputSchema: { type: 'object' } },
    { name: 'add', description: 'add', inputSchema: { type: 'object' } },
  ],
  resources: [{ uri: 'file:///a' }],
  prompts: [{ name: 'p1' }],
};

describe('app reducer', () => {
  it('starts on Tools tab with index 0', () => {
    const s = initialState(caps);
    expect(s.tab).toBe('tools');
    expect(s.cursor).toBe(0);
  });

  it('moves cursor down within tools', () => {
    const s1: AppState = initialState(caps);
    const s2 = reduce(s1, { type: 'cursor-down' });
    expect(s2.cursor).toBe(1);
    const s3 = reduce(s2, { type: 'cursor-down' });
    expect(s3.cursor).toBe(1); // clamped at end
  });

  it('moves cursor up but never below 0', () => {
    const s1: AppState = { ...initialState(caps), cursor: 1 };
    const s2 = reduce(s1, { type: 'cursor-up' });
    expect(s2.cursor).toBe(0);
    const s3 = reduce(s2, { type: 'cursor-up' });
    expect(s3.cursor).toBe(0);
  });

  it('cycles tabs and resets cursor', () => {
    const s1 = { ...initialState(caps), cursor: 1 };
    const s2 = reduce(s1, { type: 'next-tab' });
    expect(s2.tab).toBe('resources');
    expect(s2.cursor).toBe(0);
    const s3 = reduce(s2, { type: 'next-tab' });
    expect(s3.tab).toBe('prompts');
    const s4 = reduce(s3, { type: 'next-tab' });
    expect(s4.tab).toBe('tools');
  });

  it('records invoke result and trace entry', () => {
    const s1 = initialState(caps);
    const action: AppAction = {
      type: 'invoke-result',
      toolName: 'echo',
      result: {
        content: [{ type: 'text', text: 'hi' }],
        isError: false,
        trace: {
          toolName: 'echo',
          args: {},
          request: { name: 'echo', arguments: {} },
          response: { content: [] },
          durationMs: 5,
        },
      },
    };
    const s2 = reduce(s1, action);
    expect(s2.lastResult?.content).toEqual([{ type: 'text', text: 'hi' }]);
    expect(s2.history).toHaveLength(1);
    expect(s2.history[0].toolName).toBe('echo');
  });

  it('toggles history view', () => {
    const s1 = initialState(caps);
    const s2 = reduce(s1, { type: 'toggle-history' });
    expect(s2.showHistory).toBe(true);
    const s3 = reduce(s2, { type: 'toggle-history' });
    expect(s3.showHistory).toBe(false);
  });

  it('returns the currently selected tool name', () => {
    const s1 = { ...initialState(caps), cursor: 1 };
    expect(s1.tab).toBe('tools');
    const sel = caps.tools[s1.cursor];
    expect(sel.name).toBe('add');
  });
});
