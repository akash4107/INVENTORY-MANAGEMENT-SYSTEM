const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// health
app.get('/', (req,res)=>res.json({ok:true}));

/* ---------- AUTH ---------- */
// register
app.post('/api/auth/register', async (req,res)=>{
  try{
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const r = await db.query('INSERT INTO users (name,email,password) VALUES ($1,$2,$3) RETURNING id,name,email,role', [name,email,hashed]);
    res.json(r.rows[0]);
  }catch(e){ res.status(500).json({error:e.message})}
});

// login
app.post('/api/auth/login', async (req,res)=>{
  try{
    const { email, password } = req.body;
    const r = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    if(r.rows.length===0) return res.status(401).json({error:'Invalid credentials'});
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(401).json({error:'Invalid credentials'});
    const token = jwt.sign({ id:user.id, name:user.name, role:user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id:user.id, name:user.name, role:user.role }});
  }catch(e){ res.status(500).json({error:e.message})}
});

/* ---------- PRODUCTS ---------- */
// list
app.get('/api/products', async (req,res)=>{
  const q = req.query.q || '';
  const r = await db.query("SELECT id,name,sku,price,category,quantity,image_url,attributes FROM products WHERE name ILIKE $1 ORDER BY id DESC LIMIT 500", [`%${q}%`]);
  res.json(r.rows);
});

// get single
app.get('/api/products/:id', async (req,res)=>{
  const r = await db.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
  if(r.rows.length===0) return res.status(404).json({error:'Not found'});
  res.json(r.rows[0]);
});

// create (simple)
app.post('/api/products', async (req,res)=>{
  const { name, sku, price, category, quantity, image_url, attributes } = req.body;
  const r = await db.query('INSERT INTO products (name,sku,price,category,quantity,image_url,attributes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [name,sku,price,category,quantity,image_url||null,attributes||{}]);
  res.json(r.rows[0]);
});

// update
app.put('/api/products/:id', async (req,res)=>{
  const { name, sku, price, category, quantity, image_url, attributes } = req.body;
  const r = await db.query('UPDATE products SET name=$1,sku=$2,price=$3,category=$4,quantity=$5,image_url=$6,attributes=$7 WHERE id=$8 RETURNING *', [name,sku,price,category,quantity,image_url||null,attributes||{}, req.params.id]);
  res.json(r.rows[0]);
});

// delete
app.delete('/api/products/:id', async (req,res)=>{
  await db.query('DELETE FROM products WHERE id=$1', [req.params.id]);
  res.json({ok:true});
});

/* ---------- ORDERS (minimal) ---------- */
app.post('/api/orders', async (req,res)=>{
  try{
    const { user_id, items, total, payment } = req.body;
    const ins = await db.query('INSERT INTO orders (user_id,total,payment_info,status) VALUES ($1,$2,$3,$4) RETURNING *', [user_id||null,total,payment||{},'pending']);
    const order = ins.rows[0];
    for(const it of items||[]){
      await db.query('INSERT INTO order_items (order_id,product_id,quantity,unit_price) VALUES ($1,$2,$3,$4)', [order.id, it.product_id, it.qty, it.price]);
      await db.query('UPDATE products SET quantity = quantity - $1 WHERE id=$2', [it.qty, it.product_id]);
    }
    res.json({ok:true, order});
  }catch(e){ res.status(500).json({error:e.message})}
});

// start
const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log('Backend listening on', PORT));
