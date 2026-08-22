const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const PORT = process.env.PORT || 3000;

// Estado global de la alerta
let appState = {
  isAlertActive: false,
  message: 'TIEMPO',
  lastUpdated: null,
  activeDisplays: 0,
  activeControls: 0
};

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Obtener IPs locales de la red Wi-Fi / Ethernet
function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Filtrar IPv4 y no internos (127.0.0.1)
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Endpoint para información de red y códigos QR
app.get('/api/info', async (req, res) => {
  const localIps = getLocalIPAddresses();
  const primaryIp = localIps[0] || 'localhost';
  
  const baseUrl = `http://${primaryIp}:${PORT}`;
  const controlUrl = `${baseUrl}/control.html`;
  const displayUrl = `${baseUrl}/display.html`;

  try {
    const [qrBase, qrControl, qrDisplay] = await Promise.all([
      QRCode.toDataURL(baseUrl),
      QRCode.toDataURL(controlUrl),
      QRCode.toDataURL(displayUrl)
    ]);

    res.json({
      port: PORT,
      ips: localIps,
      primaryIp,
      urls: {
        base: baseUrl,
        control: controlUrl,
        display: displayUrl
      },
      qrs: {
        base: qrBase,
        control: qrControl,
        display: qrDisplay
      },
      state: appState
    });
  } catch (err) {
    res.status(500).json({ error: 'Error generando códigos QR' });
  }
});

// Manejo de conexiones WebSocket
io.on('connection', (socket) => {
  let userRole = 'unknown';

  // Enviar estado actual al conectarse
  socket.emit('state_update', appState);

  // Registro de rol (mando o pantalla)
  socket.on('register_role', (role) => {
    userRole = role;
    socket.join(role);

    if (role === 'display') {
      appState.activeDisplays++;
    } else if (role === 'control') {
      appState.activeControls++;
    }

    io.emit('stats_update', {
      activeDisplays: appState.activeDisplays,
      activeControls: appState.activeControls
    });
  });

  // Móvil 1 presiona botón de aviso
  socket.on('trigger_alert', (customMessage) => {
    appState.isAlertActive = true;
    appState.message = customMessage || 'TIEMPO';
    appState.lastUpdated = new Date().toISOString();

    io.emit('alert_triggered', {
      isAlertActive: true,
      message: appState.message,
      timestamp: appState.lastUpdated
    });
  });

  // Móvil 1 presiona botón de parar aviso
  socket.on('stop_alert', () => {
    appState.isAlertActive = false;
    appState.lastUpdated = new Date().toISOString();

    io.emit('alert_stopped', {
      isAlertActive: false,
      timestamp: appState.lastUpdated
    });
  });

  // Desconexión
  socket.on('disconnect', () => {
    if (userRole === 'display') {
      appState.activeDisplays = Math.max(0, appState.activeDisplays - 1);
    } else if (userRole === 'control') {
      appState.activeControls = Math.max(0, appState.activeControls - 1);
    }

    io.emit('stats_update', {
      activeDisplays: appState.activeDisplays,
      activeControls: appState.activeControls
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPAddresses();
  console.log(`\n==================================================`);
  console.log(`🚀 SERVIDOR ACTIVO EN EL PUERTO ${PORT}`);
  console.log(`--------------------------------------------------`);
  console.log(`📱 En tu ordenador:  http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`📲 En tus móviles (misma red WiFi):`);
    ips.forEach((ip) => {
      console.log(`   👉 http://${ip}:${PORT}`);
      console.log(`      - Móvil 1 (Mando):    http://${ip}:${PORT}/control.html`);
      console.log(`      - Móvil 2 (Pantalla): http://${ip}:${PORT}/display.html`);
    });
  }
  console.log(`==================================================\n`);
});
