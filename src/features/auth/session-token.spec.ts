import {
  extractBearerToken,
  generateSessionToken,
  hashSessionToken,
} from './session-token.js';

describe('session tokens', () => {
  it('generates unique URL-safe tokens and stable hex hashes', () => {
    const token = generateSessionToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateSessionToken()).not.toBe(token);
    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it.each([
    ['Bearer abc', 'abc'],
    ['bearer abc', 'abc'],
    ['  Bearer   abc  ', 'abc'],
    [undefined, null],
    ['', null],
    ['Bearer', null],
    ['Basic abc', null],
    ['Bearer abc def', null],
  ])('extracts the token from %j', (header, expected) => {
    expect(extractBearerToken(header)).toBe(expected);
  });
});
