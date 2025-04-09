const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Express uygulaması oluştur
const app = express();
app.use(cors());

// HTTP sunucusu
const server = http.createServer(app);

// Socket.IO yapılandırması
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// İstemci yönetimi
const clients = {
  flutter: new Set(),
  python: new Set()
};

// Debug için renkli loglar
const colors = {
  reset: "\x1b[0m",
  python: "\x1b[36m", // Cyan
  flutter: "\x1b[33m", // Yellow
  system: "\x1b[35m" // Magenta
};

function logClient(type, message) {
  console.log(`${colors[type]}${type.toUpperCase()}${colors.reset}: ${message}`);
}

// Bağlantı yönetimi
io.on('connection', (socket) => {
  logClient('system', `Yeni bağlantı: ${socket.id}`);

  // İstemci türünü belirleme
  socket.on('register_client', (clientType) => {
    if (clientType === 'python') {
      clients.python.add(socket.id);
      logClient('python', `Kayıtlı Python istemcisi: ${socket.id}`);
    } else {
      clients.flutter.add(socket.id);
      logClient('flutter', `Kayıtlı Flutter istemcisi: ${socket.id}`);
    }
    
    // Tüm istemcileri logla
    logClient('system', `Aktif istemciler - Flutter: ${clients.flutter.size} | Python: ${clients.python.size}`);
  });

  // Klavye olayları
  socket.on('keyboard', (data) => {
    if (!data.key) {
      logClient('system', `Geçersiz klavye verisi: ${JSON.stringify(data)}`);
      return;
    }

    logClient('flutter', `Tuş basımı: ${data.key}`);
    
    // Python istemcilerine ilet
    clients.python.forEach(clientId => {
      io.to(clientId).emit('keyboard', data);
    });
  });

  // Mouse hareketleri
  socket.on('mouse_move', (data) => {
    if (typeof data.dx !== 'number' || typeof data.dy !== 'number') {
      logClient('system', `Geçersiz mouse hareketi: ${JSON.stringify(data)}`);
      return;
    }

    logClient('flutter', `Mouse hareketi: dx=${data.dx}, dy=${data.dy}`);
    
    clients.python.forEach(clientId => {
      io.to(clientId).emit('mouse_move', data);
    });
  });

  // Mouse tıklaması
  socket.on('mouse_click', (data) => {
    logClient('flutter', `Mouse tıklandı: ${JSON.stringify(data)}`);
    
    clients.python.forEach(clientId => {
      io.to(clientId).emit('mouse_click', data);
    });
  });

  // Bağlantı kesilirse
  socket.on('disconnect', () => {
    if (clients.python.has(socket.id)) {
      clients.python.delete(socket.id);
      logClient('python', `Bağlantı kesildi: ${socket.id}`);
    } else if (clients.flutter.has(socket.id)) {
      clients.flutter.delete(socket.id);
      logClient('flutter', `Bağlantı kesildi: ${socket.id}`);
    }
    
    logClient('system', `Kalan istemciler - Flutter: ${clients.flutter.size} | Python: ${clients.python.size}`);
  });
});

// HTTP endpoint'i (sağlık kontrolü)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    clients: {
      flutter: clients.flutter.size,
      python: clients.python.size
    }
  });
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n${colors.system}### Uzaktan Kontrol Sunucusu ###${colors.reset}`);
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
  console.log(`Socket.IO endpoint: ws://localhost:${PORT}/socket.io/\n`);
});