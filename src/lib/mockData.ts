/**
 * KASAJA — rich mock data for dev/preview mode.
 * All pages fall back to this when Supabase returns nothing.
 */

export const MOCK_PRODUCTS = [
  { id: 'p1', title: 'Samsung Galaxy A54 5G', description: 'Brand new sealed in box. 128GB, 8GB RAM. All colours available.', price_ngn: 285000, price_type: 'fixed', images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400'], category: 'Electronics', is_available: true, like_count: 42, user_liked: false, store_id: 's1', store: { id: 's1', name: 'TechHub Lagos', logo_url: '', verified_until: '2025-12-31', ad_active_until: '2025-12-31', trending_score: 9.4, category: 'Electronics', location_text: 'Computer Village, Ikeja', avg_rating: 4.8, rating_count: 203 }, variants: [{ id: 'v1', label: '128GB Black', price_ngn: 285000, stock_qty: 5, is_available: true }, { id: 'v2', label: '128GB White', price_ngn: 285000, stock_qty: 3, is_available: true }] },
  { id: 'p2', title: 'Ankara Fabric — 6 Yards', description: 'Authentic wax print ankara. Beautiful patterns, great for occasions.', price_ngn: 8500, price_type: 'fixed', images: ['https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400'], category: 'Fashion', is_available: true, like_count: 87, user_liked: true, store_id: 's2', store: { id: 's2', name: 'Iya Bola Fabrics', logo_url: '', verified_until: '2025-06-30', ad_active_until: null, trending_score: 8.1, category: 'Fashion', location_text: 'Balogun Market, Lagos Island', avg_rating: 4.6, rating_count: 341 }, variants: [] },
  { id: 'p3', title: 'iPhone 14 Pro Max — 256GB', description: 'UK used, grade A. No scratch, battery health 94%. Comes with original charger.', price_ngn: 780000, price_type: 'negotiable', images: ['https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400'], category: 'Electronics', is_available: true, like_count: 124, user_liked: false, store_id: 's1', store: { id: 's1', name: 'TechHub Lagos', logo_url: '', verified_until: '2025-12-31', ad_active_until: '2025-12-31', trending_score: 9.4, category: 'Electronics', location_text: 'Computer Village, Ikeja', avg_rating: 4.8, rating_count: 203 }, variants: [] },
  { id: 'p4', title: 'Tomatoes — 1 Basket', description: 'Fresh from Jos. Arrives same day. Price per basket. Minimum 2 baskets.', price_ngn: 12000, price_type: 'fixed', images: ['https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400'], category: 'Food & Groceries', is_available: true, like_count: 19, user_liked: false, store_id: 's3', store: { id: 's3', name: 'Mama Fresh Produce', logo_url: '', verified_until: null, ad_active_until: null, trending_score: 6.2, category: 'Food & Groceries', location_text: 'Mile 12 Market, Lagos', avg_rating: 4.3, rating_count: 78 }, variants: [] },
  { id: 'p5', title: 'Office Chair — Ergonomic', description: 'Adjustable lumbar support, mesh back. Perfect for long work hours.', price_ngn: 65000, price_type: 'fixed', images: ['https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400'], category: 'Home & Office', is_available: true, like_count: 33, user_liked: false, store_id: 's4', store: { id: 's4', name: 'Comfort Furniture', logo_url: '', verified_until: '2025-09-30', ad_active_until: null, trending_score: 7.5, category: 'Home & Office', location_text: 'Trade Fair Complex, Lagos', avg_rating: 4.5, rating_count: 112 }, variants: [] },
  { id: 'p6', title: 'Aso-Oke Set (3 Piece)', description: 'Hand-woven aso-oke in royal blue and gold. For owambe and traditional ceremonies.', price_ngn: 45000, price_type: 'negotiable', images: ['https://images.unsplash.com/photo-1590548784585-643d2b9f2925?w=400'], category: 'Fashion', is_available: true, like_count: 61, user_liked: false, store_id: 's5', store: { id: 's5', name: 'Alhaja Weavers', logo_url: '', verified_until: '2025-08-31', ad_active_until: null, trending_score: 8.8, category: 'Fashion', location_text: 'Wuse Market, Abuja', avg_rating: 4.9, rating_count: 189 }, variants: [] },
  { id: 'p7', title: 'Hair Blower Dryer — 2000W', description: 'Professional salon grade. 3 heat settings, ionic technology. Reduces frizz.', price_ngn: 18500, price_type: 'fixed', images: ['https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400'], category: 'Beauty & Personal Care', is_available: true, like_count: 28, user_liked: false, store_id: 's6', store: { id: 's6', name: 'GlamUp Beauty', logo_url: '', verified_until: null, ad_active_until: null, trending_score: 5.4, category: 'Beauty & Personal Care', location_text: 'Alaba Market, Lagos', avg_rating: 4.1, rating_count: 55 }, variants: [] },
  { id: 'p8', title: 'Nike Air Max 270 — Size 42', description: 'Original, purchased from Nike store. Worn twice. Box included.', price_ngn: 52000, price_type: 'negotiable', images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'], category: 'Fashion', is_available: true, like_count: 95, user_liked: true, store_id: 's7', store: { id: 's7', name: 'Sneaker Culture NG', logo_url: '', verified_until: '2025-12-31', ad_active_until: '2025-10-31', trending_score: 9.1, category: 'Fashion', location_text: 'Yaba, Lagos', avg_rating: 4.7, rating_count: 267 }, variants: [{ id: 'v3', label: 'Size 40', price_ngn: 52000, stock_qty: 1, is_available: true }, { id: 'v4', label: 'Size 42', price_ngn: 52000, stock_qty: 1, is_available: true }, { id: 'v5', label: 'Size 44', price_ngn: 52000, stock_qty: 0, is_available: false }] },
]

export const MOCK_STORES = [
  { id: 's1', name: 'TechHub Lagos', logo_url: '', category: 'Electronics', location_text: 'Computer Village, Ikeja', verified_until: '2025-12-31', ad_active_until: '2025-12-31', trending_score: 9.4, avg_rating: 4.8, rating_count: 203, description: 'Your No.1 source for phones, laptops, and accessories in Computer Village.', product_count: 47 },
  { id: 's2', name: 'Iya Bola Fabrics', logo_url: '', category: 'Fashion', location_text: 'Balogun Market, Lagos Island', verified_until: '2025-06-30', ad_active_until: null, trending_score: 8.1, avg_rating: 4.6, rating_count: 341, description: 'Authentic ankara, lace, and adire fabrics. Wholesale and retail.', product_count: 82 },
  { id: 's5', name: 'Alhaja Weavers', logo_url: '', category: 'Fashion', location_text: 'Wuse Market, Abuja', verified_until: '2025-08-31', ad_active_until: null, trending_score: 8.8, avg_rating: 4.9, rating_count: 189, description: 'Premium hand-woven aso-oke for all occasions.', product_count: 24 },
  { id: 's7', name: 'Sneaker Culture NG', logo_url: '', category: 'Fashion', location_text: 'Yaba, Lagos', verified_until: '2025-12-31', ad_active_until: '2025-10-31', trending_score: 9.1, avg_rating: 4.7, rating_count: 267, description: 'Original sneakers and sportswear. 100% authentic guaranteed.', product_count: 63 },
]

export const MOCK_MARKETS = [
  { id: 'm1', state: 'Lagos', name: 'Balogun Market', description: 'Largest open-air market in West Africa. Textiles, foodstuff, electronics.', store_count: 2400, image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400' },
  { id: 'm2', state: 'Lagos', name: 'Computer Village', description: 'Nigeria\'s largest ICT market. Phones, laptops, accessories, repairs.', store_count: 1800, image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400' },
  { id: 'm3', state: 'Lagos', name: 'Alaba International', description: 'Electronics and home appliances hub. Wholesale and retail.', store_count: 3200, image_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400' },
  { id: 'm4', state: 'Lagos', name: 'Mile 12 Market', description: 'Largest foodstuff market in Lagos. Tomatoes, onions, grains, produce.', store_count: 1500, image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400' },
  { id: 'm5', state: 'Abuja', name: 'Wuse Market', description: 'General goods market. Fashion, electronics, food, and household items.', store_count: 1100, image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400' },
  { id: 'm6', state: 'Abuja', name: 'Garki Market', description: 'FCT\'s largest open market. Wide variety of goods.', store_count: 890, image_url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400' },
  { id: 'm7', state: 'Kano', name: 'Kurmi Market', description: 'One of the oldest markets in Africa. Traditional crafts, leather, textiles.', store_count: 2100, image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400' },
  { id: 'm8', state: 'Rivers', name: 'Mile 1 Market', description: 'Port Harcourt\'s main market. Fresh produce, fashion, and general goods.', store_count: 780, image_url: 'https://images.unsplash.com/photo-1526779259212-939e64788e3c?w=400' },
]

export const MOCK_STATES = [
  'Lagos', 'Abuja (FCT)', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Anambra',
  'Delta', 'Imo', 'Ogun', 'Enugu', 'Kwara', 'Edo', 'Plateau', 'Borno',
]

export const MOCK_ORDERS = [
  { id: 'o1', product_title: 'Samsung Galaxy A54 5G', store_name: 'TechHub Lagos', amount_ngn: 285000, status: 'delivered', created_at: '2026-09-20T10:30:00Z', image_url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100', escrow_opted_in: true, rated: false },
  { id: 'o2', product_title: 'Nike Air Max 270', store_name: 'Sneaker Culture NG', amount_ngn: 52000, status: 'in_transit', created_at: '2026-09-22T14:00:00Z', image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100', escrow_opted_in: true, rated: false },
  { id: 'o3', product_title: 'Aso-Oke Set (3 Piece)', store_name: 'Alhaja Weavers', amount_ngn: 42000, status: 'pending', created_at: '2026-09-24T09:00:00Z', image_url: 'https://images.unsplash.com/photo-1590548784585-643d2b9f2925?w=100', escrow_opted_in: false, rated: false },
]

export const MOCK_CONVERSATIONS = [
  { id: 'c1', other_user: { id: 'u2', display_name: 'TechHub Lagos', avatar_url: '' }, last_message: 'The price is firm at ₦285,000. We can arrange delivery.', last_message_at: '2026-09-25T08:22:00Z', unread_count: 2 },
  { id: 'c2', other_user: { id: 'u3', display_name: 'Mama Fresh Produce', avatar_url: '' }, last_message: 'Yes we still have tomatoes. Come early tomorrow morning.', last_message_at: '2026-09-24T17:45:00Z', unread_count: 0 },
  { id: 'c3', other_user: { id: 'u4', display_name: 'Sneaker Culture NG', avatar_url: '' }, last_message: 'I can do ₦48,000 final — that\'s my best price.', last_message_at: '2026-09-23T12:10:00Z', unread_count: 1 },
]

export const MOCK_MESSAGES = [
  { id: 'msg1', sender_id: 'u2', content: 'Hello! I saw your inquiry about the Samsung A54.', created_at: '2026-09-25T08:00:00Z', read: true },
  { id: 'msg2', sender_id: 'me', content: 'Yes, is it still available? And can you do a better price?', created_at: '2026-09-25T08:05:00Z', read: true },
  { id: 'msg3', sender_id: 'u2', content: 'Yes it is available. We have black and white in stock. The price is firm at ₦285,000.', created_at: '2026-09-25T08:10:00Z', read: true },
  { id: 'msg4', sender_id: 'me', content: 'Can you add delivery to Surulere?', created_at: '2026-09-25T08:15:00Z', read: true },
  { id: 'msg5', sender_id: 'u2', content: 'Yes! Delivery to Surulere is ₦2,500. We can arrange same-day if you order before 12pm.', created_at: '2026-09-25T08:20:00Z', read: true },
  { id: 'msg6', sender_id: 'u2', content: 'The price is firm at ₦285,000. We can arrange delivery.', created_at: '2026-09-25T08:22:00Z', read: false },
]

export const MOCK_GROUPS = [
  { id: 'g1', market_id: 'm2', market_name: 'Computer Village', title: 'Computer Village Buyers & Sellers', description: 'Post what you need, sellers reply with prices. No cold DMs.', member_count: 4820, is_subscribed: true, tier: 'monthly' },
  { id: 'g2', market_id: 'm1', market_name: 'Balogun Market', title: 'Balogun Fashion Hub', description: 'Fabrics, aso-ebi, ankara, lace and more from Balogun.', member_count: 7340, is_subscribed: false, tier: null },
  { id: 'g3', market_id: 'm4', market_name: 'Mile 12 Market', title: 'Mile 12 Foodstuff Connect', description: 'Wholesale prices for tomatoes, onions, peppers and grains.', member_count: 2910, is_subscribed: false, tier: null },
]

export const MOCK_GROUP_POSTS = [
  { id: 'gp1', group_id: 'g1', author: { id: 'u5', display_name: 'Adaeze Obi', avatar_url: '' }, post_type: 'want', content: 'Looking for iPhone 13 Pro Max, 256GB, Space Grey. Budget ₦550,000. Anyone?', created_at: '2026-09-25T07:30:00Z', reply_count: 3, replies: [{ id: 'r1', author: { id: 's1', display_name: 'TechHub Lagos' }, content: 'We have it. ₦545,000, grade A UK used. DM to confirm.' }, { id: 'r2', author: { id: 's8', display_name: 'PhoneWorld NG' }, content: 'Brand new sealed, ₦580,000. Negotiable for serious buyers.' }] },
  { id: 'gp2', group_id: 'g1', author: { id: 'u6', display_name: 'Emeka Nwosu' }, post_type: 'want', content: 'Need MacBook Air M2, 8GB/256GB. Maximum budget ₦850,000.', created_at: '2026-09-25T06:15:00Z', reply_count: 1, replies: [{ id: 'r3', author: { id: 's9', display_name: 'LaptopKing NG' }, content: 'Have M2 Air 8/256 at ₦830,000. Rose Gold and Midnight in stock.' }] },
  { id: 'gp3', group_id: 'g1', author: { id: 'u7', display_name: 'Fatima Bello' }, post_type: 'want', content: 'Sony PS5 disc edition. How much are sellers going for currently?', created_at: '2026-09-24T18:00:00Z', reply_count: 4, replies: [] },
]

export const MOCK_RIDER_JOBS = [
  { id: 'j1', pickup: 'Computer Village, Ikeja', dropoff: 'Surulere, Lagos', distance_km: 14, price_ngn: 2500, status: 'pending', item_description: 'Phone — Samsung Galaxy A54', created_at: '2026-09-25T09:00:00Z', buyer_name: 'Adaeze Obi' },
  { id: 'j2', pickup: 'Balogun Market, Lagos Island', dropoff: 'Lekki Phase 1', distance_km: 22, price_ngn: 3800, status: 'pending', item_description: 'Fabric bundle — 3 bags', created_at: '2026-09-25T09:15:00Z', buyer_name: 'Chidi Okeke' },
  { id: 'j3', pickup: 'Mile 12 Market', dropoff: 'Gbagada, Lagos', distance_km: 9, price_ngn: 1800, status: 'pending', item_description: 'Foodstuff — 2 baskets tomatoes', created_at: '2026-09-25T09:30:00Z', buyer_name: 'Ngozi Adeleke' },
]

export const MOCK_ADMIN_ORDERS = [
  { id: 'o1', buyer_name: 'Adaeze Obi', seller_name: 'TechHub Lagos', product_title: 'Samsung Galaxy A54 5G', amount_ngn: 285000, status: 'delivered', created_at: '2026-09-20T10:30:00Z', dispute: false },
  { id: 'o4', buyer_name: 'Chidi Okeke', seller_name: 'Sneaker Culture NG', product_title: 'Nike Air Max 270', amount_ngn: 52000, status: 'disputed', created_at: '2026-09-22T14:00:00Z', dispute: true, dispute_reason: 'Buyer says item is fake. Seller disputes.' },
  { id: 'o5', buyer_name: 'Ngozi Adeleke', seller_name: 'Iya Bola Fabrics', product_title: 'Ankara Fabric 6 Yards', amount_ngn: 8500, status: 'in_transit', created_at: '2026-09-24T09:00:00Z', dispute: false },
  { id: 'o6', buyer_name: 'Emeka Nwosu', seller_name: 'Mama Fresh Produce', product_title: 'Tomatoes — 3 Baskets', amount_ngn: 36000, status: 'pending', created_at: '2026-09-25T08:00:00Z', dispute: false },
]

export const MOCK_RIDER_WALLET = {
  balance: 24500,
  pending: 3200,
  today: 8100,
  transactions: [
    { id: '1', type: 'credit', label: 'Delivery — Balogun → Yaba', amount: 2500, time: '2 hrs ago' },
    { id: '2', type: 'credit', label: 'Delivery — Ikeja → VI', amount: 3800, time: 'Yesterday' },
    { id: '3', type: 'debit',  label: 'Withdrawal to GTBank', amount: 10000, time: '2 days ago' },
    { id: '4', type: 'credit', label: 'Delivery — Oshodi → Lekki', amount: 1800, time: '3 days ago' },
  ],
}

// Unified MOCK object — all pages import from here
export const MOCK = {
  products: MOCK_PRODUCTS.map(p => ({
    ...p, price_kobo: p.price_ngn * 100, images: p.images,
    store: { name: p.store.name, is_verified: !!p.store.verified_until },
    likes_count: p.like_count,
  })),
  stores: MOCK_STORES.map(s => ({
    ...s, avg_rating: s.avg_rating, rating_count: s.rating_count,
    is_verified: !!s.verified_until, followers_count: s.rating_count * 2,
    market: { name: s.location_text },
  })),
  store: {
    id: 's1', name: 'TechHub Lagos', description: 'Your No.1 source for phones, laptops, and accessories.',
    is_verified: true, avg_rating: 4.8, rating_count: 203, followers_count: 1240,
    market: { name: 'Computer Village, Ikeja' },
  },
  markets: MOCK_MARKETS.map((m, i) => ({
    id: i + 1, state_id: i + 1, name: m.name, slug: m.name.toLowerCase().replace(/\s+/g, '-'),
    description: m.description, speciality: m.name.includes('Computer') ? ['electronics','phones'] :
      m.name.includes('Balogun') ? ['textiles','clothing'] : ['general'],
    address: m.state,
  })),
  states: [
    { id: 1, name: 'Lagos', code: 'LA', region: 'South West' },
    { id: 2, name: 'FCT Abuja', code: 'FC', region: 'North Central' },
    { id: 3, name: 'Kano', code: 'KN', region: 'North West' },
    { id: 4, name: 'Rivers', code: 'RI', region: 'South South' },
    { id: 5, name: 'Oyo', code: 'OY', region: 'South West' },
    { id: 6, name: 'Kaduna', code: 'KD', region: 'North West' },
    { id: 7, name: 'Anambra', code: 'AN', region: 'South East' },
    { id: 8, name: 'Delta', code: 'DE', region: 'South South' },
  ],
  groups: MOCK_GROUPS.map((g) => ({
    id: g.id, name: g.title, description: g.description,
    tier: g.tier ?? 'monthly', members_count: g.member_count,
    daily_fee_kobo: 10000, weekly_fee_kobo: 50000, monthly_fee_kobo: 150000,
    market: { name: g.market_name },
  })),
  threads: MOCK_CONVERSATIONS.map(c => ({
    id: c.id, other_name: c.other_user.display_name,
    other_avatar: c.other_user.avatar_url || undefined,
    last_message: c.last_message, last_at: c.last_message_at, unread: c.unread_count,
  })),
  messages: MOCK_MESSAGES,
  orders: MOCK_ORDERS.map(o => ({
    id: o.id, created_at: o.created_at, status: o.status,
    total_kobo: o.amount_ngn * 100, payment_route: 'kaja_escrow',
    escrow_opted_in: o.escrow_opted_in,
    store: { name: o.store_name },
    items: [{ title: o.product_title, qty: 1, price_kobo: o.amount_ngn * 100 }],
  })),
  jobs: MOCK_RIDER_JOBS.map(j => ({
    id: j.id, pickup_address: j.pickup, dropoff_address: j.dropoff,
    distance_km: j.distance_km, proposed_fee_kobo: j.price_ngn * 100,
    status: j.status, created_at: j.created_at,
    item_description: j.item_description,
    requester: { display_name: j.buyer_name },
  })),
  posts: MOCK_GROUP_POSTS,
}
