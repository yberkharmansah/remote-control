// Bellek optimizasyonu (Render Free Tier için)
require('v8').setFlagsFromString('--max-old-space-size=512');

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Sabit config (Render özel)
const CONFIG = {
  PORT: 10000, // Render'ın zorunlu portu
  ALLOWED_ORIGINS: ["https://remote-control-565f.onrender.com", "http://localhost"],
  SOCKET_OPTS: {
    pingTimeout: 60000,
    pingInterval: 25000
  }
};

// Express setup
const app = express();
app.use(cors({
  origin: CONFIG.ALLOWED_ORIGINS,
  methods: ["GET", "POST"]
}));

// HTTP server
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: CONFIG.ALLOWED_ORIGINS,
    methods: ["GET", "POST"]
  },
  ...CONFIG.SOCKET_OPTS
});

// Client tracking
const clients = {
  flutter: new Set(),
  python: new Set()
};

// Socket.IO events
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] 🔗 New connection: ${socket.id}`);

  // Client registration
  socket.on('register_client', (clientType) => {
    const pool = clients[clientType] || clients.flutter;
    pool.add(socket.id);
    console.log(`📌 Registered ${clientType} client (Total: ${pool.size})`);
  });

  // Event forwarding
  const forwardEvent = (event) => {
    socket.on(event, (data) => {
      clients.python.forEach(client => {
        io.to(client).emit(event, data);
      });
    });
  };

  ['keyboard', 'mouse_move', 'mouse_click'].forEach(forwardEvent);

  // Cleanup
  socket.on('disconnect', () => {
    clients.python.delete(socket.id);
    clients.flutter.delete(socket.id);
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

// Health check (Render için zorunlu)
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    clients: {
      flutter: clients.flutter.size,
      python: clients.python.size
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <h1>Remote Control Server</h1>
    <p>Status: <span style="color:green">Running</span></p>
    <p>Socket.IO: <code>/socket.io/</code></p>
    <p>Health Check: <a href="/health">/health</a></p>
  `);
});

// Start server
server.listen(CONFIG.PORT, () => {
  console.log(`
  ********************************************
  🚀 Server running on port ${CONFIG.PORT}
  🌐 Web Interface: http://localhost:${CONFIG.PORT}
  🕒 Started at: ${new Date().toISOString()}
  ********************************************
  `);
});

// Render-specific shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});