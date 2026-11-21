import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TRUSTED_EMBED_DOMAINS,
  isTrustedEmbedUrl,
} from '../src/utils/videoUtils.js';

test('TRUSTED_EMBED_DOMAINS covers all VOE and primary embed variants', () => {
  for (const domain of ['voe.sx', 'voecdn.com', 'voe-sx.com', 'launchreed.com', 'caseyimpactstation.com', 'hgcloud.to', 'vibuxer.com']) {
    assert.equal(TRUSTED_EMBED_DOMAINS.includes(domain), true, `Missing trusted domain: ${domain}`);
  }
});

test('isTrustedEmbedUrl allows valid HTTPS embeds on trusted domains and subdomains', () => {
  assert.equal(isTrustedEmbedUrl('https://hgcloud.to/e/abc123'), true);
  assert.equal(isTrustedEmbedUrl('https://sub.voecdn.com/e/xyz987'), true);
  assert.equal(isTrustedEmbedUrl('https://launchreed.com/e/demo123'), true);
  assert.equal(isTrustedEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'), true);
});

test('isTrustedEmbedUrl blocks javascript URLs, data URLs, and lookalike/untrusted domains', () => {
  assert.equal(isTrustedEmbedUrl('javascript:alert(1)'), false);
  assert.equal(isTrustedEmbedUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isTrustedEmbedUrl('https://evil.example/e/123'), false);
  assert.equal(isTrustedEmbedUrl('https://voe.sx.attacker.com/e/123'), false);
  assert.equal(isTrustedEmbedUrl(''), false);
  assert.equal(isTrustedEmbedUrl(null), false);
});
