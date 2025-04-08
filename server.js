// Gerekli modülleri import edin
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Express uygulaması oluştur
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Python client'ına data göndermek için global socketler listesi
const pythonClients = new Set();

// Ana sayfa için basit bir route
app.get('/', (req, res) => {
  res.send('Remote Control Server Running');
});

// Server'ı başlat
server.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

// Flutter'dan gelen WebSocket bağlantılarını dinle
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  
  // Python istemcisi mi kontrol et
  socket.on('register_python_client', () => {
    console.log('Python client registered:', socket.id);
    pythonClients.add(socket.id);
  });

  // Klavye tuşları geldiğinde
  socket.on('keyboard', (data) => {
    console.log('Key pressed:', data.key);
    // Tüm Python clientlara ilet
    pythonClients.forEach(clientId => {
      if (clientId !== socket.id) {
        io.to(clientId).emit('keyboard', data);
      }
    });
  });

  // Mouse hareketleri geldiğinde - hem 'mousemove' hem de 'mouse_move' eventlerini dinle
  socket.on('mouse_move', (data) => {
    console.log('Mouse moved:', data);
    // Tüm Python clientlara ilet
    pythonClients.forEach(clientId => {
      if (clientId !== socket.id) {
        io.to(clientId).emit('mouse_move', data);
      }
    });
  });

  // Mouse tıklaması geldiğinde
  socket.on('mouse_click', (data) => {
    console.log('Mouse clicked:', data);
    // Tüm Python clientlara ilet
    pythonClients.forEach(clientId => {
      if (clientId !== socket.id) {
        io.to(clientId).emit('mouse_click', data);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Python client listesinden çıkar
    pythonClients.delete(socket.id);
  });
});