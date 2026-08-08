import { describe, expect, it } from 'vitest';

import { isSameOriginRequest, safeReturnPath } from '../src/lib/server/http';

describe('request safety helpers', () => {
  it('accepts only an exact same-origin mutation', () => {
    const sameOrigin = new Request('https://velora.example/api/account/profile', {
      headers: { Origin: 'https://velora.example' },
      method: 'POST',
    });
    const crossOrigin = new Request('https://velora.example/api/account/profile', {
      headers: { Origin: 'https://malicious.example' },
      method: 'POST',
    });

    expect(isSameOriginRequest(sameOrigin)).toBe(true);
    expect(isSameOriginRequest(crossOrigin)).toBe(false);
  });

  it('keeps post-authentication redirects internal and outside API routes', () => {
    expect(safeReturnPath('/cart')).toBe('/cart');
    expect(safeReturnPath('//malicious.example')).toBe('/account');
    expect(safeReturnPath('https://malicious.example')).toBe('/account');
    expect(safeReturnPath('/api/admin/staff')).toBe('/account');
  });
});
