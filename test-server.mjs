#!/usr/bin/env node
/**
 * mcpscope 動作確認用テスト MCP サーバー
 *
 * 使い方:
 *   node test-server.mjs
 *   mcpscope node test-server.mjs
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'mcpscope-test-server', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } },
);

// ── ツール ──────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'time',
      description: '現在の ISO タイムスタンプを返す (引数なし)',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'echo',
      description: '入力テキストをそのまま返す',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '返したいテキスト' },
        },
        required: ['text'],
      },
    },
    {
      name: 'add',
      description: '2 つの数値を加算する',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number', description: '左辺の数' },
          b: { type: 'number', description: '右辺の数' },
        },
        required: ['a', 'b'],
      },
    },
    {
      name: 'slow',
      description: '1 秒待ってから応答する (遅延テスト用)',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'fail',
      description: '常にエラーを返す (エラー表示テスト用)',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;

  switch (name) {
    case 'time':
      return { content: [{ type: 'text', text: new Date().toISOString() }] };

    case 'echo':
      return { content: [{ type: 'text', text: String(args.text ?? '') }] };

    case 'add': {
      const sum = Number(args.a ?? 0) + Number(args.b ?? 0);
      return { content: [{ type: 'text', text: `${args.a} + ${args.b} = ${sum}` }] };
    }

    case 'slow':
      await new Promise((r) => setTimeout(r, 1000));
      return { content: [{ type: 'text', text: '1 秒待ちました' }] };

    case 'fail':
      return {
        isError: true,
        content: [{ type: 'text', text: 'intentional error (エラー表示のテスト用)' }],
      };

    default:
      return {
        isError: true,
        content: [{ type: 'text', text: `unknown tool: ${name}` }],
      };
  }
});

// ── リソース ────────────────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'data://greeting',
      name: 'greeting',
      description: '挨拶テキスト',
      mimeType: 'text/plain',
    },
    {
      uri: 'data://json-sample',
      name: 'json-sample',
      description: 'サンプル JSON データ',
      mimeType: 'application/json',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const { uri } = req.params;
  switch (uri) {
    case 'data://greeting':
      return {
        contents: [{ uri, mimeType: 'text/plain', text: 'Hello from mcpscope-test-server!' }],
      };
    case 'data://json-sample':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ server: 'mcpscope-test', version: '0.1.0', ok: true }, null, 2),
          },
        ],
      };
    default:
      throw new Error(`Resource not found: ${uri}`);
  }
});

// ── プロンプト ───────────────────────────────────────────────────────────────

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: 'summarize',
      description: 'テキストを要約するプロンプト',
      arguments: [{ name: 'text', description: '要約したいテキスト', required: true }],
    },
    {
      name: 'review-code',
      description: 'コードレビュープロンプト',
      arguments: [
        { name: 'language', description: 'プログラミング言語', required: false },
        { name: 'code', description: 'レビューするコード', required: true },
      ],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  switch (name) {
    case 'summarize':
      return {
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: `以下を要約してください:\n\n${args.text ?? '(テキストなし)'}` },
          },
        ],
      };
    case 'review-code':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `以下の ${args.language ?? 'コード'} をレビューしてください:\n\n${args.code ?? '(コードなし)'}`,
            },
          },
        ],
      };
    default:
      throw new Error(`Prompt not found: ${name}`);
  }
});

// ── 起動 ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
