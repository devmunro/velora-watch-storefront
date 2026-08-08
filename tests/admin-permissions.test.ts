import { describe, expect, it } from 'vitest';

import { canAccessAdminSection, type StaffRole } from '../src/lib/server/admin-permissions';

const matrix: Record<StaffRole, Record<string, boolean>> = {
  editor: {
    audit: false,
    collections: true,
    content: true,
    inventory: false,
    journal: true,
    media: true,
    orders: false,
    policies: true,
    products: true,
    staff: false,
  },
  fulfilment: {
    audit: false,
    collections: false,
    content: false,
    inventory: true,
    journal: false,
    media: false,
    orders: true,
    policies: false,
    products: false,
    staff: false,
  },
  owner: {
    audit: true,
    collections: true,
    content: true,
    inventory: true,
    journal: true,
    media: true,
    orders: true,
    policies: true,
    products: true,
    staff: true,
  },
};

describe('administrator section permissions', () => {
  for (const [role, sections] of Object.entries(matrix) as Array<[StaffRole, Record<string, boolean>]>) {
    it(`enforces the ${role} boundary`, () => {
      for (const [section, expected] of Object.entries(sections)) {
        expect(canAccessAdminSection(role, section), `${role} -> ${section}`).toBe(expected);
      }
    });
  }
});
