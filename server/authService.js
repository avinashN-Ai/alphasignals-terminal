const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const SESSION_FILE = path.join(DATA_DIR, 'session.json');

const defaultSession = {
  activeBroker: 'binance', // 'binance' | 'kite'
  autoPilotEnabled: false,
  maxRiskPerTradePct: 2.0,
  defaultProduct: 'CNC',
  binance: {
    name: 'Binance App',
    apiKey: '',
    apiSecret: '',
    connected: false,
    isDemo: false,
    balance: 5000.0, // USDT
    accountInfo: null,
    lastVerified: null
  },
  kite: {
    name: 'Zerodha Kite',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    enctoken: '',
    connected: false,
    isDemo: false,
    balance: 100000.0, // INR
    userName: '',
    userId: '',
    lastVerified: null
  },
  positions: [],
  tradeLogs: []
};

function loadSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      return {
        ...defaultSession,
        ...data,
        binance: { ...defaultSession.binance, ...(data.binance || {}) },
        kite: { ...defaultSession.kite, ...(data.kite || {}) }
      };
    }
  } catch (err) {
    console.error('[AuthService] Error reading session file:', err.message);
  }
  return { ...defaultSession };
}

function saveSession(state) {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('[AuthService] Error saving session file:', err.message);
  }
}

let session = loadSession();

/**
 * Get current persistent session status
 */
function getStatus() {
  return {
    activeBroker: session.activeBroker,
    autoPilotEnabled: session.autoPilotEnabled,
    maxRiskPerTradePct: session.maxRiskPerTradePct,
    defaultProduct: session.defaultProduct,
    binance: {
      name: session.binance.name,
      connected: session.binance.connected,
      isDemo: session.binance.isDemo,
      apiKey: session.binance.apiKey ? '••••••••' + session.binance.apiKey.slice(-4) : '',
      balance: session.binance.balance,
      accountInfo: session.binance.accountInfo,
      lastVerified: session.binance.lastVerified
    },
    kite: {
      name: session.kite.name,
      connected: session.kite.connected,
      isDemo: session.kite.isDemo,
      apiKey: session.kite.apiKey ? '••••••••' + session.kite.apiKey.slice(-4) : '',
      balance: session.kite.balance,
      userName: session.kite.userName,
      userId: session.kite.userId,
      lastVerified: session.kite.lastVerified
    }
  };
}

/**
 * Switch active broker between Binance and Kite
 */
function setActiveBroker(brokerId) {
  if (['binance', 'kite'].includes(brokerId)) {
    session.activeBroker = brokerId;
    saveSession(session);
    addLog(`Switched active broker to: ${brokerId === 'binance' ? 'Binance App' : 'Zerodha Kite'}`, 'INFO');
    return true;
  }
  return false;
}

/**
 * 1. BINANCE LIVE API VERIFICATION & LOGIN
 */
async function verifyAndLoginBinance({ apiKey, apiSecret, useDemo = false }) {
  if (useDemo) {
    session.binance.connected = true;
    session.binance.isDemo = true;
    session.binance.balance = 5000.0;
    session.binance.lastVerified = new Date().toISOString();
    session.binance.accountInfo = {
      accountType: 'DEMO / SANDBOX',
      canTrade: true,
      asset: 'USDT'
    };
    session.activeBroker = 'binance';
    saveSession(session);
    addLog('[Binance] 🟢 Connected via Instant Demo Sandbox ($5,000 USDT ready)', 'INFO');
    return { success: true, isDemo: true, balance: 5000.0 };
  }

  if (!apiKey || !apiSecret) {
    throw new Error('Please enter both Binance API Key and Secret Key');
  }

  try {
    // 1. Get Binance server time to avoid timestamp sync errors
    let serverTime = Date.now();
    try {
      const timeRes = await axios.get('https://api.binance.com/api/v3/time', { timeout: 3000 });
      if (timeRes.data && timeRes.data.serverTime) {
        serverTime = timeRes.data.serverTime;
      }
    } catch (e) {
      // fallback to local time
    }

    const queryString = `timestamp=${serverTime}&recvWindow=10000`;
    const signature = crypto.createHmac('sha256', apiSecret.trim()).update(queryString).digest('hex');

    const res = await axios.get(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
      headers: {
        'X-MBX-APIKEY': apiKey.trim()
      },
      timeout: 6000
    });

    if (res.data) {
      const balances = res.data.balances || [];
      const usdtWallet = balances.find(b => b.asset === 'USDT');
      const btcWallet = balances.find(b => b.asset === 'BTC');
      const usdtBalance = usdtWallet ? parseFloat(usdtWallet.free) : 0;

      session.binance.apiKey = apiKey.trim();
      session.binance.apiSecret = apiSecret.trim();
      session.binance.connected = true;
      session.binance.isDemo = false;
      session.binance.balance = usdtBalance;
      session.binance.lastVerified = new Date().toISOString();
      session.binance.accountInfo = {
        makerCommission: res.data.makerCommission,
        takerCommission: res.data.takerCommission,
        canTrade: res.data.canTrade,
        usdtFree: usdtBalance,
        btcFree: btcWallet ? btcWallet.free : '0'
      };
      session.activeBroker = 'binance';

      saveSession(session);
      addLog(`[Binance] 🟢 Logged in successfully! Verified Balance: $${usdtBalance.toFixed(2)} USDT`, 'INFO');

      return {
        success: true,
        isDemo: false,
        balance: usdtBalance,
        canTrade: res.data.canTrade
      };
    }
  } catch (err) {
    const errorMsg = err.response?.data?.msg || err.message;
    console.error('[Binance Auth Failed]:', errorMsg);
    throw new Error(`Binance Login Failed: ${errorMsg}`);
  }
}

/**
 * 2. ZERODHA KITE LOGIN & VERIFICATION
 */
async function verifyAndLoginKite({ apiKey, apiSecret, enctoken, useDemo = false }) {
  if (useDemo) {
    session.kite.connected = true;
    session.kite.isDemo = true;
    session.kite.balance = 100000.0;
    session.kite.userName = 'Demo Trader (NSE)';
    session.kite.userId = 'DEMO123';
    session.kite.lastVerified = new Date().toISOString();
    session.activeBroker = 'kite';
    saveSession(session);
    addLog('[Zerodha Kite] 🟢 Connected via Instant Demo Sandbox (₹1,00,000 ready)', 'INFO');
    return { success: true, isDemo: true, balance: 100000.0 };
  }

  // Option A: Direct Enctoken login (Free web session)
  if (enctoken) {
    try {
      const res = await axios.get('https://kite.zerodha.com/oms/user/margins', {
        headers: {
          'Authorization': `enctoken ${enctoken.trim()}`
        },
        timeout: 6000
      });

      if (res.data && res.data.status === 'success') {
        const cashMargin = res.data.data?.equity?.available?.cash || 50000.0;
        session.kite.enctoken = enctoken.trim();
        session.kite.connected = true;
        session.kite.isDemo = false;
        session.kite.balance = cashMargin;
        session.kite.lastVerified = new Date().toISOString();
        session.activeBroker = 'kite';

        // Try getting user profile
        try {
          const profileRes = await axios.get('https://kite.zerodha.com/oms/user/profile', {
            headers: { 'Authorization': `enctoken ${enctoken.trim()}` },
            timeout: 3000
          });
          if (profileRes.data?.data) {
            session.kite.userName = profileRes.data.data.user_name || 'Zerodha User';
            session.kite.userId = profileRes.data.data.user_id || 'Kite Client';
          }
        } catch (e) {}

        saveSession(session);
        addLog(`[Zerodha Kite] 🟢 Logged in via Enctoken! Verified Cash: ₹${cashMargin.toLocaleString('en-IN')}`, 'INFO');
        return { success: true, balance: cashMargin, userName: session.kite.userName };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      throw new Error(`Kite Enctoken verification failed: ${errMsg}`);
    }
  }

  // Option B: API Key + Access Token (Kite Connect v3)
  if (apiKey && session.kite.accessToken) {
    try {
      const res = await axios.get('https://api.kite.trade/user/margins', {
        headers: {
          'X-Kite-Version': '3',
          'Authorization': `token ${apiKey.trim()}:${session.kite.accessToken.trim()}`
        },
        timeout: 6000
      });

      if (res.data && res.data.status === 'success') {
        const cash = res.data.data?.equity?.available?.cash || 0;
        session.kite.apiKey = apiKey.trim();
        if (apiSecret) session.kite.apiSecret = apiSecret.trim();
        session.kite.connected = true;
        session.kite.isDemo = false;
        session.kite.balance = cash;
        session.kite.lastVerified = new Date().toISOString();
        session.activeBroker = 'kite';

        saveSession(session);
        addLog(`[Zerodha Kite] 🟢 Kite Connect token verified! Available Cash: ₹${cash.toLocaleString('en-IN')}`, 'INFO');
        return { success: true, balance: cash };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      throw new Error(`Kite Connect verification failed: ${errMsg}`);
    }
  }

  throw new Error('Please enter either Kite Enctoken or connect via Kite Connect API Key & Secret');
}

/**
 * Handle Kite Connect OAuth Callback (exchange request_token for access_token)
 */
async function handleKiteOAuthCallback(requestToken) {
  const { apiKey, apiSecret } = session.kite;
  if (!apiKey || !apiSecret) {
    throw new Error('Kite API Key and API Secret are required to complete OAuth login.');
  }

  try {
    const checksum = crypto.createHash('sha256').update(apiKey + requestToken + apiSecret).digest('hex');
    const params = new URLSearchParams();
    params.append('api_key', apiKey);
    params.append('request_token', requestToken);
    params.append('checksum', checksum);

    const res = await axios.post('https://api.kite.trade/session/token', params, {
      headers: {
        'X-Kite-Version': '3'
      }
    });

    if (res.data?.data?.access_token) {
      const token = res.data.data.access_token;
      session.kite.accessToken = token;
      session.kite.userName = res.data.data.user_name || 'Zerodha User';
      session.kite.userId = res.data.data.user_id || '';
      session.kite.connected = true;
      session.kite.isDemo = false;
      session.kite.lastVerified = new Date().toISOString();
      session.activeBroker = 'kite';

      // Fetch live margins
      try {
        const marginRes = await axios.get('https://api.kite.trade/user/margins', {
          headers: {
            'X-Kite-Version': '3',
            'Authorization': `token ${apiKey}:${token}`
          }
        });
        if (marginRes.data?.data?.equity?.available?.cash) {
          session.kite.balance = marginRes.data.data.equity.available.cash;
        }
      } catch (e) {}

      saveSession(session);
      addLog(`[Zerodha Kite] 🟢 OAuth Login Successful! Welcome ${session.kite.userName}`, 'INFO');
      return { success: true, userName: session.kite.userName, balance: session.kite.balance };
    }
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    throw new Error(`Kite OAuth Exchange Failed: ${errMsg}`);
  }
}

/**
 * Disconnect a broker
 */
function disconnectBroker(brokerId) {
  if (brokerId === 'binance') {
    session.binance.connected = false;
    session.binance.accountInfo = null;
  } else if (brokerId === 'kite') {
    session.kite.connected = false;
    session.kite.accessToken = '';
    session.kite.enctoken = '';
  }
  saveSession(session);
  addLog(`Disconnected from ${brokerId === 'binance' ? 'Binance' : 'Zerodha Kite'}`, 'INFO');
  return getStatus();
}

/**
 * Execution Logs
 */
function addLog(message, type = 'INFO', details = {}) {
  const logItem = {
    id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    time: new Date().toLocaleTimeString(),
    date: new Date().toISOString().split('T')[0],
    message,
    type,
    details
  };
  session.tradeLogs.unshift(logItem);
  if (session.tradeLogs.length > 100) session.tradeLogs = session.tradeLogs.slice(0, 100);
  saveSession(session);
  return logItem;
}

function getPositions() {
  return session.positions;
}

function getLogs() {
  return session.tradeLogs;
}

/**
 * Unified Buy Order Execution
 */
async function placeBuyOrder({ symbol, cleanSymbol, price, quantity, target, stopLoss, signalConfidence }) {
  const isCrypto = symbol.endsWith('USDT') || symbol.endsWith('BTC') || symbol.endsWith('ETH');
  const isIndian = symbol.endsWith('.NS') || symbol.endsWith('.BO');
  const currentBroker = isCrypto ? 'binance' : (isIndian ? 'kite' : session.activeBroker);
  const entryPrice = Number(price);
  const qty = Number(quantity) || 1;
  const currencySymbol = isCrypto ? '$' : '₹';
  const requiredAmount = entryPrice * qty;

  // 1. BINANCE TRADING
  if (currentBroker === 'binance') {
    const binanceState = session.binance;
    if (!binanceState.connected) {
      throw new Error('Binance is not logged in. Please connect Binance App first.');
    }

    // Live Binance API execution
    if (!binanceState.isDemo && binanceState.apiKey && binanceState.apiSecret) {
      try {
        const cleanCryptoSym = (cleanSymbol || symbol).replace(/[^A-Z0-9]/g, '');
        let serverTime = Date.now();
        try {
          const timeRes = await axios.get('https://api.binance.com/api/v3/time', { timeout: 2000 });
          if (timeRes.data?.serverTime) serverTime = timeRes.data.serverTime;
        } catch (e) {}

        const queryString = `symbol=${cleanCryptoSym}&side=BUY&type=MARKET&quantity=${qty}&timestamp=${serverTime}&recvWindow=10000`;
        const signature = crypto.createHmac('sha256', binanceState.apiSecret).update(queryString).digest('hex');

        const res = await axios.post(`https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`, null, {
          headers: { 'X-MBX-APIKEY': binanceState.apiKey }
        });

        const orderId = res.data?.orderId || 'binance-' + Date.now();

        const newPosition = {
          id: String(orderId),
          broker: 'binance',
          symbol,
          cleanSymbol: cleanCryptoSym,
          type: 'BUY',
          quantity: qty,
          entryPrice,
          currentPrice: entryPrice,
          target: Number(target),
          stopLoss: Number(stopLoss),
          pnl: 0,
          pnlPct: 0,
          currency: '$',
          entryTime: new Date().toLocaleTimeString(),
          entryDate: new Date().toISOString().split('T')[0],
          status: 'OPEN',
          signalConfidence: signalConfidence || 75
        };

        // Register Exchange-level OCO Order directly on Binance Cloud Servers
        // (Active 24/7 even if PC is completely powered OFF)
        try {
          const ocoQuery = `symbol=${cleanCryptoSym}&side=SELL&quantity=${qty}&price=${Number(target).toFixed(2)}&stopPrice=${Number(stopLoss).toFixed(2)}&stopLimitPrice=${(Number(stopLoss) * 0.995).toFixed(2)}&stopLimitTimeInForce=GTC&timestamp=${Date.now()}&recvWindow=10000`;
          const ocoSig = crypto.createHmac('sha256', binanceState.apiSecret).update(ocoQuery).digest('hex');
          const ocoRes = await axios.post(`https://api.binance.com/api/v3/order/oco?${ocoQuery}&signature=${ocoSig}`, null, {
            headers: { 'X-MBX-APIKEY': binanceState.apiKey },
            timeout: 4000
          });
          if (ocoRes.data?.orderListId) {
            newPosition.cloudProtected = true;
            newPosition.exchangeOrderId = ocoRes.data.orderListId;
            addLog(`[Binance Cloud OCO] 🛡️ Target $${target} & Stop $${stopLoss} registered on Binance Exchange (Active when PC is OFF)`, 'INFO');
          }
        } catch (ocoErr) {
          console.log('[Binance OCO fallback to daemon]:', ocoErr.response?.data?.msg || ocoErr.message);
        }

        session.positions.unshift(newPosition);
        saveSession(session);
        addLog(`[Binance Live] 🟢 BUY ${qty}x ${cleanCryptoSym} @ $${entryPrice} (Order ID: ${orderId})`, 'BUY');
        return newPosition;
      } catch (err) {
        const errMsg = err.response?.data?.msg || err.message;
        addLog(`[Binance Error] ${errMsg}`, 'ERROR');
        throw new Error(`Binance Order Failed: ${errMsg}`);
      }
    } else {
      // Demo Mode
      if (session.binance.balance < requiredAmount) {
        throw new Error(`Insufficient Binance balance (Need: $${requiredAmount.toFixed(2)}, Available: $${session.binance.balance.toFixed(2)})`);
      }
      session.binance.balance -= requiredAmount;

      const newPosition = {
        id: 'binance-pos-' + Date.now(),
        broker: 'binance',
        symbol,
        cleanSymbol: cleanSymbol || symbol,
        type: 'BUY',
        quantity: qty,
        entryPrice,
        currentPrice: entryPrice,
        target: Number(target),
        stopLoss: Number(stopLoss),
        pnl: 0,
        pnlPct: 0,
        currency: '$',
        entryTime: new Date().toLocaleTimeString(),
        entryDate: new Date().toISOString().split('T')[0],
        status: 'OPEN',
        signalConfidence: signalConfidence || 75
      };

      session.positions.unshift(newPosition);
      saveSession(session);
      addLog(`[Binance App] 🟢 BUY ${qty}x ${newPosition.cleanSymbol} @ $${entryPrice} (Auto-Exit Active: Target $${target}, Stop $${stopLoss})`, 'BUY', newPosition);
      return newPosition;
    }
  }

  // 2. ZERODHA KITE TRADING
  if (currentBroker === 'kite') {
    const kiteState = session.kite;
    if (!kiteState.connected) {
      throw new Error('Zerodha Kite is not logged in. Please connect Kite App first.');
    }

    // Live Kite execution
    if (!kiteState.isDemo && kiteState.enctoken) {
      try {
        const params = new URLSearchParams();
        params.append('tradingsymbol', cleanSymbol || symbol.replace('.NS', ''));
        params.append('exchange', 'NSE');
        params.append('transaction_type', 'BUY');
        params.append('order_type', 'MARKET');
        params.append('quantity', qty.toString());
        params.append('product', session.defaultProduct === 'CNC' ? 'CNC' : 'MIS');
        params.append('validity', 'DAY');
        params.append('tag', 'alphasignals');

        const res = await axios.post('https://kite.zerodha.com/oms/orders/regular', params, {
          headers: { 'Authorization': `enctoken ${kiteState.enctoken}` }
        });

        const orderId = res.data?.data?.order_id || 'kite-' + Date.now();

        const newPosition = {
          id: String(orderId),
          broker: 'kite',
          symbol,
          cleanSymbol: cleanSymbol || symbol.replace('.NS', ''),
          type: 'BUY',
          quantity: qty,
          entryPrice,
          currentPrice: entryPrice,
          target: Number(target),
          stopLoss: Number(stopLoss),
          pnl: 0,
          pnlPct: 0,
          currency: '₹',
          entryTime: new Date().toLocaleTimeString(),
          entryDate: new Date().toISOString().split('T')[0],
          status: 'OPEN',
          signalConfidence: signalConfidence || 75
        };

        // Register Exchange-level GTT Order directly on Zerodha Cloud Servers
        // (Active 24/7 on NSE even if PC is completely powered OFF)
        try {
          const gttPayload = new URLSearchParams();
          gttPayload.append('type', 'two-leg');
          gttPayload.append('condition', JSON.stringify({
            exchange: 'NSE',
            tradingsymbol: cleanSymbol || symbol.replace('.NS', ''),
            trigger_values: [Number(stopLoss), Number(target)],
            last_price: entryPrice
          }));
          gttPayload.append('orders', JSON.stringify([
            {
              transaction_type: 'SELL',
              quantity: qty,
              order_type: 'LIMIT',
              product: 'CNC',
              price: Number(stopLoss)
            },
            {
              transaction_type: 'SELL',
              quantity: qty,
              order_type: 'LIMIT',
              product: 'CNC',
              price: Number(target)
            }
          ]));

          const gttRes = await axios.post('https://kite.zerodha.com/oms/gtt/triggers', gttPayload, {
            headers: { 'Authorization': `enctoken ${kiteState.enctoken}` },
            timeout: 4000
          });
          if (gttRes.data?.data?.trigger_id) {
            newPosition.cloudProtected = true;
            newPosition.gttTriggerId = gttRes.data.data.trigger_id;
            addLog(`[Zerodha Cloud GTT] 🛡️ Target ₹${target} & Stop ₹${stopLoss} registered on Zerodha Servers (Active when PC is OFF)`, 'INFO');
          }
        } catch (gttErr) {
          console.log('[Kite GTT fallback to daemon]:', gttErr.response?.data?.message || gttErr.message);
        }

        session.positions.unshift(newPosition);
        saveSession(session);
        addLog(`[Zerodha Kite] 🟢 BUY ${qty}x ${newPosition.cleanSymbol} @ ₹${entryPrice} (Order ID: ${orderId})`, 'BUY');
        return newPosition;
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message;
        addLog(`[Kite Error] ${errMsg}`, 'ERROR');
        throw new Error(`Zerodha Order Failed: ${errMsg}`);
      }
    } else {
      // Kite Demo Mode
      if (session.kite.balance < requiredAmount) {
        throw new Error(`Insufficient Kite balance (Need: ₹${requiredAmount.toFixed(2)}, Available: ₹${session.kite.balance.toFixed(2)})`);
      }
      session.kite.balance -= requiredAmount;

      const newPosition = {
        id: 'kite-pos-' + Date.now(),
        broker: 'kite',
        symbol,
        cleanSymbol: cleanSymbol || symbol.replace('.NS', ''),
        type: 'BUY',
        quantity: qty,
        entryPrice,
        currentPrice: entryPrice,
        target: Number(target),
        stopLoss: Number(stopLoss),
        pnl: 0,
        pnlPct: 0,
        currency: '₹',
        entryTime: new Date().toLocaleTimeString(),
        entryDate: new Date().toISOString().split('T')[0],
        status: 'OPEN',
        signalConfidence: signalConfidence || 75
      };

      session.positions.unshift(newPosition);
      saveSession(session);
      addLog(`[Zerodha Kite] 🟢 BUY ${qty}x ${newPosition.cleanSymbol} @ ₹${entryPrice} (Auto-Exit Active: Target ₹${target}, Stop ₹${stopLoss})`, 'BUY', newPosition);
      return newPosition;
    }
  }

  throw new Error(`Unknown broker: ${currentBroker}`);
}

/**
 * Square-off / Exit position
 */
async function squareOffPosition(positionId, exitReason = 'MANUAL_EXIT', exitPrice = null) {
  const posIndex = session.positions.findIndex(p => p.id === positionId && p.status === 'OPEN');
  if (posIndex === -1) {
    throw new Error('Active position not found');
  }

  const pos = session.positions[posIndex];
  const finalPrice = exitPrice ? Number(exitPrice) : pos.currentPrice;
  const pnl = Number(((finalPrice - pos.entryPrice) * pos.quantity).toFixed(2));
  const pnlPct = Number((((finalPrice - pos.entryPrice) / pos.entryPrice) * 100).toFixed(2));
  const isWin = pnl >= 0;
  const curr = pos.currency || '₹';

  // Credit balance back
  if (pos.broker === 'binance' && session.binance.isDemo) {
    session.binance.balance += (pos.entryPrice * pos.quantity) + pnl;
  } else if (pos.broker === 'kite' && session.kite.isDemo) {
    session.kite.balance += (pos.entryPrice * pos.quantity) + pnl;
  }

  pos.status = 'CLOSED';
  pos.exitPrice = finalPrice;
  pos.exitTime = new Date().toLocaleTimeString();
  pos.exitDate = new Date().toISOString().split('T')[0];
  pos.exitReason = exitReason;
  pos.pnl = pnl;
  pos.pnlPct = pnlPct;

  saveSession(session);

  const emoji = isWin ? '🎯' : '🛑';
  const logType = isWin ? 'EXIT_PROFIT' : 'EXIT_STOPLOSS';
  const reasonText = exitReason === 'TARGET_HIT' ? 'Target Hit (Profit Booked)'
    : exitReason === 'STOP_LOSS_HIT' ? 'Stop-Loss Hit (Capital Protected)'
    : exitReason === 'REVERSAL_EXIT' ? 'Trend Reversal Signal'
    : 'Manual Square-Off';

  addLog(
    `[${pos.broker.toUpperCase()}] ${emoji} AUTO-EXIT: ${pos.cleanSymbol} closed @ ${curr}${finalPrice} (${isWin ? '+' : ''}${curr}${pnl} / ${pnlPct}%) • ${reasonText}`,
    logType,
    pos
  );

  return pos;
}

module.exports = {
  getStatus,
  setActiveBroker,
  verifyAndLoginBinance,
  verifyAndLoginKite,
  handleKiteOAuthCallback,
  disconnectBroker,
  getPositions,
  getLogs,
  placeBuyOrder,
  squareOffPosition,
  addLog
};
