const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { INDIAN_STOCKS, US_STOCKS, BINANCE_CRYPTO, fetchCandles } = require('./stocksData');
const { evaluateConfluence, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateSupertrend } = require('./indicators');
const { runBacktest } = require('./backtester');
const {
  getStatus,
  setActiveBroker,
  verifyAndLoginBinance,
  verifyAndLoginKite,
  handleKiteOAuthCallback,
  disconnectBroker,
  getPositions,
  getLogs,
  placeBuyOrder,
  squareOffPosition
} = require('./authService');
const { startAutoExitEngine } = require('./autoExitEngine');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let screenerCache = {
  timestamp: 0,
  data: []
};
const SCREENER_CACHE_TTL = 3 * 60 * 1000;

async function analyzeStock(item) {
  const candles = await fetchCandles(item.symbol, item.basePrice);
  if (!candles || candles.length < 2) {
    return null;
  }

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const currentPrice = lastCandle.close;
  const change = Number((currentPrice - prevCandle.close).toFixed(2));
  const changePct = Number(((change / prevCandle.close) * 100).toFixed(2));

  const confluence = evaluateConfluence(candles);

  const backtest = runBacktest(candles, {
    targetPct: 4.0,
    stopLossPct: 2.5,
    maxHoldingDays: 15,
    minConfidence: 60,
    direction: 'BUY_ONLY',
    useAtr: true
  });

  const isCrypto = item.symbol.endsWith('USDT') || BINANCE_CRYPTO.some(c => c.symbol === item.symbol);
  const isIndian = item.symbol.endsWith('.NS') || item.symbol.endsWith('.BO');

  return {
    symbol: item.symbol,
    cleanSymbol: item.symbol.replace('.NS', '').replace('.BO', ''),
    name: item.name,
    sector: item.sector,
    currency: isCrypto ? '$' : (isIndian ? '₹' : '$'),
    market: isCrypto ? 'CRYPTO' : (isIndian ? 'IN' : 'US'),
    price: currentPrice,
    change,
    changePct,
    high: lastCandle.high,
    low: lastCandle.low,
    volume: lastCandle.volume,
    signal: confluence.signal,
    confidence: confluence.confidence,
    rsi: confluence.rsi,
    macd: confluence.macd,
    supertrend: confluence.supertrend,
    supertrendDirection: confluence.supertrendDirection,
    tradeSetup: confluence.tradeSetup,
    accuracy: {
      winRate: backtest.winRate,
      totalTrades: backtest.totalTrades,
      wins: backtest.wins,
      losses: backtest.losses,
      profitFactor: backtest.profitFactor,
      avgReturnPct: backtest.avgReturnPct
    }
  };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

app.get('/api/market-summary', async (req, res) => {
  try {
    const screener = await getOrComputeScreener();

    const strongBuys = screener.filter(s => s.signal === 'STRONG BUY').length;
    const buys = screener.filter(s => s.signal === 'BUY').length;
    const neutrals = screener.filter(s => s.signal === 'NEUTRAL').length;
    const sells = screener.filter(s => s.signal === 'SELL' || s.signal === 'STRONG SELL').length;

    const avgAccuracy = screener.length > 0
      ? Number((screener.reduce((acc, s) => acc + s.accuracy.winRate, 0) / screener.length).toFixed(1))
      : 72.5;

    res.json({
      totalTracked: screener.length,
      marketSentiment: strongBuys + buys > sells ? 'BULLISH' : (sells > strongBuys + buys ? 'BEARISH' : 'NEUTRAL'),
      sentimentScore: Math.round(((strongBuys + buys) / Math.max(1, screener.length)) * 100),
      strongBuys,
      buys,
      neutrals,
      sells,
      avgAccuracy,
      topOpportunities: screener
        .filter(s => s.signal.includes('BUY') && s.accuracy.winRate >= 50)
        .sort((a, b) => b.accuracy.winRate - a.accuracy.winRate)
        .slice(0, 6)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function getOrComputeScreener() {
  if (screenerCache.data.length > 0 && (Date.now() - screenerCache.timestamp < SCREENER_CACHE_TTL)) {
    return screenerCache.data;
  }

  const allItems = [...INDIAN_STOCKS, ...US_STOCKS, ...BINANCE_CRYPTO];
  const promises = allItems.map(item => analyzeStock(item));
  const results = await Promise.all(promises);
  const valid = results.filter(r => r !== null);

  screenerCache = {
    timestamp: Date.now(),
    data: valid
  };

  return valid;
}

app.get('/api/stocks', async (req, res) => {
  try {
    const market = req.query.market || 'ALL';
    const screener = await getOrComputeScreener();

    let filtered = screener;
    if (market === 'IN') {
      filtered = screener.filter(s => s.market === 'IN');
    } else if (market === 'US') {
      filtered = screener.filter(s => s.market === 'US');
    } else if (market === 'CRYPTO') {
      filtered = screener.filter(s => s.market === 'CRYPTO');
    }

    res.json({
      count: filtered.length,
      timestamp: screenerCache.timestamp,
      stocks: filtered
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const allItems = [...INDIAN_STOCKS, ...US_STOCKS, ...BINANCE_CRYPTO];
    let matched = allItems.find(s => s.symbol === symbol || s.symbol.replace('.NS', '') === symbol);

    const basePrice = matched ? matched.basePrice : 1000;
    const name = matched ? matched.name : symbol;
    const sector = matched ? matched.sector : 'General Market';

    const candles = await fetchCandles(symbol, basePrice);
    if (!candles || candles.length === 0) {
      return res.status(404).json({ error: 'Candle data not found for ticker' });
    }

    const closes = candles.map(c => c.close);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes, 20, 2);
    const st = calculateSupertrend(candles, 10, 3);

    const confluence = evaluateConfluence(candles);
    const backtest = runBacktest(candles, {
      targetPct: 4.0,
      stopLossPct: 2.5,
      maxHoldingDays: 15,
      minConfidence: 60,
      direction: 'BUY_ONLY',
      useAtr: true
    });

    const isCrypto = symbol.endsWith('USDT') || BINANCE_CRYPTO.some(c => c.symbol === symbol);
    const isIndian = symbol.endsWith('.NS');
    const currency = isCrypto ? '$' : (isIndian ? '₹' : '$');

    const signalHindi = confluence.signal === 'STRONG BUY' ? 'मजबूत खरीदारी (Strong Buy)'
      : confluence.signal === 'BUY' ? 'खरीदारी (Buy)'
      : confluence.signal === 'NEUTRAL' ? 'तटस्थ / होल्ड (Hold)'
      : confluence.signal === 'SELL' ? 'बिकवाली (Sell)'
      : 'मजबूत बिकवाली (Strong Sell)';

    const insightHindi = `यह अभी ${signalHindi} ज़ोन में है (Confidence: ${confluence.confidence}%)। ऐतिहासिक एक्यूरेसी (Win Rate) ${backtest.winRate}% रही है पिछले ${backtest.totalTrades} ट्रेड्स में। सुझाया गया स्टॉप-लॉस ${currency}${confluence.tradeSetup.stopLoss} और पहला टार्गेट ${currency}${confluence.tradeSetup.target1} है।`;

    res.json({
      symbol,
      cleanSymbol: symbol.replace('.NS', '').replace('.BO', ''),
      name,
      sector,
      currency,
      market: isCrypto ? 'CRYPTO' : (isIndian ? 'IN' : 'US'),
      confluence,
      backtest,
      insightHindi,
      candles: candles.map(c => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume
      })),
      indicators: {
        ema20: candles.map((c, i) => ({ time: c.date, value: ema20[i] })).filter(d => d.value !== null),
        ema50: candles.map((c, i) => ({ time: c.date, value: ema50[i] })).filter(d => d.value !== null),
        supertrend: candles.map((c, i) => ({ time: c.date, value: st.supertrend[i] })).filter(d => d.value !== null),
        rsi: candles.map((c, i) => ({ time: c.date, value: rsi[i] })).filter(d => d.value !== null),
        macd: candles.map((c, i) => ({
          time: c.date,
          macd: macd.macdLine[i],
          signal: macd.signalLine[i],
          hist: macd.histogram[i]
        })).filter(d => d.macd !== null)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backtest', async (req, res) => {
  try {
    const {
      symbol = 'BTCUSDT',
      targetPct = 4.0,
      stopLossPct = 2.5,
      maxHoldingDays = 15,
      minConfidence = 60,
      direction = 'BUY_ONLY',
      useAtr = true
    } = req.body;

    const allItems = [...INDIAN_STOCKS, ...US_STOCKS, ...BINANCE_CRYPTO];
    let matched = allItems.find(s => s.symbol === symbol);
    const basePrice = matched ? matched.basePrice : 1000;

    const candles = await fetchCandles(symbol, basePrice);
    const backtestResult = runBacktest(candles, {
      targetPct: Number(targetPct),
      stopLossPct: Number(stopLossPct),
      maxHoldingDays: Number(maxHoldingDays),
      minConfidence: Number(minConfidence),
      direction,
      useAtr
    });

    res.json({
      symbol,
      ...backtestResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const query = (req.query.q || '').toUpperCase().trim();
    if (!query) return res.json([]);

    const screener = screenerCache.data.length > 0 ? screenerCache.data : await getOrComputeScreener();
    const matches = screener.filter(s =>
      s.symbol.toUpperCase().includes(query) ||
      s.cleanSymbol.toUpperCase().includes(query) ||
      s.name.toUpperCase().includes(query) ||
      s.sector.toUpperCase().includes(query)
    );

    // If user searches for any custom ticker not in the default 33 list, offer both NSE & Binance options
    if (query.length >= 2) {
      const cleanQ = query.replace('.NS', '').replace('USDT', '');
      const hasExactNSE = matches.some(m => m.cleanSymbol === cleanQ && m.market === 'IN');
      const hasExactCrypto = matches.some(m => m.cleanSymbol === `${cleanQ}USDT` || m.symbol === `${cleanQ}USDT`);

      if (!hasExactCrypto && !query.includes('.')) {
        matches.push({
          symbol: `${cleanQ}USDT`,
          cleanSymbol: `${cleanQ}USDT`,
          name: `${cleanQ} / USDT (Binance Live Crypto)`,
          sector: 'Binance Crypto',
          currency: '$',
          market: 'CRYPTO',
          price: 10,
          signal: 'BUY',
          confidence: 75
        });
      }

      if (!hasExactNSE) {
        matches.push({
          symbol: `${cleanQ}.NS`,
          cleanSymbol: cleanQ,
          name: `${cleanQ} (NSE India - Zerodha Kite)`,
          sector: 'NSE Equity',
          currency: '₹',
          market: 'IN',
          price: 500,
          signal: 'BUY',
          confidence: 75
        });
      }
    }

    res.json(matches.slice(0, 12));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 🚀 DEDICATED AUTH & TRADING: BINANCE & ZERODHA KITE
// ==========================================

// Get session status
app.get('/api/auth/status', (req, res) => {
  res.json(getStatus());
});
app.get('/api/brokers/status', (req, res) => {
  res.json(getStatus());
});

// Switch active broker
app.post('/api/auth/select', (req, res) => {
  const { brokerId } = req.body;
  const success = setActiveBroker(brokerId);
  res.json({ success, status: getStatus() });
});
app.post('/api/brokers/select', (req, res) => {
  const { brokerId } = req.body;
  const success = setActiveBroker(brokerId);
  res.json({ success, status: getStatus() });
});

// Binance Login & Verification
app.post('/api/auth/binance/login', async (req, res) => {
  try {
    const { apiKey, apiSecret, useDemo } = req.body;
    const result = await verifyAndLoginBinance({ apiKey, apiSecret, useDemo });
    res.json({ success: true, result, status: getStatus() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Zerodha Kite Login & Verification
app.post('/api/auth/kite/login', async (req, res) => {
  try {
    const { apiKey, apiSecret, enctoken, useDemo } = req.body;
    const result = await verifyAndLoginKite({ apiKey, apiSecret, enctoken, useDemo });
    res.json({ success: true, result, status: getStatus() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Kite OAuth Callback handler
app.get('/api/auth/kite/callback', async (req, res) => {
  try {
    const requestToken = req.query.request_token;
    if (!requestToken) {
      return res.redirect('/?kite_error=missing_request_token');
    }
    await handleKiteOAuthCallback(requestToken);
    res.redirect('/?kite_auth=success');
  } catch (err) {
    console.error('Kite OAuth error:', err.message);
    res.redirect(`/?kite_error=${encodeURIComponent(err.message)}`);
  }
});

// Disconnect Broker
app.post('/api/auth/disconnect', (req, res) => {
  const { brokerId } = req.body;
  const updated = disconnectBroker(brokerId);
  res.json({ success: true, status: updated });
});

// Positions endpoint
app.get('/api/auth/positions', (req, res) => {
  res.json({
    positions: getPositions(),
    activeCount: getPositions().filter(p => p.status === 'OPEN').length
  });
});
app.get('/api/brokers/positions', (req, res) => {
  res.json({
    positions: getPositions(),
    activeCount: getPositions().filter(p => p.status === 'OPEN').length
  });
});

// Order execution
app.post('/api/auth/order', async (req, res) => {
  try {
    const { symbol, cleanSymbol, price, quantity, target, stopLoss, signalConfidence } = req.body;
    const position = await placeBuyOrder({
      symbol,
      cleanSymbol,
      price,
      quantity,
      target,
      stopLoss,
      signalConfidence
    });
    res.json({ success: true, position });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.post('/api/brokers/order', async (req, res) => {
  try {
    const { symbol, cleanSymbol, price, quantity, target, stopLoss, signalConfidence } = req.body;
    const position = await placeBuyOrder({
      symbol,
      cleanSymbol,
      price,
      quantity,
      target,
      stopLoss,
      signalConfidence
    });
    res.json({ success: true, position });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Square off
app.post('/api/auth/square-off', async (req, res) => {
  try {
    const { positionId } = req.body;
    const closed = await squareOffPosition(positionId, 'MANUAL_EXIT');
    res.json({ success: true, closed });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.post('/api/brokers/square-off', async (req, res) => {
  try {
    const { positionId } = req.body;
    const closed = await squareOffPosition(positionId, 'MANUAL_EXIT');
    res.json({ success: true, closed });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Logs endpoint
app.get('/api/auth/logs', (req, res) => {
  res.json(getLogs());
});
app.get('/api/brokers/logs', (req, res) => {
  res.json(getLogs());
});

const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start continuous 4-second auto-exit monitor
startAutoExitEngine();

app.listen(PORT, () => {
  console.log(`[Server] AlphaSignals Terminal (Binance & Kite) running permanently on port ${PORT}`);
});
