// Gerekli modülleri import edin
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const socketClient = require('socket.io-client');  // Python sunucusuna bağlanmak için client ekliyoruz

// Express uygulaması oluştur
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Python server'ına bağlan (Railway adresi)
const pythonSocket = socketClient('https://senin-railway-python-sunucun.up.railway.app'); // <-- BURAYI Python sunucu adresinle değiştir

// Server'ı başlat
server.listen(process.env.PORT || 3000, () => {
  console.log('Server is running');
});

// Flutter'dan gelen WebSocket bağlantılarını dinle
io.on('connection', (socket) => {
  console.log('A user connected');

  // Klavye tuşları geldiğinde
  socket.on('keyboard', (data) => {
    console.log('Key pressed:', data.key);
    pythonSocket.emit('keyboard', { key: data.key });  // Python sunucuya gönder
  });

  // Mouse hareketleri geldiğinde
  socket.on('mousemove', (data) => {
    console.log('Mouse moved:', data);
    pythonSocket.emit('mousemove', data);  // Python sunucuya gönder
  });

  // Mouse tıklaması geldiğinde (isteğe bağlı)
  socket.on('mouse_click', (data) => {
    console.log('Mouse clicked:', data);
    pythonSocket.emit('mouse_click', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});
