const assert = require('assert');

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('upload base64 API', function () {
  async function getHandlers() {
    return await import('../functions/api/upload/base64.js');
  }

  function mockEnv() {
    return {
      TG_Bot_Token: 'test-token',
      TG_Chat_ID: '123',
    };
  }

  function mockTelegramFetch() {
    return async (url, options) => {
      if (url.includes('api.telegram.org')) {
        return new Response(JSON.stringify({
          ok: true,
          result: {
            photo: [{ file_id: 'mockFileId123', file_size: 100 }],
          },
        }), { status: 200 });
      }
      return Response.error();
    };
  }

  it('rejects missing list', async function () {
    const { onRequestPost } = await getHandlers();
    const request = new Request('https://example.com/api/upload/base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await onRequestPost({ request, env: mockEnv() });
    const data = JSON.parse(await res.text());

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
  });

  it('rejects invalid data URI', async function () {
    const { onRequestPost } = await getHandlers();
    const request = new Request('https://example.com/api/upload/base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list: ['not-a-data-uri'] }),
    });
    const res = await onRequestPost({ request, env: mockEnv() });
    const data = JSON.parse(await res.text());

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.match(data.error, /list\[0\]/);
  });

  it('uploads valid PNG data URI and returns full URLs', async function () {
    const { onRequestPost } = await getHandlers();
    const originalFetch = global.fetch;
    global.fetch = mockTelegramFetch();

    try {
      const request = new Request('https://example.com/api/upload/base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list: [TINY_PNG] }),
      });
      const res = await onRequestPost({ request, env: mockEnv() });
      const data = JSON.parse(await res.text());

      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.result.length, 1);
      assert.strictEqual(data.result[0], 'https://example.com/file/mockFileId123.png');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('parseDataUri rejects non-image mime types', async function () {
    const { parseDataUri } = await getHandlers();
    assert.throws(
      () => parseDataUri('data:text/plain;base64,dGVzdA==', 0),
      /must be an image data URI/
    );
  });
});
