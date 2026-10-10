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

insert into public.flavor_dimensions (code, label_de, description)
values
  ('smoky', 'Rauchig', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.'),
  ('peaty', 'Torfig', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.'),
  ('sweet', 'Süß', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.'),
  ('fruity', 'Fruchtig', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.'),
  ('spicy', 'Würzig', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.'),
  ('woody', 'Holzig', 'Sensorische Dimension; nur mit geprüfter Erhebungsmethode nutzbar.')
on conflict (code) do nothing;
