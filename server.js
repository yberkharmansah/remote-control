const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// 1. Express ve HTTP sunucusu
const app = express();
app.use(cors());
const server = http.createServer(app);
const PORT = 3000; // Sabit port

// 2. Socket.IO yapılandırması
const io = socketIo(server, {
  cors: {
    origin: "*", // Tüm originlere izin ver
    methods: ["GET", "POST"]
  }
});

// 3. İstemci takibi
const clients = {
  flutter: new Set(),
  python: new Set()
};

// 4. Socket.IO olayları
io.on('connection', (socket) => {
  console.log('⚡ Yeni bağlantı:', socket.id);

  // İstemci kaydı
  socket.on('register_client', (clientType) => {
    const pool = clientType === 'python' ? clients.python : clients.flutter;
    pool.add(socket.id);
    console.log(`📌 ${clientType} istemcisi kaydedildi (Toplam: ${pool.size})`);
  });

  // Olay yönlendirme
  const forwardEvent = (eventName) => {
    socket.on(eventName, (data) => {
      clients.python.forEach(clientId => {
        io.to(clientId).emit(eventName, data);
      });
    });
  };

  ['keyboard', 'mouse_move', 'mouse_click'].forEach(forwardEvent);

  // Bağlantı kesilirse
  socket.on('disconnect', () => {
    clients.python.delete(socket.id);
    clients.flutter.delete(socket.id);
    console.log('❌ Bağlantı kesildi:', socket.id);
  });
});

// 5. Test endpoint'i
app.get('/ping', (req, res) => {
  res.send('🏓 Pong!');
});

// 6. Sunucuyu başlat
server.listen(PORT, () => {
  console.log(`
  ************************************
  🚀 Server http://localhost:${PORT} adresinde
  ************************************
  `);
});