import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { deriveUsernameFromAuthUser } from '../src/utils/userUtils.js';
import { matchesSePayTxCode, resolveAllowedCorsOrigin } from '../src/utils/paymentUtils.js';

const ROOT = path.resolve(import.meta.dirname, '..');

test('deriveUsernameFromAuthUser handles null email without crashing', () => {
  assert.equal(
    deriveUsernameFromAuthUser({ displayName: null, email: null, uid: 'abcdef999999' }),
    'user_abcdef'
  );
  assert.equal(
    deriveUsernameFromAuthUser({ displayName: '  ', email: 'bob@example.com', uid: '123456' }),
    'bob'
  );
  assert.equal(
    deriveUsernameFromAuthUser({ displayName: 'Minh Anh', email: null, uid: '123456' }),
    'Minh Anh'
  );
});

test('matchesSePayTxCode matches whole token boundaries only', () => {
  assert.equal(matchesSePayTxCode('MBVCB.1234.WEBX123456.CT', 'WEBX123456'), true);
  assert.equal(matchesSePayTxCode('Thanh toan WEBX1234567', 'WEBX123456'), false);
  assert.equal(matchesSePayTxCode('NAP10 ok', 'NAP1'), false);
  assert.equal(matchesSePayTxCode('nap1', 'NAP1'), true);
  assert.equal(matchesSePayTxCode('', 'WEBX123456'), false);
});

test('resolveAllowedCorsOrigin validates allowlist strictly', () => {
  const allowlist = ['https://web18p.xyz', 'https://www.web18p.xyz', 'http://localhost:5173'];
  assert.equal(resolveAllowedCorsOrigin('https://www.web18p.xyz', allowlist), 'https://www.web18p.xyz');
  assert.equal(resolveAllowedCorsOrigin('http://localhost:5173', allowlist), 'http://localhost:5173');
  assert.equal(resolveAllowedCorsOrigin('https://evil.com', allowlist), null);
});

test('no hardcoded secrets remain in client services, mangaUtils, or workers', () => {
  const filesToCheck = [
    'src/utils/mangaUtils.js',
    'src/services/streamhgService.js',
    'cf_worker.js',
    'cloudflare_worker.js',
  ];
  const bannedTokens = [
    '8762474365:',
    '32607ejmodn55xwhvcvro',
    '6d207e02198a847aa98d0a2a901485a5',
    '25212dbe2483e698d28894d12bd4d166',
  ];

  for (const rel of filesToCheck) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const token of bannedTokens) {
      assert.equal(
        content.includes(token),
        false,
        `${rel} still contains hardcoded secret prefix ${token}`
      );
    }
  }
});

test('firestore.rules locks down users, payments, and error_reports read/update rules', () => {
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  const usersSection = rules.match(/match \/users\/\{userId\}[\s\S]*?\n    \}/)?.[0] || '';
  const paymentsSection = rules.match(/match \/payments\/\{document\}[\s\S]*?\n    \}/)?.[0] || '';
  const errorReportsSection = rules.match(/match \/error_reports\/\{document\}[\s\S]*?\n    \}/)?.[0] || '';

  assert.equal(usersSection.includes('allow read: if true;'), false);
  assert.equal(paymentsSection.includes('allow read: if request.auth != null;'), false);
  assert.equal(errorReportsSection.includes('allow read: if request.auth != null;'), false);

  // Structural rules checks (no Resource.exists(), no ternary ? :, balanced braces/parens)
  const stripped = rules
    .split(/\r?\n/)
    .map(line => line.replace(/\/\/.*$/, ''))
    .join('\n')
    .replace(/'[^']*'/g, "''");
  assert.equal(/\.\s*exists\s*\(/.test(stripped), false, 'Resource does not have .exists() method; use exists(path)');
  assert.equal(/\?/.test(stripped), false, 'Avoid ternary operator in firestore.rules');
  let depthParen = 0;
  let depthBrace = 0;
  for (const ch of stripped) {
    if (ch === '(') depthParen++;
    if (ch === ')') depthParen--;
    if (ch === '{') depthBrace++;
    if (ch === '}') depthBrace--;
    assert.ok(depthParen >= 0 && depthBrace >= 0, 'Unbalanced closing delimiter in firestore.rules');
  }
  assert.equal(depthParen, 0, 'Unclosed parenthesis in firestore.rules');
  assert.equal(depthBrace, 0, 'Unclosed brace in firestore.rules');
});
