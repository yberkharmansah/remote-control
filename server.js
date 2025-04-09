// Memory optimizasyonu (Railway 512MB limiti için)
require('v8').setFlagsFromString('--max-old-space-size=512');

// Temel modüller
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Express uygulaması
const app = express();
app.use(cors());
app.use(express.json());

// HTTP sunucusu
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Socket.IO yapılandırması (Railway için optimize edilmiş)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    transports: ['websocket', 'polling'],
    credentials: true
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 dakika
    skipMiddlewares: true
  }
});

// İstemci yönetimi
const clients = {
  flutter: new Set(),
  python: new Set()
};

// Socket.IO bağlantı yönetimi
io.on('connection', (socket) => {
  console.log(`🟢 Yeni bağlantı: ${socket.id}`);

  // İstemci kaydı
  socket.on('register_client', (clientType) => {
    const pool = clientType === 'python' ? clients.python : clients.flutter;
    pool.add(socket.id);
    console.log(`📌 ${clientType.toUpperCase()} istemcisi kaydedildi (${pool.size} aktif)`);
  });

  // Olay yönlendirici
  const forwardEvent = (eventName) => {
    socket.on(eventName, (data) => {
      if (!clients.python.size) {
        console.warn(`⚠️ Python istemcisi bağlı değil (${eventName} eventi)`);
        return;
      }
      clients.python.forEach(clientId => {
        io.to(clientId).emit(eventName, data);
      });
    });
  };

  // Desteklenen eventler
  ['keyboard', 'mouse_move', 'mouse_click'].forEach(forwardEvent);

  // Bağlantı kesilirse
  socket.on('disconnect', () => {
    clients.python.delete(socket.id);
    clients.flutter.delete(socket.id);
    console.log(`🔴 Bağlantı kesildi: ${socket.id}`);
  });
});

// Health check endpoint (Railway için zorunlu)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    clients: {
      flutter: clients.flutter.size,
      python: clients.python.size
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Sunucuyu başlat
server.listen(PORT, () => {
  console.log(`
  ********************************************
  🚀 Server ${process.env.NODE_ENV || 'development'} modunda
  🚪 Port: ${PORT}
  📅 ${new Date().toLocaleString()}
  ********************************************
  `);
});

// Process killer handler (Railway SIGTERM için)
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM alındı, sunucu kapatılıyor...');
  server.close(() => {
    process.exit(0);
  });
});