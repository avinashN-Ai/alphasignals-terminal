const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 5e6 // 5MB for snapshots/frames
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to get Local Wi-Fi / JioFiber IP address
function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push({ interface: name, ip: net.address });
      }
    }
  }
  return ips;
}

// Store active devices & history logs
const devices = new Map();
const activityLogs = [];

function addLog(message, type = 'info') {
  const entry = {
    id: Date.now() + Math.random().toString(36).substring(2, 6),
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    message,
    type
  };
  activityLogs.unshift(entry);
  if (activityLogs.length > 40) activityLogs.pop();
  io.to('admins').emit('activity-log', entry);
}

app.get('/api/network-info', (req, res) => {
  const ips = getLocalIPs();
  const primaryIp = ips.length > 0 ? ips[0].ip : 'localhost';
  const isJioSubnet = ips.some(i => i.ip.startsWith('192.168.29.') || i.ip.startsWith('192.168.1.'));
  res.json({
    port: PORT,
    primaryIp,
    ips,
    jioRouterGateway: 'http://192.168.29.1',
    isJioSubnet,
    shareUrl: `http://${primaryIp}:${PORT}`,
    familyUrl: `http://${primaryIp}:${PORT}/?mode=family`,
    adminUrl: `http://${primaryIp}:${PORT}/?mode=admin`,
    logs: activityLogs
  });
});

io.on('connection', (socket) => {
  // Register Family / Home Device (Phone or Smart TV)
  socket.on('register-device', (data) => {
    const device = {
      socketId: socket.id,
      name: data.name || 'Ghar ka Phone',
      deviceType: data.deviceType || 'phone', // 'phone' | 'tv'
      battery: data.battery ?? 85,
      charging: data.charging ?? false,
      network: data.network || 'JioFiber Wi-Fi (5GHz)',
      ping: data.ping || 14,
      streamMode: data.streamMode || 'ready',
      activeApp: data.activeApp || 'Home Screen',
      helpRequested: false,
      connectedAt: new Date().toISOString()
    };
    devices.set(socket.id, device);
    socket.join('devices');
    addLog(`📱 "${device.name}" (${device.deviceType.toUpperCase()}) online aaya!`, 'success');
    io.to('admins').emit('device-list', Array.from(devices.values()));
  });

  // Register Admin Dashboard
  socket.on('register-admin', () => {
    socket.join('admins');
    socket.emit('device-list', Array.from(devices.values()));
    socket.emit('activity-history', activityLogs);
  });

  // Device Telemetry Update (Battery, Network, Active App, SOS)
  socket.on('telemetry-update', (updates) => {
    const dev = devices.get(socket.id);
    if (dev) {
      Object.assign(dev, updates);
      devices.set(socket.id, dev);
      io.to('admins').emit('device-list', Array.from(devices.values()));
      if (updates.helpRequested) {
        addLog(`🚨 SOS! "${dev.name}" ne MADAD (Help) button dabaya hai!`, 'alert');
        io.to('admins').emit('sos-alert', dev);
      }
    }
  });

  // Live Canvas / Screen / Camera Frame Relay (Works universally across all browsers & TVs)
  socket.on('video-frame', (payload) => {
    io.to('admins').emit('video-frame', {
      deviceId: socket.id,
      frame: payload.frame,
      mode: payload.mode,
      timestamp: Date.now()
    });
  });

  // WebRTC Signaling between Family Device and Admin
  socket.on('webrtc-offer', (data) => {
    io.to(data.targetId || 'admins').emit('webrtc-offer', {
      fromId: socket.id,
      sdp: data.sdp,
      streamType: data.streamType
    });
  });

  socket.on('webrtc-answer', (data) => {
    io.to(data.targetId).emit('webrtc-answer', {
      fromId: socket.id,
      sdp: data.sdp
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    if (data.targetId) {
      io.to(data.targetId).emit('webrtc-ice-candidate', {
        fromId: socket.id,
        candidate: data.candidate
      });
    } else {
      io.to('admins').emit('webrtc-ice-candidate', {
        fromId: socket.id,
        candidate: data.candidate
      });
    }
  });

  // Admin Commands -> Target Home Device
  socket.on('admin-command', (cmd) => {
    const { targetId, action, payload } = cmd;
    const targetDev = devices.get(targetId);
    const targetName = targetDev ? targetDev.name : 'All Devices';

    if (targetId === 'all') {
      io.to('devices').emit('remote-command', { action, payload });
    } else if (targetId) {
      io.to(targetId).emit('remote-command', { action, payload });
    }

    // Log human-readable action
    if (action === 'siren') {
      addLog(`🔔 Admin ne "${targetName}" par Loud Siren/Ring bajaya!`, 'warning');
    } else if (action === 'tts-speak') {
      addLog(`🗣️ Voice Alert -> "${targetName}": "${payload.text}"`, 'info');
    } else if (action === 'open-app') {
      addLog(`🚀 "${targetName}" par [${payload.label}] open kiya gaya.`, 'success');
    } else if (action === 'tv-remote') {
      addLog(`📺 TV Remote Key [${payload.key}] -> "${targetName}"`, 'info');
    } else if (action === 'request-stream') {
      addLog(`📷 Admin ne "${targetName}" se [${payload.mode}] stream maanga.`, 'info');
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    if (devices.has(socket.id)) {
      const dev = devices.get(socket.id);
      devices.delete(socket.id);
      addLog(`📴 "${dev.name}" offline ho gaya.`, 'warning');
      io.to('admins').emit('device-list', Array.from(devices.values()));
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log(`\n======================================================`);
  console.log(`🏠 GharConnect Remote Support & Monitor Server Active!`);
  console.log(`👉 Local PC URL:    http://localhost:${PORT}`);
  ips.forEach(item => {
    console.log(`👉 Wi-Fi/Mobile URL: http://${item.ip}:${PORT}`);
  });
  console.log(`======================================================\n`);
});
