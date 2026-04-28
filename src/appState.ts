import type { McpCapabilities } from './client.js';
import type { InvokeResult } from './invoke.js';
import { addToTrace, type TraceEntry } from './trace.js';

export type Tab = 'tools' | 'resources' | 'prompts';

export interface AppState {
  caps: McpCapabilities;
  tab: Tab;
  cursor: number;
  lastResult: InvokeResult | null;
  history: TraceEntry[];
  showHistory: boolean;
}

export type AppAction =
  | { type: 'cursor-up' }
  | { type: 'cursor-down' }
  | { type: 'next-tab' }
  | { type: 'toggle-history' }
  | { type: 'invoke-result'; toolName: string; result: InvokeResult };

const TAB_ORDER: Tab[] = ['tools', 'resources', 'prompts'];

export function initialState(caps: McpCapabilities): AppState {
  return { caps, tab: 'tools', cursor: 0, lastResult: null, history: [], showHistory: false };
}

function listLength(state: AppState): number {
  switch (state.tab) {
    case 'tools':
      return state.caps.tools.length;
    case 'resources':
      return state.caps.resources.length;
    case 'prompts':
      return state.caps.prompts.length;
  }
}

export function reduce(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'cursor-down': {
      const max = Math.max(0, listLength(state) - 1);
      return { ...state, cursor: Math.min(state.cursor + 1, max) };
    }
    case 'cursor-up':
      return { ...state, cursor: Math.max(0, state.cursor - 1) };
    case 'next-tab': {
      const idx = TAB_ORDER.indexOf(state.tab);
      const next = TAB_ORDER[(idx + 1) % TAB_ORDER.length];
      return { ...state, tab: next, cursor: 0 };
    }
    case 'toggle-history':
      return { ...state, showHistory: !state.showHistory };
    case 'invoke-result': {
      const history = [...state.history];
      addToTrace(history, action.result, action.toolName);
      return { ...state, lastResult: action.result, history };
    }
  }
}
