require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const registerCollabHandlers = require('./socket/collabHandler');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or is a local network IP (192.168.x.x, 10.x.x.x, etc)
    const isLocal = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
    
    if (allowedOrigins.indexOf(origin) !== -1 || isLocal) {
      callback(null, true);
    } else {
      callback(null, true); // Still allow for now to prevent blocking during dev, but log it
      console.log('CORS attempt from non-standard origin:', origin);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
};

const io = new Server(server, {
  cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// Socket.IO
registerCollabHandlers(io);

// MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/collab-doc')
  .then(() => console.log('[DB] MongoDB connected'))
  .catch(err => console.error('[DB] Error:', err.message));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`[Server] Running on http://localhost:${PORT}`));

module.exports = { app, server, io };
