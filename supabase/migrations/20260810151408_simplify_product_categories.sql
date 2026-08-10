update public.navigation_items
set label = 'Categories', version = version + 1
where href = '/collections' and label <> 'Categories';

update public.homepage_sections
set eyebrow = 'Categories', primary_label = 'View all categories', version = version + 1
where section_key = 'collections';
