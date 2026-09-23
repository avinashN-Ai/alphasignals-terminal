const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const CONFIG_FILE = path.join(__dirname, 'brokerConfig.json');

const defaultState = {
  activeBroker: 'paper', // 'paper' | 'zerodha' | 'upstox' | 'dhan' | 'binance'
  autoPilotEnabled: false,
  maxRiskPerTradePct: 2.0,
  defaultProduct: 'CNC',
  brokers: {
    paper: {
      name: 'Paper Trading (Virtual ₹1,00,000)',
      connected: true,
      balance: 100000.0,
      initialBalance: 100000.0
    },
    zerodha: {
      name: 'Zerodha (Kite Connect)',
      apiKey: '',
      apiSecret: '',
      accessToken: '',
      connected: false,
      balance: 0
    },
    upstox: {
      name: 'Upstox (API v2)',
      apiKey: '',
      apiSecret: '',
      redirectUri: 'http://localhost:5000/api/brokers/upstox/callback',
      accessToken: '',
      connected: false,
      balance: 0
    },
    dhan: {
      name: 'Dhan (DhanHQ API)',
      clientId: '',
      accessToken: '',
      connected: false,
      balance: 0
    },
    binance: {
      name: 'Binance (Crypto & International)',
      apiKey: '',
      apiSecret: '',
      connected: false,
      balance: 5000.0 // 5000 USDT
    }
  },
  positions: [],
  tradeLogs: []
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { 
        ...defaultState, 
        ...data, 
        brokers: { ...defaultState.brokers, ...(data.brokers || {}) } 
      };
    }
  } catch (e) {
    console.error('Error reading broker config:', e);
  }
  return { ...defaultState };
}

function saveConfig(state) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving broker config:', e);
  }
}

let state = loadConfig();

function getBrokerStatus() {
  return {
    activeBroker: state.activeBroker,
    autoPilotEnabled: state.autoPilotEnabled,
    maxRiskPerTradePct: state.maxRiskPerTradePct,
    defaultProduct: state.defaultProduct,
    brokers: {
      paper: {
        name: state.brokers.paper.name,
        connected: true,
        balance: state.brokers.paper.balance
      },
      zerodha: {
        name: state.brokers.zerodha.name,
        connected: Boolean(state.brokers.zerodha.connected || state.brokers.zerodha.accessToken),
        apiKey: state.brokers.zerodha.apiKey ? '••••••••' + state.brokers.zerodha.apiKey.slice(-4) : '',
        balance: state.brokers.zerodha.balance
      },
      upstox: {
        name: state.brokers.upstox.name,
        connected: Boolean(state.brokers.upstox.connected || state.brokers.upstox.accessToken),
        apiKey: state.brokers.upstox.apiKey ? '••••••••' + state.brokers.upstox.apiKey.slice(-4) : '',
        balance: state.brokers.upstox.balance
      },
      dhan: {
        name: state.brokers.dhan.name,
        connected: Boolean(state.brokers.dhan.connected || state.brokers.dhan.accessToken),
        clientId: state.brokers.dhan.clientId ? '••••' + state.brokers.dhan.clientId.slice(-4) : '',
        balance: state.brokers.dhan.balance
      },
      binance: {
        name: state.brokers.binance?.name || 'Binance App',
        connected: Boolean(state.brokers.binance?.connected || state.brokers.binance?.apiKey),
        apiKey: state.brokers.binance?.apiKey ? '••••••••' + state.brokers.binance.apiKey.slice(-4) : '',
        balance: state.brokers.binance?.balance || 5000
      }
    }
  };
}

function setActiveBroker(brokerId) {
  if (['paper', 'zerodha', 'upstox', 'dhan', 'binance'].includes(brokerId)) {
    state.activeBroker = brokerId;
    saveConfig(state);
    addLog(`Switched active broker to: ${state.brokers[brokerId]?.name || brokerId}`, 'INFO');
    return true;
  }
  return false;
}

function updateConfig(update) {
  if (update.activeBroker) state.activeBroker = update.activeBroker;
  if (update.autoPilotEnabled !== undefined) state.autoPilotEnabled = Boolean(update.autoPilotEnabled);
  if (update.maxRiskPerTradePct !== undefined) state.maxRiskPerTradePct = Number(update.maxRiskPerTradePct);
  if (update.defaultProduct) state.defaultProduct = update.defaultProduct;

  if (update.zerodha) {
    state.brokers.zerodha = { ...state.brokers.zerodha, ...update.zerodha };
    if (update.zerodha.connected !== undefined) state.brokers.zerodha.connected = Boolean(update.zerodha.connected);
    else if (update.zerodha.accessToken) state.brokers.zerodha.connected = true;
  }
  if (update.upstox) {
    state.brokers.upstox = { ...state.brokers.upstox, ...update.upstox };
    if (update.upstox.connected !== undefined) state.brokers.upstox.connected = Boolean(update.upstox.connected);
    else if (update.upstox.accessToken) state.brokers.upstox.connected = true;
  }
  if (update.dhan) {
    state.brokers.dhan = { ...state.brokers.dhan, ...update.dhan };
    if (update.dhan.connected !== undefined) state.brokers.dhan.connected = Boolean(update.dhan.connected);
    else if (update.dhan.accessToken) state.brokers.dhan.connected = true;
  }
  if (update.binance) {
    state.brokers.binance = { ...(state.brokers.binance || {}), ...update.binance };
    if (update.binance.connected !== undefined) state.brokers.binance.connected = Boolean(update.binance.connected);
    else if (update.binance.apiKey) state.brokers.binance.connected = true;
  }

  saveConfig(state);
  return getBrokerStatus();
}

function addLog(message, type = 'INFO', details = {}) {
  const logItem = {
    id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    time: new Date().toLocaleTimeString(),
    date: new Date().toISOString().split('T')[0],
    message,
    type,
    details
  };
  state.tradeLogs.unshift(logItem);
  if (state.tradeLogs.length > 100) state.tradeLogs = state.tradeLogs.slice(0, 100);
  saveConfig(state);
  return logItem;
}

function getPositions() {
  return state.positions;
}

function getLogs() {
  return state.tradeLogs;
}

async function placeBuyOrder({ symbol, cleanSymbol, price, quantity, target, stopLoss, signalConfidence }) {
  const currentBroker = state.activeBroker;
  const entryPrice = Number(price);
  const qty = Number(quantity) || 1;
  const isCrypto = symbol.endsWith('USDT') || currentBroker === 'binance';
  const currencySymbol = isCrypto ? '$' : '₹';
  const requiredAmount = entryPrice * qty;

  // 1. PAPER TRADING
  if (currentBroker === 'paper') {
    if (state.brokers.paper.balance < requiredAmount) {
      throw new Error(`Insufficient virtual funds (Need: ${currencySymbol}${requiredAmount.toFixed(2)}, Balance: ${currencySymbol}${state.brokers.paper.balance.toFixed(2)})`);
    }

    state.brokers.paper.balance -= requiredAmount;

    const newPosition = {
      id: 'pos-' + Date.now(),
      broker: 'paper',
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
      currency: currencySymbol,
      entryTime: new Date().toLocaleTimeString(),
      entryDate: new Date().toISOString().split('T')[0],
      status: 'OPEN',
      signalConfidence: signalConfidence || 75
    };

    state.positions.unshift(newPosition);
    saveConfig(state);

    addLog(
      `[Paper Trading] 🟢 BUY ${qty}x ${newPosition.cleanSymbol} @ ${currencySymbol}${entryPrice} (Target: ${currencySymbol}${target}, Stop: ${currencySymbol}${stopLoss})`,
      'BUY',
      newPosition
    );

    return newPosition;
  }

  // 2. BINANCE TRADING
  if (currentBroker === 'binance') {
    const binanceConfig = state.brokers.binance;
    const cleanCryptoSym = (cleanSymbol || symbol).replace(/[^A-Z0-9]/g, '');

    // If user provided live API credentials, send request to Binance
    if (binanceConfig?.apiKey && binanceConfig?.apiSecret) {
      try {
        const timestamp = Date.now();
        const queryString = `symbol=${cleanCryptoSym}&side=BUY&type=MARKET&quantity=${qty}&timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', binanceConfig.apiSecret).update(queryString).digest('hex');

        const res = await axios.post(`https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`, null, {
          headers: { 'X-MBX-APIKEY': binanceConfig.apiKey }
        });

        const binanceOrderId = res.data?.orderId || 'binance-' + Date.now();

        const newPosition = {
          id: String(binanceOrderId),
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

        state.positions.unshift(newPosition);
        saveConfig(state);
        addLog(`[Binance Live] 🟢 BUY ${qty}x ${cleanCryptoSym} @ $${entryPrice} (Order ID: ${binanceOrderId})`, 'BUY');
        return newPosition;
      } catch (err) {
        const errMsg = err.response?.data?.msg || err.message;
        addLog(`[Binance Error] ${errMsg}`, 'ERROR');
        throw new Error(`Binance Order Failed: ${errMsg}`);
      }
    } else {
      // Binance Sandbox Mode (Virtual 5000 USDT)
      if (state.brokers.binance.balance < requiredAmount) {
        throw new Error(`Insufficient Binance Sandbox Balance (Need: $${requiredAmount.toFixed(2)}, Available: $${state.brokers.binance.balance.toFixed(2)})`);
      }
      state.brokers.binance.balance -= requiredAmount;

      const newPosition = {
        id: 'binance-sim-' + Date.now(),
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

      state.positions.unshift(newPosition);
      saveConfig(state);

      addLog(`[Binance App] 🟢 BUY ${qty}x ${cleanCryptoSym} @ $${entryPrice} (Auto-Exit Active: Target $${target}, Stop $${stopLoss})`, 'BUY', newPosition);
      return newPosition;
    }
  }

  // 3. UPSTOX API v2
  if (currentBroker === 'upstox') {
    const upstoxConfig = state.brokers.upstox;
    if (!upstoxConfig.accessToken) {
      throw new Error('Upstox is not connected. Enter your Upstox Access Token.');
    }

    try {
      const orderPayload = {
        quantity: qty,
        product: state.defaultProduct === 'CNC' ? 'D' : 'I',
        validity: 'DAY',
        price: 0,
        tag: 'AlphaSignals',
        instrument_token: symbol,
        order_type: 'MARKET',
        transaction_type: 'BUY',
        disclosed_quantity: 0,
        trigger_price: 0,
        is_amo: false
      };

      const res = await axios.post('https://api.upstox.com/v2/order/place', orderPayload, {
        headers: {
          'Authorization': `Bearer ${upstoxConfig.accessToken}`,
          'Accept': 'application/json'
        }
      });

      const upstoxOrderId = res.data?.data?.order_id || 'upstox-' + Date.now();

      const newPosition = {
        id: upstoxOrderId,
        broker: 'upstox',
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

      state.positions.unshift(newPosition);
      saveConfig(state);

      addLog(`[Upstox Live] 🟢 BUY Order: ${qty}x ${newPosition.cleanSymbol}`, 'BUY');
      return newPosition;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      addLog(`[Upstox Error] ${errMsg}`, 'ERROR');
      throw new Error(`Upstox Order Failed: ${errMsg}`);
    }
  }

  // 4. ZERODHA KITE CONNECT
  if (currentBroker === 'zerodha') {
    const kiteConfig = state.brokers.zerodha;
    if (!kiteConfig.accessToken || !kiteConfig.apiKey) {
      throw new Error('Zerodha Kite is not connected.');
    }

    try {
      const params = new URLSearchParams();
      params.append('tradingsymbol', cleanSymbol || symbol.replace('.NS', ''));
      params.append('exchange', 'NSE');
      params.append('transaction_type', 'BUY');
      params.append('order_type', 'MARKET');
      params.append('quantity', qty.toString());
      params.append('product', state.defaultProduct === 'CNC' ? 'CNC' : 'MIS');
      params.append('validity', 'DAY');
      params.append('tag', 'alphasignals');

      const res = await axios.post('https://api.kite.trade/orders/regular', params, {
        headers: {
          'X-Kite-Version': '3',
          'Authorization': `token ${kiteConfig.apiKey}:${kiteConfig.accessToken}`
        }
      });

      const kiteOrderId = res.data?.data?.order_id || 'kite-' + Date.now();

      const newPosition = {
        id: kiteOrderId,
        broker: 'zerodha',
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

      state.positions.unshift(newPosition);
      saveConfig(state);

      addLog(`[Zerodha Kite] 🟢 BUY Order: ${qty}x ${newPosition.cleanSymbol}`, 'BUY');
      return newPosition;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      addLog(`[Zerodha Error] ${errMsg}`, 'ERROR');
      throw new Error(`Zerodha Kite Failed: ${errMsg}`);
    }
  }

  // 5. DHAN
  if (currentBroker === 'dhan') {
    const dhanConfig = state.brokers.dhan;
    if (!dhanConfig.accessToken || !dhanConfig.clientId) {
      throw new Error('Dhan is not connected.');
    }

    try {
      const orderPayload = {
        dhanClientId: dhanConfig.clientId,
        transactionType: 'BUY',
        exchangeSegment: 'NSE_EQ',
        productType: state.defaultProduct === 'CNC' ? 'CNC' : 'INTRADAY',
        orderType: 'MARKET',
        validity: 'DAY',
        securityId: cleanSymbol || symbol.replace('.NS', ''),
        quantity: qty,
        price: 0
      };

      const res = await axios.post('https://api.dhan.co/v2/orders', orderPayload, {
        headers: {
          'access-token': dhanConfig.accessToken,
          'client-id': dhanConfig.clientId,
          'Content-Type': 'application/json'
        }
      });

      const dhanOrderId = res.data?.orderId || 'dhan-' + Date.now();

      const newPosition = {
        id: dhanOrderId,
        broker: 'dhan',
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

      state.positions.unshift(newPosition);
      saveConfig(state);

      addLog(`[Dhan Live] 🟢 BUY Order: ${qty}x ${newPosition.cleanSymbol}`, 'BUY');
      return newPosition;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      addLog(`[Dhan Error] ${errMsg}`, 'ERROR');
      throw new Error(`Dhan Order Failed: ${errMsg}`);
    }
  }

  throw new Error(`Unknown broker: ${currentBroker}`);
}

async function squareOffPosition(positionId, exitReason = 'MANUAL_EXIT', exitPrice = null) {
  const posIndex = state.positions.findIndex(p => p.id === positionId && p.status === 'OPEN');
  if (posIndex === -1) {
    throw new Error('Active position not found');
  }

  const pos = state.positions[posIndex];
  const finalPrice = exitPrice ? Number(exitPrice) : pos.currentPrice;
  const pnl = Number(((finalPrice - pos.entryPrice) * pos.quantity).toFixed(2));
  const pnlPct = Number((((finalPrice - pos.entryPrice) / pos.entryPrice) * 100).toFixed(2));
  const isWin = pnl >= 0;
  const curr = pos.currency || '₹';

  if (pos.broker === 'paper') {
    state.brokers.paper.balance += (pos.entryPrice * pos.quantity) + pnl;
  } else if (pos.broker === 'binance' && !state.brokers.binance?.apiKey) {
    state.brokers.binance.balance += (pos.entryPrice * pos.quantity) + pnl;
  }

  pos.status = 'CLOSED';
  pos.exitPrice = finalPrice;
  pos.exitTime = new Date().toLocaleTimeString();
  pos.exitDate = new Date().toISOString().split('T')[0];
  pos.exitReason = exitReason;
  pos.pnl = pnl;
  pos.pnlPct = pnlPct;

  saveConfig(state);

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

function resetPaperBalance() {
  state.brokers.paper.balance = state.brokers.paper.initialBalance;
  if (state.brokers.binance) state.brokers.binance.balance = 5000.0;
  saveConfig(state);
  addLog('[Wallet Reset] Virtual balances restored.', 'INFO');
  return state.brokers.paper.balance;
}

module.exports = {
  getBrokerStatus,
  setActiveBroker,
  updateConfig,
  getPositions,
  getLogs,
  placeBuyOrder,
  squareOffPosition,
  resetPaperBalance,
  addLog
};
