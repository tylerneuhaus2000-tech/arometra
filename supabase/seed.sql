-- Taxonomy only. No brand, product, QR, taste, review, price, or sales fixtures.
insert into public.categories (slug, name_de, name_en, sort_order)
values
  ('whisky', 'Whisky', 'Whisky', 10),
  ('rum', 'Rum', 'Rum', 20),
  ('gin', 'Gin', 'Gin', 30),
  ('wodka', 'Wodka', 'Vodka', 40),
  ('tequila', 'Tequila', 'Tequila', 50),
  ('mezcal', 'Mezcal', 'Mezcal', 60),
  ('cognac-brandy', 'Cognac und Brandy', 'Cognac and Brandy', 70),
  ('likoere', 'Liköre', 'Liqueurs', 80),
  ('grappa', 'Grappa', 'Grappa', 90),
  ('pisco', 'Pisco', 'Pisco', 100),
  ('baijiu', 'Baijiu', 'Baijiu', 110),
  ('soju-shochu', 'Soju und Shochu', 'Soju and Shochu', 120),
  ('aquavit', 'Aquavit', 'Aquavit', 130),
  ('obstbraende', 'Obstbrände', 'Fruit brandies', 140)
on conflict (slug) do nothing;

-- Public navigation taxonomy only; every subcategory remains a category filter, not a product seed.
with taxonomy(parent_slug, slug, name_de, name_en, sort_order) as (
  values
    ('whisky', 'whisky-scotch', 'Scotch Whisky', 'Scotch whisky', 11),
    ('whisky', 'whisky-irish', 'Irish Whiskey', 'Irish whiskey', 12),
    ('whisky', 'whisky-american', 'American Whiskey', 'American whiskey', 13),
    ('whisky', 'whisky-japanese', 'Japanischer Whisky', 'Japanese whisky', 14),
    ('whisky', 'whisky-other', 'Weitere Whisk(e)ys', 'Other whiskies', 15),
    ('rum', 'rum-white', 'Weißer Rum', 'White rum', 21),
    ('rum', 'rum-aged', 'Gereifter Rum', 'Aged rum', 22),
    ('rum', 'rum-agricole', 'Rhum Agricole', 'Rhum agricole', 23),
    ('rum', 'rum-spiced', 'Spiced Rum', 'Spiced rum', 24),
    ('gin', 'gin-london-dry', 'London Dry Gin', 'London dry gin', 31),
    ('gin', 'gin-distilled', 'Distilled Gin', 'Distilled gin', 32),
    ('gin', 'gin-old-tom', 'Old Tom Gin', 'Old Tom gin', 33),
    ('gin', 'gin-flavoured', 'Aromatisierter Gin', 'Flavoured gin', 34),
    ('wodka', 'wodka-classic', 'Klassischer Wodka', 'Classic vodka', 41),
    ('wodka', 'wodka-flavoured', 'Aromatisierter Wodka', 'Flavoured vodka', 42),
    ('tequila', 'tequila-blanco', 'Blanco', 'Blanco', 51),
    ('tequila', 'tequila-reposado', 'Reposado', 'Reposado', 52),
    ('tequila', 'tequila-anejo', 'Añejo', 'Añejo', 53),
    ('tequila', 'tequila-extra-anejo', 'Extra Añejo', 'Extra Añejo', 54),
    ('mezcal', 'mezcal-artesanal', 'Mezcal Artesanal', 'Mezcal Artesanal', 61),
    ('mezcal', 'mezcal-ancestral', 'Mezcal Ancestral', 'Mezcal Ancestral', 62),
    ('cognac-brandy', 'cognac', 'Cognac', 'Cognac', 71),
    ('cognac-brandy', 'armagnac', 'Armagnac', 'Armagnac', 72),
    ('cognac-brandy', 'brandy-other', 'Weitere Weinbrände', 'Other grape brandies', 73),
    ('likoere', 'likoere-herbal', 'Kräuterliköre', 'Herbal liqueurs', 81),
    ('likoere', 'likoere-fruit', 'Fruchtliköre', 'Fruit liqueurs', 82),
    ('likoere', 'likoere-cream', 'Sahneliköre', 'Cream liqueurs', 83),
    ('likoere', 'likoere-coffee', 'Kaffeeliköre', 'Coffee liqueurs', 84),
    ('soju-shochu', 'soju', 'Soju', 'Soju', 121),
    ('soju-shochu', 'shochu', 'Shochu', 'Shochu', 122),
    ('obstbraende', 'obstbrand-pear', 'Birnenbrände', 'Pear brandies', 141),
    ('obstbraende', 'obstbrand-cherry', 'Kirschbrände', 'Cherry brandies', 142),
    ('obstbraende', 'obstbrand-apple', 'Apfelbrände', 'Apple brandies', 143)
)
insert into public.categories (parent_id, slug, name_de, name_en, sort_order)
select parent.id, taxonomy.slug, taxonomy.name_de, taxonomy.name_en, taxonomy.sort_order
from taxonomy
join public.categories parent on parent.slug = taxonomy.parent_slug
on conflict (slug) do nothing;

insert into public.flavor_dimensions (code, label_de, description)
values
  ('smoky', 'Rauchig', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.'),
  ('peaty', 'Torfig', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.'),
  ('sweet', 'Süß', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.'),
  ('fruity', 'Fruchtig', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.'),
  ('spicy', 'Würzig', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.'),
  ('woody', 'Holzig', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.')
on conflict (code) do nothing;
