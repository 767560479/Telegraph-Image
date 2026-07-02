const assert = require('assert');

describe('editName API', function () {
  async function getOnRequest() {
    return (await import('../functions/api/manage/editName/[id].js')).onRequest;
  }

  function mockEnv(metadata = { TimeStamp: 1, fileName: 'old.jpg' }) {
    let stored = { metadata: { ...metadata } };
    return {
      img_url: {
        getWithMetadata: () => Promise.resolve(stored),
        put: (id, _value, { metadata: next }) => {
          stored = { metadata: next };
          return Promise.resolve();
        },
      },
    };
  }

  it('updates fileName from newName query param', async function () {
    const onRequest = await getOnRequest();
    const env = mockEnv();
    const request = new Request(
      'https://example.com/api/manage/editName/d11871bba2ab32f303227.jpg?newName=aatest.jpg'
    );
    const res = await onRequest({ request, env, params: { id: 'd11871bba2ab32f303227.jpg' } });
    const data = JSON.parse(await res.text());

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.fileName, 'aatest.jpg');
  });

  it('rejects empty newName', async function () {
    const onRequest = await getOnRequest();
    const env = mockEnv();
    const request = new Request(
      'https://example.com/api/manage/editName/d11871bba2ab32f303227.jpg?newName='
    );
    const res = await onRequest({ request, env, params: { id: 'd11871bba2ab32f303227.jpg' } });
    const data = JSON.parse(await res.text());

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
  });

  it('rejects newName longer than 64 chars', async function () {
    const onRequest = await getOnRequest();
    const env = mockEnv();
    const longName = 'a'.repeat(65) + '.jpg';
    const request = new Request(
      `https://example.com/api/manage/editName/test.jpg?newName=${encodeURIComponent(longName)}`
    );
    const res = await onRequest({ request, env, params: { id: 'test.jpg' } });
    const data = JSON.parse(await res.text());

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
  });

  it('initializes metadata when missing and updates fileName', async function () {
    const onRequest = await getOnRequest();
    let stored = { value: '', metadata: null };
    const env = {
      img_url: {
        getWithMetadata: () => Promise.resolve(stored),
        put: (_id, _value, { metadata }) => {
          stored = { value: '', metadata };
          return Promise.resolve();
        },
      },
    };
    const request = new Request(
      'https://example.com/api/manage/editName/test.jpg?newName=renamed.jpg'
    );
    const res = await onRequest({ request, env, params: { id: 'test.jpg' } });
    const data = JSON.parse(await res.text());

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.fileName, 'renamed.jpg');
    assert.strictEqual(stored.metadata.fileName, 'renamed.jpg');
  });
});
