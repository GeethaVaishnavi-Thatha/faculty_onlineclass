const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const connectDB = require('./db');
const facultyRoutes      = require('./routes/facultyRoutes');
const invoiceRoutes      = require('./routes/invoiceRoutes');
const invigilationRoutes = require('./routes/invigilationRoutes');
const dutyChartRoutes    = require('./routes/dutyChartRoutes');

dotenv.config();
const app = express();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedOrigins = [
  // Local development
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5500",
  "http://localhost:5501",
  "http://localhost:8000",
  "http://localhost:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:8080",
  // Production
  "https://facultyonlineclass.netlify.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

connectDB();

// ── Existing routes (DO NOT MODIFY) ──────────────────────────────────────
app.use('/api/faculty',      facultyRoutes);

// ── Admin Dashboard routes ────────────────────────────────────────────────
app.use('/api/invoices',     invoiceRoutes);
app.use('/api/invigilation', invigilationRoutes);
app.use('/api/duty',         dutyChartRoutes);

app.use((err, req, res, next) => {
    return res.status(400).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));