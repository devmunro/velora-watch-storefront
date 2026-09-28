export type ProductVariant = {
  id: string;
  sku: string;
  name: string;
  finish: string;
  strap: string;
  priceAmount: number;
  currency: 'gbp';
  position: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string;
  summary: string;
  description: string;
  collectionSlug: string;
  collectionName: string;
  image: string;
  imageAlt: string;
  featured: boolean;
  specifications: Array<{ label: string; value: string }>;
  media?: Array<{
    id: string;
    image: string;
    imageAlt: string;
    position: number;
  }>;
  variants: ProductVariant[];
};

export type Collection = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  image: string;
  imageAlt: string;
};

export type JournalPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  publishedAt: string;
  image: string;
  imageAlt: string;
  authorName?: string;
  category?: { name: string; slug: string } | null;
  featured?: boolean;
  readingMinutes?: number;
  bodyHtml?: string;
};

export type PolicyPage = {
  slug: string;
  title: string;
  intro: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  bodyHtml?: string;
};

export const heroSlides = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    eyebrow: 'Timeless design. Modern precision.',
    title: 'Crafted for',
    accent: 'every moment.',
    copy: 'Our watches blend classic craftsmanship with contemporary design. Made to elevate your style, every day.',
    image: '/images/hero-meridian.webp',
    imageAlt: 'Black Velora chronograph with champagne-gold details on dark stone',
    primaryLabel: 'Shop collection',
    primaryHref: '/watches',
    secondaryLabel: 'Explore now',
    secondaryHref: '/collections',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    eyebrow: 'The art of restraint.',
    title: 'A new standard',
    accent: 'in refinement.',
    copy: 'Aster brings quiet confidence to the wrist with a clean silver dial, balanced proportions and an automatic heart.',
    image: '/images/aster.webp',
    imageAlt: 'Silver Velora automatic watch on charcoal stone',
    primaryLabel: 'Discover Aster',
    primaryHref: '/watches/aster-automatic',
    secondaryLabel: 'Our story',
    secondaryHref: '/about',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    eyebrow: 'Built for the hours between.',
    title: 'Follow time',
    accent: 'beyond borders.',
    copy: 'Nocturne pairs a precise GMT movement with deep black finishes and measured champagne-gold accents.',
    image: '/images/nocturne.webp',
    imageAlt: 'Black and gold Velora GMT watch on dark stone',
    primaryLabel: 'Discover Nocturne',
    primaryHref: '/watches/nocturne-gmt',
    secondaryLabel: 'Read the journal',
    secondaryHref: '/journal',
  },
] as const;

export const benefits = [
  {
    title: '2 year warranty',
    copy: 'Quality you can trust.',
    icon: 'shield',
  },
  {
    title: 'Free shipping',
    copy: 'On all orders over £100.',
    icon: 'truck',
  },
  {
    title: 'Easy returns',
    copy: '30-day hassle-free returns.',
    icon: 'refresh',
  },
  {
    title: 'Premium quality',
    copy: 'Crafted with the finest materials.',
    icon: 'award',
  },
] as const;

export const collections: Collection[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    slug: 'atelier',
    name: 'Atelier',
    summary: 'Purposeful timing instruments with a composed, architectural presence.',
    image: '/images/meridian.webp',
    imageAlt: 'Black Meridian chronograph with a leather strap',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    slug: 'heritage',
    name: 'Heritage',
    summary: 'Self-winding movements expressed through clean lines and enduring materials.',
    image: '/images/aster.webp',
    imageAlt: 'Silver Aster automatic watch with a steel bracelet',
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    slug: 'voyager',
    name: 'Voyager',
    summary: 'Dual-time watches made for considered travel and life across time zones.',
    image: '/images/nocturne.webp',
    imageAlt: 'Black and gold Nocturne GMT watch',
  },
];

export const products: Product[] = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    slug: 'meridian-chronograph',
    name: 'Meridian Chronograph',
    eyebrow: 'Measured confidence',
    summary: 'A balanced chronograph with precise sub-dials and a quietly assertive profile.',
    description:
      'Meridian turns the precision of a classic chronograph into an everyday companion. Its deep black dial, applied champagne markers and considered 40 mm case move easily between tailored and relaxed settings.',
    collectionSlug: 'atelier',
    collectionName: 'Atelier',
    image: '/images/meridian.webp',
    imageAlt: 'Black Meridian chronograph with champagne markers and leather strap',
    featured: true,
    specifications: [
      { label: 'Case', value: '40 mm stainless steel' },
      { label: 'Movement', value: 'Swiss quartz chronograph' },
      { label: 'Crystal', value: 'Double-domed sapphire' },
      { label: 'Water resistance', value: '10 ATM / 100 metres' },
      { label: 'Warranty', value: 'Two years' },
    ],
    variants: [
      {
        id: '40000000-0000-4000-8000-000000000001',
        sku: 'MER-CHR-BLK',
        name: 'Black leather',
        finish: 'Black',
        strap: 'Italian leather',
        priceAmount: 49_500,
        currency: 'gbp',
        position: 1,
      },
      {
        id: '40000000-0000-4000-8000-000000000002',
        sku: 'MER-CHR-STL',
        name: 'Steel bracelet',
        finish: 'Black',
        strap: 'Stainless steel',
        priceAmount: 53_500,
        currency: 'gbp',
        position: 2,
      },
    ],
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    slug: 'aster-automatic',
    name: 'Aster Automatic',
    eyebrow: 'Quietly self-assured',
    summary: 'A restrained automatic watch shaped by clarity, proportion and light.',
    description:
      'Aster is distilled to the essentials: a finely brushed case, slender indices and an automatic movement visible through the exhibition back. The result is refined without feeling formal.',
    collectionSlug: 'heritage',
    collectionName: 'Heritage',
    image: '/images/aster.webp',
    imageAlt: 'Silver Aster automatic watch with a brushed steel bracelet',
    featured: true,
    specifications: [
      { label: 'Case', value: '39 mm stainless steel' },
      { label: 'Movement', value: 'Automatic, 41-hour reserve' },
      { label: 'Crystal', value: 'Flat sapphire' },
      { label: 'Water resistance', value: '5 ATM / 50 metres' },
      { label: 'Warranty', value: 'Two years' },
    ],
    variants: [
      {
        id: '40000000-0000-4000-8000-000000000003',
        sku: 'AST-AUT-SLV',
        name: 'Silver steel',
        finish: 'Silver',
        strap: 'Stainless steel',
        priceAmount: 44_500,
        currency: 'gbp',
        position: 1,
      },
      {
        id: '40000000-0000-4000-8000-000000000004',
        sku: 'AST-AUT-CHM',
        name: 'Champagne steel',
        finish: 'Champagne',
        strap: 'Stainless steel',
        priceAmount: 46_500,
        currency: 'gbp',
        position: 2,
      },
    ],
  },
  {
    id: '30000000-0000-4000-8000-000000000003',
    slug: 'nocturne-gmt',
    name: 'Nocturne GMT',
    eyebrow: 'Time, without borders',
    summary: 'A dual-time instrument with a dark, precise character and travel-ready function.',
    description:
      'Nocturne keeps two time zones in view without sacrificing composure. A bold GMT hand, ceramic bezel and deeply layered black dial make it equally suited to departures and late arrivals.',
    collectionSlug: 'voyager',
    collectionName: 'Voyager',
    image: '/images/nocturne.webp',
    imageAlt: 'Black Nocturne GMT watch with champagne-gold details',
    featured: true,
    specifications: [
      { label: 'Case', value: '41 mm stainless steel' },
      { label: 'Movement', value: 'Automatic GMT, 42-hour reserve' },
      { label: 'Bezel', value: 'Bidirectional ceramic' },
      { label: 'Water resistance', value: '10 ATM / 100 metres' },
      { label: 'Warranty', value: 'Two years' },
    ],
    variants: [
      {
        id: '40000000-0000-4000-8000-000000000005',
        sku: 'NOC-GMT-BG',
        name: 'Black / gold',
        finish: 'Black and champagne gold',
        strap: 'Stainless steel',
        priceAmount: 56_500,
        currency: 'gbp',
        position: 1,
      },
      {
        id: '40000000-0000-4000-8000-000000000006',
        sku: 'NOC-GMT-BS',
        name: 'Black steel',
        finish: 'Black',
        strap: 'Stainless steel',
        priceAmount: 54_500,
        currency: 'gbp',
        position: 2,
      },
    ],
  },
];

export const journalPosts: JournalPost[] = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    slug: 'the-measure-of-a-watch',
    title: 'The measure of a watch',
    excerpt: 'Why proportion—not diameter alone—determines how a watch sits and feels.',
    body: [
      'A watch is experienced in three dimensions. Diameter is only the beginning: lug shape, dial opening, thickness and bracelet taper all influence the way it meets the wrist.',
      'At Velora, proportion begins with balance. We refine each relationship repeatedly, looking for a silhouette that feels assured at a glance and comfortable across a full day.',
      'That discipline is most visible in what remains. Clear markers, purposeful controls and enough negative space to let time be read without interruption.',
    ],
    publishedAt: '2026-07-18T09:00:00.000Z',
    image: '/images/meridian.webp',
    imageAlt: 'Close view of the Meridian Chronograph dial',
  },
  {
    id: '50000000-0000-4000-8000-000000000002',
    slug: 'living-with-an-automatic',
    title: 'Living with an automatic',
    excerpt: 'A considered guide to winding, wearing and caring for a mechanical movement.',
    body: [
      'An automatic watch turns motion into stored energy. Worn regularly, the rotor moves with the wrist and winds the mainspring in small, almost imperceptible increments.',
      'If your watch has rested, twenty to thirty turns of the crown will give it a confident start. Set the time, wear it normally and the movement will take care of the rest.',
      'Avoid strong magnetic fields and sharp impacts, and have the movement inspected at sensible intervals. Good care should feel simple, not ceremonial.',
    ],
    publishedAt: '2026-06-29T09:00:00.000Z',
    image: '/images/aster.webp',
    imageAlt: 'Aster Automatic resting on charcoal stone',
  },
  {
    id: '50000000-0000-4000-8000-000000000003',
    slug: 'two-time-zones-one-glance',
    title: 'Two time zones, one glance',
    excerpt: 'How a GMT watch brings distant places into the rhythm of the everyday.',
    body: [
      'The GMT hand completes one rotation every twenty-four hours. Read against the bezel, it keeps a second place present—home while travelling, or a colleague across the world.',
      'Its value is less about complexity than connection. One additional hand can quietly remove the arithmetic from a day shaped by different time zones.',
      'Nocturne makes that function immediately legible, using contrast and scale to separate local time from the hours beyond it.',
    ],
    publishedAt: '2026-06-08T09:00:00.000Z',
    image: '/images/nocturne.webp',
    imageAlt: 'Nocturne GMT showing its contrasting 24-hour hand',
  },
];

export const policyPages: PolicyPage[] = [
  {
    slug: 'shipping',
    title: 'Shipping',
    intro: 'Complimentary tracked delivery is included with every Velora watch order in the United Kingdom.',
    sections: [
      {
        heading: 'Dispatch and delivery',
        paragraphs: [
          'Orders are normally prepared within one working day. Standard UK delivery then takes two to four working days. A tracking link is sent when your order leaves us.',
          'Delivery estimates begin after dispatch and may take longer around public holidays or during exceptional carrier delays.',
        ],
      },
      {
        heading: 'Packaging',
        paragraphs: ['Every watch is inspected before dispatch and arrives in a protective Velora presentation case.'],
      },
    ],
  },
  {
    slug: 'returns',
    title: 'Returns',
    intro: 'You may return an unworn watch in its original condition within 30 days of delivery.',
    sections: [
      {
        heading: 'Starting a return',
        paragraphs: [
          'Contact our client care team with your order number before sending an item back. We will provide the correct return instructions and reference.',
          'Returned pieces must include all original packaging, protective films and accessories. We cannot accept watches that show signs of wear, adjustment or damage.',
        ],
      },
      {
        heading: 'Refunds',
        paragraphs: ['Approved refunds are sent to the original payment method, normally within five working days of inspection.'],
      },
    ],
  },
  {
    slug: 'warranty',
    title: 'Warranty',
    intro: 'Every Velora watch is covered by a two-year limited warranty from its delivery date.',
    sections: [
      {
        heading: 'What is covered',
        paragraphs: ['The warranty covers manufacturing defects in the watch movement, dial, hands and case under normal use.'],
      },
      {
        heading: 'What is not covered',
        paragraphs: [
          'Normal wear, batteries, straps, cosmetic changes, accidental damage and damage caused by misuse or unauthorised repair are not covered.',
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy',
    intro: 'This notice explains how Velora handles the information needed to provide our website and fulfil orders.',
    sections: [
      {
        heading: 'Information we use',
        paragraphs: [
          'We use account, delivery and order information to provide requested services, prevent misuse and meet legal obligations. Payment-card details are handled by Stripe and are not stored by Velora.',
        ],
      },
      {
        heading: 'Your choices',
        paragraphs: [
          'You may update your profile and delivery addresses from your account. You may also request account deletion, subject to records we must retain for legal or fraud-prevention reasons.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms and conditions',
    intro: 'These terms govern purchases made through the Velora website.',
    sections: [
      {
        heading: 'Orders',
        paragraphs: [
          'Submitting payment is an offer to purchase. An order is accepted when payment is confirmed and we send an order confirmation. We may cancel and refund an order if stock is unavailable or a material pricing error is identified.',
        ],
      },
      {
        heading: 'Product information',
        paragraphs: ['We take care to show products accurately, but colour and scale may vary slightly between displays.'],
      },
    ],
  },
];

export function formatMoney(amount: number, currency = 'gbp') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
