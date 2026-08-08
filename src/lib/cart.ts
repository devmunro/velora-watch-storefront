export type CartLine = { variantId: string; quantity: number };

const storageKey = 'velora.cart.v1';
const maximumQuantity = 5;
const maximumLines = 20;

function validLine(value: unknown): value is CartLine {
  if (!value || typeof value !== 'object') return false;
  const line = value as Partial<CartLine>;
  return (
    typeof line.variantId === 'string' &&
    line.variantId.length > 0 &&
    line.variantId.length <= 100 &&
    Number.isInteger(line.quantity) &&
    Number(line.quantity) > 0
  );
}

export function normaliseCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];

  const merged = new Map<string, number>();
  for (const line of value) {
    if (!validLine(line)) continue;
    const current = merged.get(line.variantId) ?? 0;
    merged.set(line.variantId, Math.min(current + line.quantity, maximumQuantity));
    if (merged.size >= maximumLines) break;
  }

  return [...merged].map(([variantId, quantity]) => ({ quantity, variantId }));
}

export function readCart(): CartLine[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return normaliseCart(value);
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]) {
  const cleaned = normaliseCart(lines);
  localStorage.setItem(storageKey, JSON.stringify(cleaned));
  window.dispatchEvent(new CustomEvent('velora:cart-updated', { detail: cleaned }));
}

export function addToCart(variantId: string, quantity = 1) {
  const lines = readCart();
  const existing = lines.find((line) => line.variantId === variantId);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, maximumQuantity);
  } else {
    lines.push({ variantId, quantity: Math.min(Math.max(quantity, 1), maximumQuantity) });
  }

  writeCart(lines);
}

export function cartCount(lines = readCart()) {
  return lines.reduce((total, line) => total + line.quantity, 0);
}
