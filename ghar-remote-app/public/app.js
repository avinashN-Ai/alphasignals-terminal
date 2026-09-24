// GharConnect - Complete Real-Time Remote Support & Monitor Engine

const adminSocket = io();
const familySocket = io();

let connectedDevices = [];
let selectedDeviceId = null;
let currentFamilyState = {
  name: 'Mummy ka Phone',
  deviceType: 'phone',
  battery: 88,
  charging: true,
  network: 'JioFiber 5GHz Wi-Fi',
  activeApp: 'Home Screen',
  tvSelectedIndex: 0,
  volume: 65,
  muted: false,
  streamMode: 'simulated', // 'simulated' | 'screen' | 'camera'
  lastRemoteKey: 'NONE',
  laser: null
};

let mediaStream = null;
let sirenInterval = null;
let audioCtx = null;

// App tiles shown on the Family Phone / Smart TV Screen
const homeApps = [
  { id: 'youtube', title: 'YouTube', icon: '▶️', color: '#dc2626', sub: 'Videos & Bhajan' },
  { id: 'jiotv', title: 'JioTV Live', icon: '📺', color: '#2563eb', sub: 'Live TV Channels' },
  { id: 'whatsapp', title: 'WhatsApp', icon: '💬', color: '#16a34a', sub: 'Video Call' },
  { id: 'jiofiber', title: 'JioFiber', icon: '🌐', color: '#0891b2', sub: 'Router: Online' },
  { id: 'hotstar', title: 'Hotstar', icon: '⭐', color: '#7c3aed', sub: 'Serials & Cricket' },
  { id: 'settings', title: 'Wi-Fi Fix', icon: '⚙️', color: '#d97706', sub: 'Network Settings' }
];

// Check URL mode parameter (?mode=family or ?mode=admin)
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (mode === 'family') {
    switchViewMode('family');
  } else if (mode === 'admin') {
    switchViewMode('admin');
  } else {
    switchViewMode('split');
  }

  initBatteryMonitor();
  fetchNetworkDetails();
  initCanvasLoop();
});

function switchViewMode(mode) {
  const adminSec = document.getElementById('adminSection');
  const familySec = document.getElementById('familySection');
  const grid = document.getElementById('mainGrid');

  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));

  if (mode === 'admin') {
    document.getElementById('btnModeAdmin').classList.add('active');
    adminSec.classList.remove('view-hidden');
    familySec.classList.add('view-hidden');
    grid.style.gridTemplateColumns = '1fr';
  } else if (mode === 'family') {
    document.getElementById('btnModeFamily').classList.add('active');
    adminSec.classList.add('view-hidden');
    familySec.classList.remove('view-hidden');
    grid.style.gridTemplateColumns = '1fr';
  } else {
    document.getElementById('btnModeSplit').classList.add('active');
    adminSec.classList.remove('view-hidden');
    familySec.classList.remove('view-hidden');
    grid.style.gridTemplateColumns = window.innerWidth > 1100 ? '1.45fr 1fr' : '1fr';
  }
}

async function fetchNetworkDetails() {
  try {
    const res = await fetch('/api/network-info');
    const data = await res.json();
    document.getElementById('networkIpLabel').textContent =
      `JioFiber Gateway (${data.primaryIp}:${data.port})`;
    document.getElementById('familyShareUrl').textContent = data.familyUrl;
  } catch (e) {
    console.warn('Network info fetch error:', e);
  }
}

function copyFamilyLink() {
  const url = document.getElementById('familyShareUrl').textContent;
  navigator.clipboard.writeText(url);
  alert(`Link Copy Ho Gaya!\n\n${url}\n\nIs link ko ghar ke WhatsApp par bhej kar khol sakte hain.`);
}

// Battery API integration
async function initBatteryMonitor() {
  if ('getBattery' in navigator) {
    try {
      const bat = await navigator.getBattery();
      const updateBat = () => {
        currentFamilyState.battery = Math.round(bat.level * 100);
        currentFamilyState.charging = bat.charging;
        document.getElementById('familyBatteryTag').textContent =
          `${bat.charging ? '⚡' : '🔋'} ${currentFamilyState.battery}%`;
        familySocket.emit('telemetry-update', {
          battery: currentFamilyState.battery,
          charging: currentFamilyState.charging
        });
      };
      updateBat();
      bat.addEventListener('levelchange', updateBat);
      bat.addEventListener('chargingchange', updateBat);
    } catch (e) {}
  }
}

// =========================================================
// SOCKET.IO CONNECTIONS (ADMIN + FAMILY CLIENT)
// =========================================================

adminSocket.on('connect', () => {
  adminSocket.emit('register-admin');
});

familySocket.on('connect', () => {
  familySocket.emit('register-device', currentFamilyState);
});

adminSocket.on('device-list', (list) => {
  connectedDevices = list;
  document.getElementById('deviceCountBadge').textContent = `${list.length} Online`;
  if (!selectedDeviceId && list.length > 0) {
    selectedDeviceId = list[0].socketId;
  } else if (list.length > 0 && !list.some(d => d.socketId === selectedDeviceId)) {
    selectedDeviceId = list[0].socketId;
  }
  renderDeviceCards();
});

adminSocket.on('video-frame', (data) => {
  if (!selectedDeviceId || data.deviceId === selectedDeviceId) {
    const img = document.getElementById('adminRemoteImg');
    img.src = data.frame;
    const badge = document.getElementById('activeStreamBadge');
    badge.textContent = data.mode === 'camera' ? '📷 LIVE CAMERA' :
                        data.mode === 'screen' ? '🖥️ REAL SCREEN' : '📱 LIVE MIRROR';
  }
});

adminSocket.on('activity-history', (logs) => {
  const container = document.getElementById('activityLogContainer');
  container.innerHTML = '';
  logs.slice(0, 10).forEach(appendLogItem);
});

adminSocket.on('activity-log', (entry) => {
  appendLogItem(entry, true);
});

function appendLogItem(entry, prepend = false) {
  const container = document.getElementById('activityLogContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'log-item';
  div.innerHTML = `<span style="color:#60a5fa; font-weight:700;">[${entry.time}]</span> ${entry.message}`;
  if (prepend && container.firstChild) {
    container.insertBefore(div, container.firstChild);
  } else {
    container.appendChild(div);
  }
}

function renderDeviceCards() {
  const grid = document.getElementById('devicesGrid');
  if (!grid) return;
  if (connectedDevices.length === 0) {
    grid.innerHTML = `<div style="color:#94a3b8; font-size:0.86rem;">No family device connected yet...</div>`;
    return;
  }

  grid.innerHTML = connectedDevices.map(dev => {
    const isSel = dev.socketId === selectedDeviceId;
    const icon = dev.deviceType === 'tv' ? '📺' : '📱';
    return `
      <div class="device-card ${isSel ? 'selected' : ''} ${dev.helpRequested ? 'sos-active' : ''}"
           onclick="selectTargetDevice('${dev.socketId}')">
        <div class="dev-top">
          <span class="dev-name">${icon} ${dev.name}</span>
          <span style="font-size:0.74rem; background:rgba(16,185,129,0.2); color:#34d399; padding:2px 8px; border-radius:99px;">
            ● Online
          </span>
        </div>
        <div class="dev-meta">
          <span>🔋 Battery: <strong>${dev.battery}% ${dev.charging ? '(Charging ⚡)' : ''}</strong></span>
          <span>📶 Network: <strong>${dev.network}</strong></span>
          <span>🎬 Active: <strong style="color:#93c5fd;">${dev.activeApp || 'Home Screen'}</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

function selectTargetDevice(id) {
  selectedDeviceId = id;
  renderDeviceCards();
}

// =========================================================
// ADMIN COMMAND DISPATCHERS
// =========================================================

function sendAdminCmd(action, payload = {}) {
  const targetId = selectedDeviceId || 'all';
  adminSocket.emit('admin-command', { targetId, action, payload });
}

// Admin clicks on live screen stage -> sends Red Laser Pointer to Family phone/TV
function handleAdminStageClick(e) {
  const stage = document.getElementById('adminScreenStage');
  const rect = stage.getBoundingClientRect();
  const xRatio = (e.clientX - rect.left) / rect.width;
  const yRatio = (e.clientY - rect.top) / rect.height;

  // Show feedback circle on Admin view
  const marker = document.createElement('div');
  marker.className = 'admin-click-marker';
  marker.style.left = `${e.clientX - rect.left}px`;
  marker.style.top = `${e.clientY - rect.top}px`;
  stage.appendChild(marker);
  setTimeout(() => marker.remove(), 950);

  sendAdminCmd('laser-pointer', {
    xRatio,
    yRatio,
    label: '👆 Yahan Dabaiye!'
  });
}

function sendVoiceMessage() {
  const input = document.getElementById('ttsInput');
  const text = input.value.trim();
  if (!text) return;
  sendAdminCmd('tts-speak', { text });
}

function quickSpeak(text) {
  document.getElementById('ttsInput').value = text;
  sendAdminCmd('tts-speak', { text });
}

function sendTvKey(key) {
  sendAdminCmd('tv-remote', { key });
}

// =========================================================
// FAMILY / HOME DEVICE COMMAND RECEIVER
// =========================================================

familySocket.on('remote-command', ({ action, payload }) => {
  if (action === 'laser-pointer') {
    showFamilyLaserPointer(payload.xRatio, payload.yRatio, payload.label);
  } else if (action === 'tts-speak') {
    playHindiVoiceAlert(payload.text);
  } else if (action === 'siren') {
    startEmergencySiren(payload.duration || 6000);
  } else if (action === 'stop-siren') {
    stopEmergencySiren();
  } else if (action === 'open-app') {
    handleRemoteOpenApp(payload);
  } else if (action === 'tv-remote') {
    handleRemoteTvKey(payload.key);
  } else if (action === 'request-stream') {
    if (payload.mode === 'screen') startFamilyRealScreenShare();
    else if (payload.mode === 'camera') startFamilyRealCamera();
    else stopFamilyMediaStream();
  }
});

function showFamilyLaserPointer(xRatio, yRatio, label) {
  const surface = document.getElementById('familyScreenSurface');
  const pointer = document.getElementById('familyLaserPointer');
  const labelEl = document.getElementById('familyLaserLabel');

  const w = surface.clientWidth;
  const h = surface.clientHeight;
  const px = Math.max(35, Math.min(w - 35, xRatio * w));
  const py = Math.max(35, Math.min(h - 35, yRatio * h));

  pointer.style.left = `${px}px`;
  pointer.style.top = `${py}px`;
  labelEl.textContent = label || '👆 Yahan Dabaiye!';
  pointer.classList.remove('view-hidden');

  // Also record on canvas so it appears in the stream back to Admin
  currentFamilyState.laser = { x: xRatio * 480, y: yRatio * 360, expires: Date.now() + 4000 };

  // Check if laser pointer tapped an app tile on the simulated screen
  checkCanvasTapAt(xRatio * 480, yRatio * 360);

  clearTimeout(window._laserTimer);
  window._laserTimer = setTimeout(() => {
    pointer.classList.add('view-hidden');
  }, 4000);
}

function playHindiVoiceAlert(text) {
  const banner = document.getElementById('familyVoiceBanner');
  const textEl = document.getElementById('familyVoiceText');
  textEl.textContent = `🗣️ "${text}"`;
  banner.classList.remove('view-hidden');

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';
    utter.rate = 0.95;
    utter.pitch = 1.05;
    window.speechSynthesis.speak(utter);
  }
}

function dismissVoiceBanner() {
  document.getElementById('familyVoiceBanner').classList.add('view-hidden');
}

// Loud Siren using Web Audio API (no external MP3 needed)
function startEmergencySiren(duration = 6000) {
  stopEmergencySiren();
  const frame = document.getElementById('familyPhoneContainer');
  frame.classList.add('siren-flashing');

  if (navigator.vibrate) {
    navigator.vibrate([500, 200, 500, 200, 500]);
  }

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();

    let high = false;
    sirenInterval = setInterval(() => {
      if (!audioCtx) return;
      high = !high;
      osc.frequency.exponentialRampToValueAtTime(high ? 1180 : 680, audioCtx.currentTime + 0.25);
    }, 300);

    window._sirenOsc = osc;
    window._sirenTimeout = setTimeout(() => stopEmergencySiren(), duration);
  } catch (e) {
    console.warn('AudioContext error:', e);
  }
}

function stopEmergencySiren() {
  const frame = document.getElementById('familyPhoneContainer');
  if (frame) frame.classList.remove('siren-flashing');
  clearInterval(sirenInterval);
  clearTimeout(window._sirenTimeout);
  if (window._sirenOsc) {
    try { window._sirenOsc.stop(); } catch (e) {}
    window._sirenOsc = null;
  }
  if (audioCtx) {
    try { audioCtx.close(); } catch (e) {}
    audioCtx = null;
  }
}

function handleRemoteOpenApp(payload) {
  currentFamilyState.activeApp = payload.label || payload.app;
  familySocket.emit('telemetry-update', {
    activeApp: currentFamilyState.activeApp,
    helpRequested: false
  });
  playHindiVoiceAlert(`${payload.label} chalu kar diya gaya hai`);
}

function handleRemoteTvKey(key) {
  currentFamilyState.lastRemoteKey = key;
  if (key === 'RIGHT') {
    currentFamilyState.tvSelectedIndex = (currentFamilyState.tvSelectedIndex + 1) % homeApps.length;
  } else if (key === 'LEFT') {
    currentFamilyState.tvSelectedIndex = (currentFamilyState.tvSelectedIndex - 1 + homeApps.length) % homeApps.length;
  } else if (key === 'DOWN') {
    currentFamilyState.tvSelectedIndex = (currentFamilyState.tvSelectedIndex + 3) % homeApps.length;
  } else if (key === 'UP') {
    currentFamilyState.tvSelectedIndex = (currentFamilyState.tvSelectedIndex - 3 + homeApps.length) % homeApps.length;
  } else if (key === 'OK') {
    const chosen = homeApps[currentFamilyState.tvSelectedIndex];
    currentFamilyState.activeApp = chosen.title;
  } else if (key === 'HOME' || key === 'BACK') {
    currentFamilyState.activeApp = 'Home Screen';
  } else if (key === 'VOL_UP') {
    currentFamilyState.volume = Math.min(100, currentFamilyState.volume + 10);
    currentFamilyState.muted = false;
  } else if (key === 'VOL_DOWN') {
    currentFamilyState.volume = Math.max(0, currentFamilyState.volume - 10);
  } else if (key === 'MUTE') {
    currentFamilyState.muted = !currentFamilyState.muted;
  }

  familySocket.emit('telemetry-update', {
    activeApp: currentFamilyState.activeApp
  });
}

function triggerFamilySOS() {
  currentFamilyState.helpRequested = true;
  familySocket.emit('telemetry-update', {
    helpRequested: true,
    activeApp: '🚨 SOS Help Requested!'
  });
  playHindiVoiceAlert('Madad ka sandesh bhej diya gaya hai. Abhi screen check ho rahi hai.');
}

function changeFamilyDeviceProfile() {
  const val = document.getElementById('familyRoleSelect').value;
  const [name, type] = val.split('|');
  currentFamilyState.name = name;
  currentFamilyState.deviceType = type;
  document.getElementById('familyDeviceTitle').textContent = name;
  familySocket.emit('register-device', currentFamilyState);
}

// =========================================================
// REAL SCREEN SHARE & CAMERA STREAM + INTERACTIVE MIRROR
// =========================================================

async function startFamilyRealScreenShare() {
  try {
    stopFamilyMediaStream();
    mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const video = document.getElementById('familyLocalVideo');
    video.srcObject = mediaStream;
    currentFamilyState.streamMode = 'screen';
    mediaStream.getVideoTracks()[0].onended = () => stopFamilyMediaStream();
  } catch (err) {
    alert('Screen share permission cancel ho gayi ya browser me simulated mirror chalu hai.');
    currentFamilyState.streamMode = 'simulated';
  }
}

async function startFamilyRealCamera() {
  try {
    stopFamilyMediaStream();
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    const video = document.getElementById('familyLocalVideo');
    video.srcObject = mediaStream;
    currentFamilyState.streamMode = 'camera';
  } catch (err) {
    alert('Camera access nahi mila. Simulated Phone/TV view chal raha hai.');
    currentFamilyState.streamMode = 'simulated';
  }
}

function stopFamilyMediaStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  currentFamilyState.streamMode = 'simulated';
}

// Interactive Canvas Renderer & Live Streamer (Streams at ~6 FPS to Admin)
function initCanvasLoop() {
  const canvas = document.getElementById('familyInteractiveCanvas');
  const ctx = canvas.getContext('2d');
  const video = document.getElementById('familyLocalVideo');

  // Allow clicking directly on Family Canvas too
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    checkCanvasTapAt(x, y);
  });

  setInterval(() => {
    drawFamilyScreen(ctx, canvas.width, canvas.height, video);
    // Stream compressed JPEG frame to Admin Dashboard
    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    familySocket.emit('video-frame', {
      frame: dataUrl,
      mode: currentFamilyState.streamMode
    });
  }, 180);
}

function checkCanvasTapAt(x, y) {
  // Check if tap hits any of the 6 app tiles
  const cols = 3;
  const startX = 22, startY = 82, cellW = 140, cellH = 95, gap = 10;
  homeApps.forEach((app, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const bx = startX + col * (cellW + gap);
    const by = startY + row * (cellH + gap);
    if (x >= bx && x <= bx + cellW && y >= by && y <= by + cellH) {
      currentFamilyState.tvSelectedIndex = idx;
      currentFamilyState.activeApp = app.title;
      familySocket.emit('telemetry-update', { activeApp: app.title });
    }
  });
}

function drawFamilyScreen(ctx, w, h, video) {
  // If real camera or screen share is active, draw live video frame first!
  if ((currentFamilyState.streamMode === 'screen' || currentFamilyState.streamMode === 'camera') &&
      video && video.readyState >= 2) {
    ctx.drawImage(video, 0, 0, w, h);
  } else {
    // Draw Interactive Smart Phone / JioTV Home Interface
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Header Bar inside screen
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, w, 58);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px Segoe UI, sans-serif';
    ctx.fillText(`🏠 ${currentFamilyState.name} • ${currentFamilyState.activeApp}`, 16, 26);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText(`JioFiber: Connected (192.168.29.1) | Vol: ${currentFamilyState.muted ? 'MUTE' : currentFamilyState.volume + '%'}`, 16, 46);

    // Draw 6 Interactive App Tiles (3x2 grid)
    const cols = 3;
    const startX = 22, startY = 78, cellW = 140, cellH = 95, gap = 10;

    homeApps.forEach((app, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const bx = startX + col * (cellW + gap);
      const by = startY + row * (cellH + gap);
      const isFocused = idx === currentFamilyState.tvSelectedIndex;

      ctx.fillStyle = app.color;
      ctx.beginPath();
      ctx.roundRect(bx, by, cellW, cellH, 12);
      ctx.fill();

      if (isFocused) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fde047';
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '24px Segoe UI Emoji';
      ctx.fillText(app.icon, bx + 14, by + 36);

      ctx.font = 'bold 14px Segoe UI, sans-serif';
      ctx.fillText(app.title, bx + 14, by + 62);

      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '11px Segoe UI, sans-serif';
      ctx.fillText(app.sub, bx + 14, by + 80);
    });

    // Bottom Active Status Strip
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(16, 292, w - 32, 54);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 292, w - 32, 54);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 13px Segoe UI, sans-serif';
    ctx.fillText(`▶ Running: ${currentFamilyState.activeApp}`, 28, 314);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText(`Last Remote Action: [${currentFamilyState.lastRemoteKey}] • Tap or use Admin Laser Guide`, 28, 334);
  }

  // Draw Laser Pointer on Canvas too so Admin sees exact confirmation
  if (currentFamilyState.laser && Date.now() < currentFamilyState.laser.expires) {
    const { x, y } = currentFamilyState.laser;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ff0000';
    ctx.stroke();
    ctx.restore();
  }
}
