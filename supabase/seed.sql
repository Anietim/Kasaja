-- ============================================================
-- KASAJA SEED DATA — Nigeria States & Markets
-- Run AFTER schema.sql
-- ============================================================

-- STATES
insert into ng_states (name, code, region) values
('Abia','AB','South East'),
('Adamawa','AD','North East'),
('Akwa Ibom','AK','South South'),
('Anambra','AN','South East'),
('Bauchi','BA','North East'),
('Bayelsa','BY','South South'),
('Benue','BE','North Central'),
('Borno','BO','North East'),
('Cross River','CR','South South'),
('Delta','DE','South South'),
('Ebonyi','EB','South East'),
('Edo','ED','South South'),
('Ekiti','EK','South West'),
('Enugu','EN','South East'),
('FCT Abuja','FC','North Central'),
('Gombe','GO','North East'),
('Imo','IM','South East'),
('Jigawa','JI','North West'),
('Kaduna','KD','North West'),
('Kano','KN','North West'),
('Katsina','KT','North West'),
('Kebbi','KB','North West'),
('Kogi','KO','North Central'),
('Kwara','KW','North Central'),
('Lagos','LA','South West'),
('Nasarawa','NA','North Central'),
('Niger','NI','North Central'),
('Ogun','OG','South West'),
('Ondo','ON','South West'),
('Osun','OS','South West'),
('Oyo','OY','South West'),
('Plateau','PL','North Central'),
('Rivers','RI','South South'),
('Sokoto','SO','North West'),
('Taraba','TA','North East'),
('Yobe','YO','North East'),
('Zamfara','ZA','North West');

-- LAGOS MARKETS
insert into ng_markets (state_id, name, slug, description, speciality, address) values
((select id from ng_states where code='LA'), 'Balogun Market', 'balogun-lagos', 'One of the largest markets in West Africa', ARRAY['textiles','clothing','fabrics'], 'Lagos Island, Lagos'),
((select id from ng_states where code='LA'), 'Computer Village', 'computer-village-lagos', 'Nigeria''s largest electronics hub', ARRAY['electronics','phones','computers','accessories'], 'Ikeja, Lagos'),
((select id from ng_states where code='LA'), 'Alaba International', 'alaba-international', 'Electronics and gadgets wholesale hub', ARRAY['electronics','appliances','generators'], 'Ojo, Lagos'),
((select id from ng_states where code='LA'), 'Mandilas Market', 'mandilas-lagos', 'Multi-purpose trading complex', ARRAY['electronics','household items'], 'Lagos Island, Lagos'),
((select id from ng_states where code='LA'), 'Oshodi Market', 'oshodi-lagos', 'Busy transport hub market', ARRAY['clothing','food','spare parts'], 'Oshodi, Lagos'),
((select id from ng_states where code='LA'), 'Mile 12 Market', 'mile-12-lagos', 'Largest food market in Lagos', ARRAY['food','vegetables','grains','livestock'], 'Ketu, Lagos'),
((select id from ng_states where code='LA'), 'Mushin Market', 'mushin-lagos', 'Affordable goods and food hub', ARRAY['food','clothing','hardware'], 'Mushin, Lagos'),
((select id from ng_states where code='LA'), 'Tejuosho Ultra Modern Market', 'tejuosho-lagos', 'Modern multi-level market complex', ARRAY['clothing','fabrics','shoes'], 'Yaba, Lagos'),
((select id from ng_states where code='LA'), 'Idumota Market', 'idumota-lagos', 'One of the busiest markets in Lagos Island', ARRAY['clothing','drugs','cosmetics'], 'Lagos Island, Lagos'),
((select id from ng_states where code='LA'), 'Ikeja Computer Village', 'ikeja-market', 'Electronics and phone accessories', ARRAY['phones','laptops','accessories'], 'Ikeja, Lagos');

-- ABUJA MARKETS
insert into ng_markets (state_id, name, slug, description, speciality, address) values
((select id from ng_states where code='FC'), 'Wuse Market', 'wuse-abuja', 'Largest market in Abuja', ARRAY['clothing','food','electronics','household'], 'Wuse Zone 5, Abuja'),
((select id from ng_states where code='FC'), 'Garki Market', 'garki-abuja', 'Central Abuja market', ARRAY['food','household','clothing'], 'Garki, Abuja'),
((select id from ng_states where code='FC'), 'Utako Market', 'utako-abuja', 'Popular residential area market', ARRAY['food','clothing','cosmetics'], 'Utako, Abuja'),
((select id from ng_states where code='FC'), 'Nyanya Market', 'nyanya-abuja', 'Large satellite town market', ARRAY['food','clothing','building materials'], 'Nyanya, Abuja'),
((select id from ng_states where code='FC'), 'Dei-Dei Market', 'dei-dei-abuja', 'Building materials and livestock', ARRAY['building materials','livestock','hardware'], 'Dei-Dei, Abuja');

-- KANO MARKETS
insert into ng_markets (state_id, name, slug, description, speciality, address) values
((select id from ng_states where code='KN'), 'Sabon Gari Market', 'sabon-gari-kano', 'Major commercial market in Kano', ARRAY['clothing','textiles','food','cosmetics'], 'Sabon Gari, Kano'),
((select id from ng_states where code='KN'), 'Kurmi Market', 'kurmi-kano', 'Historic market in Kano old city', ARRAY['leather goods','crafts','textiles'], 'Kano Old City, Kano'),
((select id from ng_states where code='KN'), 'Kantin Kwari Market', 'kantin-kwari-kano', 'Largest textile market in West Africa', ARRAY['textiles','fabrics','clothing'], 'Kano, Kano'),
((select id from ng_states where code='KN'), 'Tuesday Market Kano', 'tuesday-market-kano', 'Large open-air weekly market', ARRAY['food','clothing','livestock'], 'Fagge, Kano');

-- PORT HARCOURT MARKETS
insert into ng_markets (state_id, name, slug, description, speciality, address) values
((select id from ng_states where code='RI'), 'Mile 1 Market', 'mile-1-ph', 'Largest market in Port Harcourt', ARRAY['food','clothing','electronics','household'], 'Mile 1, Port Harcourt'),
((select id from ng_states where code='RI'), 'Mile 3 Market', 'mile-3-ph', 'Major food and household market', ARRAY['food','household','clothing'], 'Mile 3, Port Harcourt'),
((select id from ng_states where code='RI'), 'Oil Mill Market', 'oil-mill-ph', 'Electronics and phone accessories hub', ARRAY['electronics','phones','accessories'], 'Oil Mill, Port Harcourt');

-- ONITSHA MARKETS
insert into ng_markets (state_id, name, slug, description, speciality, address) values
((select id from ng_states where code='AN'), 'Onitsha Main Market', 'onitsha-main', 'Largest market in Africa by land area', ARRAY['wholesale','textiles','electronics','food'], 'Onitsha, Anambra'),
((select id from ng_states where code='AN'), 'Bridgehead Market', 'bridgehead-onitsha', 'Second Niger Bridge market', ARRAY['building materials','household','food'], 'Bridgehead, Onitsha');

-- IBADAN MARKETS
insert into ng_markets (state_id, name, slug, description, speciality, address) values
((select id from ng_states where code='OY'), 'Dugbe Market', 'dugbe-ibadan', 'Central Ibadan market', ARRAY['clothing','food','cosmetics'], 'Dugbe, Ibadan'),
((select id from ng_states where code='OY'), 'Bodija Market', 'bodija-ibadan', 'Major food and household market', ARRAY['food','household','fresh produce'], 'Bodija, Ibadan'),
((select id from ng_states where code='OY'), 'Aleshinloye Market', 'aleshinloye-ibadan', 'Electronics and phone accessories', ARRAY['electronics','phones','clothing'], 'Aleshinloye, Ibadan');

-- KADUNA MARKETS
insert into ng_markets (state_id, name, slug, description, speciality, address) values
((select id from ng_states where code='KD'), 'Kaduna Central Market', 'central-kaduna', 'Main market in Kaduna metropolis', ARRAY['clothing','textiles','food','household'], 'City Centre, Kaduna'),
((select id from ng_states where code='KD'), 'Monday Market Kaduna', 'monday-market-kaduna', 'Large weekly market', ARRAY['livestock','food','farm produce'], 'Kaduna North, Kaduna');

-- MARKET GROUPS (one per major market)
insert into market_groups (market_id, name, description, daily_fee_kobo, weekly_fee_kobo, monthly_fee_kobo) values
((select id from ng_markets where slug='balogun-lagos'), 'Balogun Traders Hub', 'Buy and sell textiles, clothing and fabrics in the heart of Lagos Island', 10000, 50000, 150000),
((select id from ng_markets where slug='computer-village-lagos'), 'Computer Village Deals', 'Latest phones, laptops, and gadgets from trusted dealers', 10000, 50000, 150000),
((select id from ng_markets where slug='alaba-international'), 'Alaba Electronics Market', 'Wholesale electronics, generators and appliances', 10000, 50000, 150000),
((select id from ng_markets where slug='onitsha-main'), 'Onitsha Market Board', 'West Africa''s largest market — wholesale deals, bulk buying', 10000, 50000, 150000),
((select id from ng_markets where slug='wuse-abuja'), 'Wuse Market Abuja', 'Abuja''s premier shopping destination for all categories', 10000, 50000, 150000),
((select id from ng_markets where slug='mile-1-ph'), 'Port Harcourt Traders', 'Fresh goods, electronics and fashion from Rivers State', 10000, 50000, 150000),
((select id from ng_markets where slug='kantin-kwari-kano'), 'Kantin Kwari Textiles', 'The largest textile and fabric hub in West Africa', 10000, 50000, 150000),
((select id from ng_markets where slug='dugbe-ibadan'), 'Dugbe Market Ibadan', 'Ibadan''s central trading ground for all goods', 10000, 50000, 150000);
