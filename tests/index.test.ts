import { describe, it, expect } from 'vitest';
import { listForTab as _ } from '../src/app.js';
import { initialState } from '../src/appState.js';

describe('module entry', () => {
  it('exports App + initial state with empty caps', () => {
    const s = initialState({ tools: [], resources: [], prompts: [] });
    expect(s.tab).toBe('tools');
    expect(s.cursor).toBe(0);
    expect(typeof _).toBe('function');
  });
});
