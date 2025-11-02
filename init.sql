CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  image_url TEXT,
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  total NUMERIC(12,2) NOT NULL,
  payment_info JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER,
  unit_price NUMERIC(12,2)
);

-- Seed sample
INSERT INTO products (name, sku, price, category, quantity, image_url, attributes)
VALUES
('Wireless Mouse','WM-100',499.00,'Accessories',150,'https://picsum.photos/seed/1/200/120', '{"brand":"Acme","connectivity":"Wireless"}')
ON CONFLICT DO NOTHING;
