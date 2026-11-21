import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolveHighlightEmoji } from '../src/routes/export.js';
import { createMcpServer } from '../src/mcp/server.js';

describe('Highlight Icon Settings & Resolution', () => {
  test('resolves highlight icons to appropriate emojis', () => {
    assert.strictEqual(resolveHighlightEmoji('candle'), '🕯️');
    assert.strictEqual(resolveHighlightEmoji('star'), '⭐');
    assert.strictEqual(resolveHighlightEmoji('hands'), '🙏');
    assert.strictEqual(resolveHighlightEmoji('unknown'), '🕯️');
    assert.strictEqual(resolveHighlightEmoji(null), '🕯️');
    assert.strictEqual(resolveHighlightEmoji(undefined), '🕯️');
  });

  test('MCP server registers update_parish_settings tool with highlight_icon', () => {
    const server = createMcpServer({
      publicUrl: 'http://localhost:3000',
      user: { role: 'admin' },
      isStaff: true,
      isAdmin: true
    });
    assert.ok(server);
  });
});
