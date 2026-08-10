import {
  benefits as fallbackBenefits,
  collections as fallbackCollections,
  heroSlides as fallbackHeroSlides,
  journalPosts as fallbackJournalPosts,
  policyPages as fallbackPolicies,
  products as fallbackProducts,
  type Collection,
  type JournalPost,
  type PolicyPage,
  type Product,
} from '../../data/catalog';
import { createPublicSupabase } from './supabase';
import { renderMarkdown } from './markdown';

type PublicContent = {
  benefits: Array<{ title: string; copy: string; icon: string }>;
  collections: Collection[];
  heroSlides: Array<{
    id: string;
    eyebrow: string;
    title: string;
    accent: string;
    copy: string;
    image: string;
    imageAlt: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string | null;
    secondaryHref: string | null;
  }>;
  journalPosts: JournalPost[];
  policies: PolicyPage[];
  products: Product[];
  homepageSections: Array<{
    key: string; eyebrow: string; heading: string; accent: string | null; body: string;
    image: string | null; imageAlt: string | null; primaryLabel: string | null; primaryHref: string | null;
    featuredProductId: string | null; featuredJournalPostId: string | null;
  }>;
};

const fallback: PublicContent = {
  benefits: fallbackBenefits.map((benefit) => ({ ...benefit })),
  collections: fallbackCollections,
  heroSlides: fallbackHeroSlides.map((slide) => ({ ...slide })),
  journalPosts: fallbackJournalPosts,
  policies: fallbackPolicies,
  products: fallbackProducts,
  homepageSections: [
    { key:'collections',eyebrow:'Our collections',heading:'Find the perfect watch for your style.',accent:null,body:'Explore Velora timepieces selected for distinct expressions of modern life.',image:null,imageAlt:null,primaryLabel:'View all collections',primaryHref:'/collections',featuredProductId:null,featuredJournalPostId:null },
    { key:'standard',eyebrow:'The Velora standard',heading:'Precision you can feel.',accent:null,body:'Every Velora timepiece begins with proportion and purpose. From sapphire crystal to the final brushed surface, each detail is chosen to serve the watch for years to come.',image:'/images/aster.webp',imageAlt:'Aster Automatic watch in silver steel',primaryLabel:'Discover our approach',primaryHref:'/about',featuredProductId:null,featuredJournalPostId:null },
    { key:'spotlight',eyebrow:'An icon in black',heading:'Meridian',accent:'Chronograph.',body:'Defined by warm metallic details, deep contrast and timing controls made to be used.',image:'/images/meridian.webp',imageAlt:'Meridian Chronograph on a black leather strap',primaryLabel:'View Meridian',primaryHref:'/watches/meridian-chronograph',featuredProductId:fallbackProducts[0]?.id ?? null,featuredJournalPostId:null },
    { key:'journal',eyebrow:'From the journal',heading:'Notes on time.',accent:null,body:'Design, movements and the details that make a watch part of everyday life.',image:null,imageAlt:null,primaryLabel:'Read the story',primaryHref:'/journal',featuredProductId:null,featuredJournalPostId:fallbackJournalPosts[0]?.id ?? null },
  ],
};

function specifications(value: unknown): Product['specifications'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).map(([label, entry]) => ({ label, value: String(entry) }));
}

function paragraphs(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function collectionRecord(value: unknown) {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getPublicContent(): Promise<PublicContent> {
  const supabase = createPublicSupabase();
  if (!supabase) return fallback;

  try {
    const [heroResult, benefitResult, collectionResult, productResult, journalResult, policyResult, sectionResult] =
      await Promise.all([
        supabase
          .from('hero_slides')
          .select('*')
          .eq('status', 'published')
          .order('position'),
        supabase.from('benefits').select('*').eq('status', 'published').order('position'),
        supabase.from('collections').select('*').eq('status', 'published').order('position'),
        supabase
          .from('products')
          .select('*, collection:collections(slug,name), variants:product_variants(*), media:product_media(*)')
          .eq('status', 'published')
          .eq('product_variants.active', true)
          .order('position')
          .order('position', { referencedTable: 'product_variants' }),
        supabase
          .from('journal_posts')
          .select('*,category:journal_categories(name,slug)')
          .eq('status', 'published')
          .order('published_at', { ascending: false }),
        supabase.from('policy_pages').select('*').eq('status', 'published').order('title'),
        supabase.from('homepage_sections').select('*').eq('status', 'published').eq('visible', true).order('position'),
      ]);

    if (
      heroResult.error ||
      benefitResult.error ||
      collectionResult.error ||
      productResult.error ||
      journalResult.error ||
      policyResult.error || sectionResult.error
    ) {
      return fallback;
    }

    const collections: Collection[] = (collectionResult.data ?? []).map((item: any) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      summary: item.description,
      image: item.image_path,
      imageAlt: item.image_alt,
    }));

    const products: Product[] = (productResult.data ?? []).map((item: any) => {
      const collection = collectionRecord(item.collection) as { name?: string; slug?: string } | null;

      return {
        id: item.id,
        slug: item.slug,
        name: item.name,
        eyebrow: collection?.name ?? 'Velora timepiece',
        summary: item.short_description,
        description: item.description,
        collectionSlug: collection?.slug ?? '',
        collectionName: collection?.name ?? 'Velora',
        image: item.primary_image_path,
        imageAlt: item.primary_image_alt,
        featured: item.featured,
        specifications: specifications(item.specifications),
        media: (item.media ?? [])
          .sort((left: any, right: any) => left.position - right.position)
          .map((media: any) => ({
            id: media.id,
            image: supabase.storage.from('catalogue').getPublicUrl(media.storage_path).data.publicUrl,
            imageAlt: media.alt_text,
            position: media.position,
          })),
        variants: (item.variants ?? []).map((variant: any) => ({
          id: variant.id,
          sku: variant.sku,
          name: variant.name,
          finish: variant.finish,
          strap: variant.strap,
          priceAmount: variant.price_amount,
          currency: variant.currency,
          position: variant.position,
        })),
      };
    });

    const journalPosts: JournalPost[] = (journalResult.data ?? []).map((item: any) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      body: paragraphs(item.body),
      bodyHtml: renderMarkdown(item.body),
      publishedAt: item.published_at,
      image: item.image_path,
      imageAlt: item.image_alt,
      authorName: item.author_name,
      category: collectionRecord(item.category) as { name: string; slug: string } | null,
      featured: item.featured,
      readingMinutes: item.reading_minutes,
    }));

    const policies: PolicyPage[] = (policyResult.data ?? []).map((item: any) => ({
      slug: item.slug,
      title: item.title,
      intro: paragraphs(item.body)[0] ?? '',
      sections: [],
      bodyHtml: renderMarkdown(item.body),
    }));

    return {
      heroSlides: (heroResult.data ?? []).map((item: any) => ({
        id: item.id,
        eyebrow: item.eyebrow,
        title: item.title,
        accent: item.accent,
        copy: item.body,
        image: item.media_path,
        imageAlt: item.media_alt,
        primaryLabel: item.primary_label,
        primaryHref: item.primary_href,
        secondaryLabel: item.secondary_label,
        secondaryHref: item.secondary_href,
      })),
      benefits: (benefitResult.data ?? []).map((item: any) => ({
        title: item.title,
        copy: item.body,
        icon: item.icon,
      })),
      collections: collections.length ? collections : fallback.collections,
      products: products.length ? products : fallback.products,
      journalPosts: journalPosts.length ? journalPosts : fallback.journalPosts,
      policies: policies.length ? policies : fallback.policies,
      homepageSections: (sectionResult.data?.length ? sectionResult.data : fallback.homepageSections).map((item: any) => item.key ? item : ({
        key: item.section_key, eyebrow: item.eyebrow, heading: item.heading, accent: item.accent, body: item.body,
        image: item.media_path, imageAlt: item.media_alt, primaryLabel: item.primary_label, primaryHref: item.primary_href,
        featuredProductId: item.featured_product_id, featuredJournalPostId: item.featured_journal_post_id,
      })),
    };
  } catch {
    // Public pages remain available from the bundled published snapshot during a data outage.
    return fallback;
  }
}

export async function getPublishedProducts() {
  return (await getPublicContent()).products;
}

export async function getPublishedProduct(slug: string) {
  return (await getPublishedProducts()).find((product) => product.slug === slug);
}

export async function getPublishedCollections() {
  return (await getPublicContent()).collections;
}

export async function getPublishedCollection(slug: string) {
  const content = await getPublicContent();
  const collection = content.collections.find((entry) => entry.slug === slug);
  if (!collection) return null;
  return { collection, products: content.products.filter((product) => product.collectionSlug === slug) };
}

export async function getPublishedJournal() {
  return (await getPublicContent()).journalPosts;
}

export async function getPublishedJournalPost(slug: string) {
  return (await getPublishedJournal()).find((post) => post.slug === slug);
}

export async function getPublishedPolicy(slug: string) {
  const published = (await getPublicContent()).policies.find((policy) => policy.slug === slug);
  return published ?? fallbackPolicies.find((policy) => policy.slug === slug);
}

const fallbackNavigation = [
  { id: 'watches', label: 'Watches', href: '/watches' },
  { id: 'collections', label: 'Categories', href: '/collections' },
  { id: 'accessories', label: 'Accessories', href: '/accessories' },
  { id: 'about', label: 'About us', href: '/about' },
  { id: 'journal', label: 'Journal', href: '/journal' },
];

export async function getPublicNavigation() {
  const supabase = createPublicSupabase();
  if (!supabase) return fallbackNavigation;
  try {
    const { data, error } = await supabase
      .from('navigation_items')
      .select('id,label,href')
      .eq('status', 'published')
      .order('position');
    if (error || !data?.length) return fallbackNavigation;
    return data as typeof fallbackNavigation;
  } catch {
    return fallbackNavigation;
  }
}
