import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {publicAsset} from '../src/server/assets';
import type {Env} from '../src/server/types';

test('public PDF and WebP downloads keep attachment filenames with the media CDN configured', async () => {
  const fixtures = [
    {role: 'printable_pdf_a4_bw', mime: 'application/pdf', extension: 'pdf', bytes: new TextEncoder().encode('%PDF-1.7\n%%EOF')},
    {role: 'printable_webp_bw', mime: 'image/webp', extension: 'webp', bytes: new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80])},
  ];

  for (const fixture of fixtures) {
    const sha256 = createHash('sha256').update(fixture.bytes).digest('hex');
    const row = {
      content_id: 'jc-test-001', content_version: 1, role: fixture.role,
      storage_zone: 'published', object_key: `published/social-media/test/${fixture.role}.${fixture.extension}`,
      mime: fixture.mime, bytes: fixture.bytes.byteLength, sha256, verified: 1,
      width: null, height: null, page_count: fixture.extension === 'pdf' ? 1 : null,
      asset_version: 1, slug: 'test-coloring-page',
    };
    const statement = {
      bind() { return statement; },
      async first() { return row; },
    };
    const env = {
      PUBLIC_MEDIA_BASE_URL: 'https://assets.jotcoloring.com',
      CATALOG_DB: {prepare() { return statement; }},
      PUBLISHED: {
        async get() {
          return {key: row.object_key, size: fixture.bytes.byteLength, etag: sha256,
            body: new Response(fixture.bytes.slice()).body!};
        },
        async head() { return null; },
      },
    } as unknown as Env;

    const response = await publicAsset(new Request(`https://jotcoloring.com/api/download/${row.content_id}/${fixture.extension}`),
      env, row.content_id, fixture.role, true);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), fixture.mime);
    assert.equal(response.headers.get('Content-Disposition'), `attachment; filename="${row.slug}.${fixture.extension}"`);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), fixture.bytes);
  }
});
