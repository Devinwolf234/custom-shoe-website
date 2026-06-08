const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary config
cloudinary.config({
  cloud_name: 'dxq9l9ggo',
  api_key: '792473667246535',
  api_secret: 'w0LxB3H0Fbhwcw2ZNHwwNvuxgrA'
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Multer — temp storage before Cloudinary upload
const upload = multer({ dest: 'temp/' });

const ADMIN_USER = 'dad';
const ADMIN_PASS = 'customshoes';

function getShoes() {
  const dataPath = path.join(__dirname, 'data', 'shoes.json');
  try { return JSON.parse(fs.readFileSync(dataPath, 'utf8')); }
  catch { return []; }
}

function saveShoes(shoes) {
  fs.writeFileSync(path.join(__dirname, 'data', 'shoes.json'), JSON.stringify(shoes, null, 2));
}

app.get('/', (req, res) => {
  res.render('index', { shoes: getShoes() });
});

app.get('/admin', (req, res) => {
  res.render('admin', { shoes: getShoes(), error: null, loggedIn: false });
});

app.post('/admin', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.render('admin', { shoes: getShoes(), error: null, loggedIn: true });
  } else {
    res.render('admin', { shoes: [], error: 'Wrong username or password.', loggedIn: false });
  }
});

app.post('/upload', upload.single('shoeImage'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'custom-shoes'
    });
    fs.unlinkSync(req.file.path); // delete temp file

    const shoes = getShoes();
    shoes.push({
      id: Date.now(),
      title: req.body.title || '',
      description: req.body.description || '',
      brand: req.body.brand || '',
      featured: req.body.featured === 'on',
      image: result.secure_url,
      public_id: result.public_id
    });
    saveShoes(shoes);
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

app.post('/delete', async (req, res) => {
  const { id } = req.body;
  let shoes = getShoes();
  const shoe = shoes.find(s => s.id == id);
  if (shoe && shoe.public_id) {
    await cloudinary.uploader.destroy(shoe.public_id);
  }
  shoes = shoes.filter(s => s.id != id);
  saveShoes(shoes);
  res.redirect('/admin');
});

app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));