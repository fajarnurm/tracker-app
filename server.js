require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
const dbPath = process.env.DB_FILE || './data.db';

// Buat folder upload jika belum ada
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Setup database SQLite persistent
const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL,
    longitude REAL,
    image TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Setup multer untuk upload gambar
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));
app.use(express.static('public'));

// Endpoint kirim lokasi + gambar
app.post('/api/location', upload.single('image'), (req, res) => {
  const { latitude, longitude } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!latitude || !longitude) return res.status(400).send('Invalid data');

  db.run(`INSERT INTO locations (latitude, longitude, image) VALUES (?, ?, ?)`,
    [latitude, longitude, image], (err) => {
      if (err) return res.status(500).send('DB error');
      res.send('Location & image saved');
    });
});

// Dashboard monitoring
app.get('/dashboard', (req, res) => {
  db.all('SELECT * FROM locations ORDER BY timestamp DESC LIMIT 50', [], (err, rows) => {
    if (err) return res.status(500).send('DB error');
    let table = `<h1>Dashboard Lokasi</h1><table border='1' cellpadding='8'><tr><th>ID</th><th>Latitude</th><th>Longitude</th><th>Waktu</th><th>Snapshot</th></tr>`;
    rows.forEach(row => {
      const imgTag = row.image ? `<img src='/uploads/${row.image}' width='100'/>` : '-';
      table += `<tr><td>${row.id}</td><td>${row.latitude}</td><td>${row.longitude}</td><td>${row.timestamp}</td><td>${imgTag}</td></tr>`;
    });
    table += '</table>';
    res.send(table);
  });
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});