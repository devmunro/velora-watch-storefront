insert into public.site_settings (
  id,
  announcement,
  free_shipping_threshold,
  default_seo_title,
  default_seo_description
)
values (
  '10000000-0000-4000-8000-000000000001',
  'Complimentary UK delivery on orders over £100',
  10000,
  'Velora | Timeless watches, modern precision',
  'Discover considered watches shaped by classic proportion, modern precision and enduring materials.'
)
on conflict (singleton_key) do update set
  announcement = excluded.announcement,
  free_shipping_threshold = excluded.free_shipping_threshold,
  default_seo_title = excluded.default_seo_title,
  default_seo_description = excluded.default_seo_description;

insert into public.collections (
  id, slug, name, eyebrow, description, image_path, image_alt, position, status, seo_title, seo_description
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'atelier',
    'Atelier',
    'Refined performance',
    'Architectural chronographs designed for composed, everyday precision.',
    '/images/meridian.webp',
    'Black chronograph watch with warm metallic detailing',
    1,
    'published',
    'The Atelier collection | Velora',
    'Explore Velora Atelier chronographs.'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'heritage',
    'Heritage',
    'Quietly enduring',
    'Balanced automatic watches inspired by the elegance of mid-century design.',
    '/images/aster.webp',
    'Silver automatic watch with a steel bracelet',
    2,
    'published',
    'The Heritage collection | Velora',
    'Explore Velora Heritage automatic watches.'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'voyager',
    'Voyager',
    'Made to move',
    'Purposeful GMT watches with confident contrast and travel-ready capability.',
    '/images/nocturne.webp',
    'Black and gold GMT watch on a dark stone surface',
    3,
    'published',
    'The Voyager collection | Velora',
    'Explore Velora Voyager GMT watches.'
  )
on conflict (slug) do update set
  name = excluded.name,
  eyebrow = excluded.eyebrow,
  description = excluded.description,
  image_path = excluded.image_path,
  image_alt = excluded.image_alt,
  position = excluded.position,
  status = excluded.status,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

insert into public.products (
  id,
  collection_id,
  slug,
  name,
  short_description,
  description,
  specifications,
  primary_image_path,
  primary_image_alt,
  status,
  featured,
  position,
  seo_title,
  seo_description
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'meridian-chronograph',
    'Meridian Chronograph',
    'A sharply balanced chronograph with a deep black dial and warm metallic accents.',
    'The Meridian brings clarity to every measure. Its considered sub-dials, polished markers and restrained case profile create a chronograph that feels precise without feeling technical.',
    '{"Case":"40 mm stainless steel","Crystal":"Sapphire","Movement":"Swiss quartz chronograph","Water resistance":"5 ATM","Warranty":"2 years"}'::jsonb,
    '/images/meridian.webp',
    'Meridian Chronograph in black leather',
    'published',
    true,
    1,
    'Meridian Chronograph | Velora',
    'Discover the 40 mm Velora Meridian Chronograph.'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'aster-automatic',
    'Aster Automatic',
    'A slim automatic watch defined by a luminous silver dial and fluid bracelet.',
    'The Aster is shaped around proportion and light. A finely textured dial, tapered case and five-link bracelet give the watch an understated presence from morning through evening.',
    '{"Case":"38 mm stainless steel","Crystal":"Sapphire","Movement":"Automatic, 40-hour reserve","Water resistance":"5 ATM","Warranty":"2 years"}'::jsonb,
    '/images/aster.webp',
    'Aster Automatic in silver steel',
    'published',
    true,
    2,
    'Aster Automatic | Velora',
    'Discover the 38 mm Velora Aster Automatic.'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000003',
    'nocturne-gmt',
    'Nocturne GMT',
    'A confident dual-time watch in black steel with precise gold detailing.',
    'The Nocturne pairs travel-ready function with evening restraint. Its high-contrast GMT scale and brushed case remain legible across changing light and changing time zones.',
    '{"Case":"41 mm coated stainless steel","Crystal":"Sapphire","Movement":"Automatic GMT, 42-hour reserve","Water resistance":"10 ATM","Warranty":"2 years"}'::jsonb,
    '/images/nocturne.webp',
    'Nocturne GMT in black and gold',
    'published',
    true,
    3,
    'Nocturne GMT | Velora',
    'Discover the 41 mm Velora Nocturne GMT.'
  )
on conflict (slug) do update set
  collection_id = excluded.collection_id,
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  specifications = excluded.specifications,
  primary_image_path = excluded.primary_image_path,
  primary_image_alt = excluded.primary_image_alt,
  status = excluded.status,
  featured = excluded.featured,
  position = excluded.position,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

insert into public.product_variants (
  id, product_id, sku, name, finish, strap, price_amount, currency, active, position
)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'MER-CHR-BLK', 'Black leather', 'Polished steel', 'Black leather', 49500, 'gbp', true, 1),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'MER-CHR-STL', 'Steel bracelet', 'Polished steel', 'Steel bracelet', 53500, 'gbp', true, 2),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'AST-AUT-SLV', 'Silver steel', 'Silver steel', 'Five-link bracelet', 44500, 'gbp', true, 1),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'AST-AUT-CHM', 'Champagne steel', 'Champagne steel', 'Five-link bracelet', 46500, 'gbp', true, 2),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', 'NOC-GMT-BG', 'Black and gold', 'Black and gold', 'Black steel bracelet', 56500, 'gbp', true, 1),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000003', 'NOC-GMT-BS', 'Black steel', 'Black steel', 'Black steel bracelet', 54500, 'gbp', true, 2)
on conflict (sku) do update set
  product_id = excluded.product_id,
  name = excluded.name,
  finish = excluded.finish,
  strap = excluded.strap,
  price_amount = excluded.price_amount,
  currency = excluded.currency,
  active = excluded.active,
  position = excluded.position;

insert into public.hero_slides (
  id, eyebrow, title, accent, body, primary_label, primary_href, secondary_label, secondary_href, media_path, media_alt, position, status
)
values
  (
    '50000000-0000-4000-8000-000000000001',
    'Timeless design. Modern precision.',
    'Crafted for',
    'every moment.',
    'Our watches blend classic craftsmanship with contemporary design. Made to elevate your style, every day.',
    'Shop collection',
    '/watches',
    'Explore now',
    '/about',
    '/images/hero-meridian.webp',
    'Meridian Chronograph resting on dark stone',
    1,
    'published'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    'A study in proportion.',
    'Quietly made.',
    'Distinctly yours.',
    'Slim profiles, balanced dials and materials chosen to grow more personal with time.',
    'Discover Aster',
    '/watches/aster-automatic',
    'Our approach',
    '/about',
    '/images/aster.webp',
    'Aster Automatic on charcoal stone',
    2,
    'published'
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    'Two places. One perspective.',
    'Time, wherever',
    'you find it.',
    'The Nocturne GMT brings composed dual-time clarity to every departure and return.',
    'Discover Nocturne',
    '/watches/nocturne-gmt',
    'View collection',
    '/collections/voyager',
    '/images/nocturne.webp',
    'Nocturne GMT in a low-lit black and gold composition',
    3,
    'published'
  )
on conflict (id) do update set
  eyebrow = excluded.eyebrow,
  title = excluded.title,
  accent = excluded.accent,
  body = excluded.body,
  primary_label = excluded.primary_label,
  primary_href = excluded.primary_href,
  secondary_label = excluded.secondary_label,
  secondary_href = excluded.secondary_href,
  media_path = excluded.media_path,
  media_alt = excluded.media_alt,
  position = excluded.position,
  status = excluded.status;

insert into public.benefits (id, icon, title, body, position, status)
values
  ('60000000-0000-4000-8000-000000000001', 'shield', '2-year warranty', 'Considered coverage for every timepiece.', 1, 'published'),
  ('60000000-0000-4000-8000-000000000002', 'delivery', 'Complimentary delivery', 'On all UK orders over £100.', 2, 'published'),
  ('60000000-0000-4000-8000-000000000003', 'returns', 'Easy returns', 'Thirty days to make sure it feels right.', 3, 'published'),
  ('60000000-0000-4000-8000-000000000004', 'quality', 'Premium materials', 'Chosen for precision, comfort and longevity.', 4, 'published')
on conflict (id) do update set
  icon = excluded.icon,
  title = excluded.title,
  body = excluded.body,
  position = excluded.position,
  status = excluded.status;

insert into public.navigation_items (id, label, href, position, status)
values
  ('61000000-0000-4000-8000-000000000001', 'Watches', '/watches', 1, 'published'),
  ('61000000-0000-4000-8000-000000000002', 'Collections', '/collections', 2, 'published'),
  ('61000000-0000-4000-8000-000000000003', 'Accessories', '/accessories', 3, 'published'),
  ('61000000-0000-4000-8000-000000000004', 'About us', '/about', 4, 'published'),
  ('61000000-0000-4000-8000-000000000005', 'Journal', '/journal', 5, 'published')
on conflict (href) do update set
  label = excluded.label,
  position = excluded.position,
  status = excluded.status;

insert into public.journal_posts (
  id, slug, title, excerpt, body, image_path, image_alt, status, published_at, seo_title, seo_description
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    'anatomy-of-a-timeless-dial',
    'The anatomy of a timeless dial',
    'Why restraint, rhythm and legibility matter more than decoration.',
    $$A lasting dial begins with hierarchy. Hands, markers and negative space should make the time immediately clear, while proportion rewards a closer look. At Velora, decoration follows function: texture catches changing light, polished accents guide the eye, and every line earns its place.$$,
    '/images/meridian.webp',
    'Close view of the Meridian Chronograph dial',
    'published',
    now() - interval '14 days',
    'The anatomy of a timeless dial | Velora Journal',
    'Explore the principles behind a balanced, legible watch dial.'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    'choosing-an-everyday-watch',
    'Choosing a watch for every day',
    'A practical guide to proportion, movement and the details that live well.',
    $$The best everyday watch disappears into your routine, then reveals new character when you pause. Begin with proportion, choose the movement that suits your rhythm, and consider how the bracelet or strap will meet the changing shape of your day.$$,
    '/images/aster.webp',
    'Aster Automatic with its steel bracelet',
    'published',
    now() - interval '9 days',
    'Choosing an everyday watch | Velora Journal',
    'How to choose a watch that works across every part of the day.'
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    'quiet-craft-of-finishing',
    'The quiet craft of finishing',
    'Brushed, polished and textured surfaces change how a watch meets the light.',
    $$Finishing is where material becomes character. Brushed planes soften reflection, polished edges define a silhouette, and fine dial textures create depth without noise. The result should feel coherent in daylight, at dinner and everywhere between.$$,
    '/images/nocturne.webp',
    'Nocturne GMT showing brushed and polished surfaces',
    'published',
    now() - interval '4 days',
    'The quiet craft of watch finishing | Velora Journal',
    'Discover how considered finishing shapes the character of a watch.'
  )
on conflict (slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  body = excluded.body,
  image_path = excluded.image_path,
  image_alt = excluded.image_alt,
  status = excluded.status,
  published_at = excluded.published_at,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

insert into public.policy_pages (id, slug, title, body, status)
values
  (
    '80000000-0000-4000-8000-000000000001',
    'shipping-returns',
    'Shipping and returns',
    $$Complimentary standard delivery is available on UK orders over £100. Orders may be returned in original, unworn condition within 30 days of delivery. Return instructions are provided through your Velora account.$$,
    'published'
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    'warranty',
    'Warranty',
    $$Velora timepieces include a two-year limited warranty covering manufacturing faults under normal use. Accidental damage, normal wear and unauthorised repair are not covered.$$,
    'published'
  ),
  (
    '80000000-0000-4000-8000-000000000003',
    'privacy',
    'Privacy',
    $$Velora collects only the information required to provide accounts, process test orders and respond to customer requests. Payment details are handled by our payment provider and are not stored by Velora.$$,
    'published'
  ),
  (
    '80000000-0000-4000-8000-000000000004',
    'terms',
    'Terms',
    $$Product availability, prices and delivery estimates may change. An order is confirmed only after payment is verified and stock is allocated. These terms require review before live trading.$$,
    'published'
  )
on conflict (slug) do update set
  title = excluded.title,
  body = excluded.body,
  status = excluded.status;

insert into private.inventory (variant_id, on_hand, reserved, low_stock_threshold)
select id, 12, 0, 3 from public.product_variants
on conflict (variant_id) do nothing;

insert into private.inventory_movements (variant_id, reason, delta_on_hand, note)
select id, 'initial', 12, 'Initial catalogue stock' from public.product_variants
where not exists (
  select 1
  from private.inventory_movements movement
  where movement.variant_id = product_variants.id and movement.reason = 'initial'
);
