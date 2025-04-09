require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const DB_FILE = process.env.DB_FILE || './data.db';

// Setup folder upload
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Setup upload multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Setup database
const db = new Database(DB_FILE);
db.prepare(`CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  latitude REAL,
  longitude REAL,
  image TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(`/${UPLOAD_DIR}`, express.static(UPLOAD_DIR));
app.use(express.static('public'));

// Endpoint POST lokasi + gambar
app.post('/api/location', upload.single('image'), (req, res) => {
  const { latitude, longitude } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!latitude || !longitude) return res.status(400).send('Invalid data');

  try {
    db.prepare(`INSERT INTO locations (latitude, longitude, image) VALUES (?, ?, ?)`)
      .run(latitude, longitude, image);
    res.send('Location & image saved');
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

// Dashboard monitoring
app.get('/dashboard', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM locations ORDER BY timestamp DESC LIMIT 50').all();
    let table = `<h1>Dashboard Lokasi</h1><table border='1' cellpadding='8'><tr><th>ID</th><th>Latitude</th><th>Longitude</th><th>Waktu</th><th>Snapshot</th></tr>`;
    rows.forEach(row => {
      const imgTag = row.image ? `<img src='/${UPLOAD_DIR}/${row.image}' width='100'/>` : '-';
      table += `<tr><td>${row.id}</td><td>${row.latitude}</td><td>${row.longitude}</td><td>${row.timestamp}</td><td>${imgTag}</td></tr>`;
    });
    table += '</table>';
    res.send(table);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
