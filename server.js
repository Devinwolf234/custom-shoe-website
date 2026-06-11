const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

cloudinary.config({
  cloud_name: 'dxq9l9ggo',
  api_key: '792473667246535',
  api_secret: 'w0LxB3H0Fbhwcw2ZNHwwNvuxgrA'
});

const IS_PROD = !!process.env.DATABASE_URL;
let pool;
let sessionStore;

if (IS_PROD) {
  const { Pool } = require('pg');
  const pgSession = require('connect-pg-simple')(session);
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  sessionStore = new pgSession({
    pool,
    createTableIfMissing: true
  });
}

async function initDB() {
  if (!IS_PROD) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shoes (
      id SERIAL PRIMARY KEY,
      title TEXT,
      description TEXT,
      brand TEXT,
      featured BOOLEAN DEFAULT false,
      image TEXT,
      public_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

function getShoes() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'shoes.json'), 'utf8')); }
  catch { return []; }
}

function saveShoes(shoes) {
  fs.writeFileSync(path.join(__dirname, 'data', 'shoes.json'), JSON.stringify(shoes, null, 2));
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  store: IS_PROD ? sessionStore : null,
  secret: 'retrojordansecret123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

if (!fs.existsSync('temp')) fs.mkdirSync('temp');
const upload = multer({ dest: 'temp/' });

const ADMIN_USER = 'dad';
const ADMIN_PASS = 'customshoes';

app.get('/', async (req, res) => {
  try {
    let shoes;
    if (IS_PROD) {
      const result = await pool.query('SELECT * FROM shoes ORDER BY created_at DESC');
      shoes = result.rows;
    } else {
      shoes = getShoes();
    }
    res.render('index', { shoes });
  } catch (err) {
    console.error(err);
    res.render('index', { shoes: [] });
  }
});

app.get('/admin', async (req, res) => {
  try {
    let shoes = [];
    if (req.session.loggedIn) {
      if (IS_PROD) {
        const result = await pool.query('SELECT * FROM shoes ORDER BY created_at DESC');
        shoes = result.rows;
      } else {
        shoes = getShoes();
      }
    }
    res.render('admin', { shoes, error: null, loggedIn: req.session.loggedIn || false });
  } catch (err) {
    res.render('admin', { shoes: [], error: null, loggedIn: false });
  }
});

app.post('/admin', async (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    try {
      let shoes;
      if (IS_PROD) {
        const result = await pool.query('SELECT * FROM shoes ORDER BY created_at DESC');
        shoes = result.rows;
      } else {
        shoes = getShoes();
      }
      res.render('admin', { shoes, error: null, loggedIn: true });
    } catch (err) {
      res.render('admin', { shoes: [], error: null, loggedIn: true });
    }
  } else {
    res.render('admin', { shoes: [], error: 'Wrong username or password.', loggedIn: false });
  }
});

app.post('/upload', upload.single('shoeImage'), async (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/admin');
  try {
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'custom-shoes' });
    fs.unlinkSync(req.file.path);

    const shoe = {
      id: Date.now(),
      title: req.body.title || '',
      description: req.body.description || '',
      brand: req.body.brand || '',
      featured: req.body.featured === 'on',
      image: result.secure_url,
      public_id: result.public_id
    };

    if (IS_PROD) {
      await pool.query(
        'INSERT INTO shoes (title, description, brand, featured, image, public_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [shoe.title, shoe.description, shoe.brand, shoe.featured, shoe.image, shoe.public_id]
      );
    } else {
      const shoes = getShoes();
      shoes.push(shoe);
      saveShoes(shoes);
    }
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

app.post('/delete', async (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/admin');
  const { id } = req.body;
  try {
    if (IS_PROD) {
      const result = await pool.query('SELECT public_id FROM shoes WHERE id = $1', [id]);
      if (result.rows.length > 0 && result.rows[0].public_id) {
        await cloudinary.uploader.destroy(result.rows[0].public_id);
      }
      await pool.query('DELETE FROM shoes WHERE id = $1', [id]);
    } else {
      let shoes = getShoes();
      const shoe = shoes.find(s => s.id == id);
      if (shoe && shoe.public_id) await cloudinary.uploader.destroy(shoe.public_id);
      shoes = shoes.filter(s => s.id != id);
      saveShoes(shoes);
    }
  } catch (err) {
    console.error(err);
  }
  res.redirect('/admin');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin');
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});