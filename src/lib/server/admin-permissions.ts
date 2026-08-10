export type StaffRole = 'owner' | 'editor' | 'fulfilment';

export const adminSectionRoles: Record<string, StaffRole[]> = {
  audit: ['owner'],
  collections: ['owner', 'editor'],
  content: ['owner', 'editor'],
  inventory: ['owner', 'fulfilment'],
  journal: ['owner', 'editor'],
  media: ['owner', 'editor'],
  orders: ['owner', 'fulfilment'],
  policies: ['owner', 'editor'],
  products: ['owner', 'editor'],
  settings: ['owner'],
  staff: ['owner'],
};

export function canAccessAdminSection(role: StaffRole, section: string): boolean {
  const allowed = adminSectionRoles[section];
  return !allowed || allowed.includes(role);
}
