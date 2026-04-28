import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fsMock } = vi.hoisted(() => ({
  fsMock: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}));

vi.mock('node:fs', () => fsMock);

import {
  isPro,
  openHistoryDb,
  saveHistory,
  getHistory,
} from '../src/history.js';
import type { TraceEntry } from '../src/trace.js';

beforeEach(() => {
  fsMock.existsSync.mockReset();
  fsMock.mkdirSync.mockReset();
});

describe('isPro', () => {
  it('returns true when license file exists', () => {
    fsMock.existsSync.mockReturnValue(true);
    expect(isPro()).toBe(true);
  });
  it('returns false when license file is missing', () => {
    fsMock.existsSync.mockReturnValue(false);
    expect(isPro()).toBe(false);
  });
});

describe('history database', () => {
  const sample = (id: number, toolName = 'echo', isError = false): TraceEntry => ({
    id,
    timestamp: '2025-01-01 12:00:00',
    toolName,
    durationMs: id * 10,
    isError,
    request: { name: toolName, arguments: { i: id } },
    response: { content: [{ type: 'text', text: `r${id}` }] },
  });

  it('saves and retrieves entries newest-first', () => {
    const db = openHistoryDb(':memory:');
    saveHistory(db, sample(1));
    saveHistory(db, sample(2, 'other', true));

    const all = getHistory(db);
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(2);
    expect(all[0].toolName).toBe('other');
    expect(all[0].isError).toBe(true);
    expect(all[1].id).toBe(1);
    expect(all[1].request).toEqual({ name: 'echo', arguments: { i: 1 } });
    db.close();
  });

  it('respects limit', () => {
    const db = openHistoryDb(':memory:');
    for (let i = 1; i <= 5; i++) saveHistory(db, sample(i));
    const limited = getHistory(db, 2);
    expect(limited).toHaveLength(2);
    expect(limited[0].id).toBe(5);
    db.close();
  });
});
