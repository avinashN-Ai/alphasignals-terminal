const axios = require('axios');

const INDIAN_STOCKS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy / Oil & Gas', basePrice: 2980.50 },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT Services', basePrice: 4210.00 },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', sector: 'Banking & Finance', basePrice: 1640.20 },
  { symbol: 'INFY.NS', name: 'Infosys Limited', sector: 'IT Services', basePrice: 1890.75 },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Banking & Finance', basePrice: 1220.40 },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', sector: 'Automobile', basePrice: 965.80 },
  { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Public Bank', basePrice: 785.60 },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom', basePrice: 1560.10 },
  { symbol: 'ITC.NS', name: 'ITC Limited', sector: 'FMCG', basePrice: 512.30 },
  { symbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'Infrastructure', basePrice: 3620.00 },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', sector: 'NBFC', basePrice: 7150.00 },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'FMCG', basePrice: 2680.50 },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma', sector: 'Pharma', basePrice: 1840.00 },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', sector: 'Automobile', basePrice: 12350.00 },
  { symbol: 'TITAN.NS', name: 'Titan Company', sector: 'Consumer Goods', basePrice: 3740.00 },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel', sector: 'Metals', basePrice: 154.20 },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises', sector: 'Conglomerate', basePrice: 3120.00 },
  { symbol: 'ZOMATO.NS', name: 'Zomato Limited', sector: 'Consumer Tech', basePrice: 284.40 }
];

const US_STOCKS = [
  { symbol: 'NVDA', name: 'NVIDIA Corp', sector: 'AI & Chips', basePrice: 124.50 },
  { symbol: 'TSLA', name: 'Tesla Inc', sector: 'EV & Clean Tech', basePrice: 245.80 },
  { symbol: 'AAPL', name: 'Apple Inc', sector: 'Consumer Tech', basePrice: 228.30 },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Cloud & AI', basePrice: 432.10 },
  { symbol: 'GOOGL', name: 'Alphabet Google', sector: 'Tech & Search', basePrice: 165.40 },
  { symbol: 'AMZN', name: 'Amazon.com', sector: 'E-Commerce', basePrice: 188.60 },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Social Media', basePrice: 575.20 }
];

const BINANCE_CRYPTO = [
  { symbol: 'BTCUSDT', name: 'Bitcoin (BTC)', sector: 'Crypto Currency', basePrice: 64500.00 },
  { symbol: 'ETHUSDT', name: 'Ethereum (ETH)', sector: 'Smart Contracts', basePrice: 2650.00 },
  { symbol: 'SOLUSDT', name: 'Solana (SOL)', sector: 'Layer 1 Blockchain', basePrice: 152.00 },
  { symbol: 'BNBUSDT', name: 'BNB (Binance)', sector: 'Exchange Ecosystem', basePrice: 595.00 },
  { symbol: 'XRPUSDT', name: 'Ripple (XRP)', sector: 'Payments', basePrice: 0.58 },
  { symbol: 'DOGEUSDT', name: 'Dogecoin (DOGE)', sector: 'Meme / Community', basePrice: 0.11 },
  { symbol: 'ADAUSDT', name: 'Cardano (ADA)', sector: 'Layer 1 Blockchain', basePrice: 0.36 },
  { symbol: 'AVAXUSDT', name: 'Avalanche (AVAX)', sector: 'DeFi & Scaling', basePrice: 28.50 }
];

// In-memory cache for historical candle data
const candleCache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

/**
 * Generate synthetic candles for offline fallback
 */
function generateSyntheticCandles(basePrice, count = 200) {
  const candles = [];
  let price = basePrice * 0.90;
  const now = new Date();
  const dailyVolatility = 0.022;

  for (let i = count; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const changePct = (Math.random() - 0.485) * dailyVolatility * 2;
    const open = price;
    price = Math.max(0.01, price * (1 + changePct));
    const close = price;
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);
    const volume = Math.floor(100000 + Math.random() * 2000000);

    const dateStr = d.toISOString().split('T')[0];
    candles.push({
      date: dateStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });
  }
  return candles;
}

/**
 * Fetch live candles from Binance API for crypto
 */
async function fetchBinanceCandles(symbol) {
  try {
    const cleanSym = symbol.toUpperCase().replace('-', '').replace('/', '');
    const url = `https://api.binance.com/api/v3/klines?symbol=${cleanSym}&interval=1d&limit=200`;
    const res = await axios.get(url, { timeout: 4000 });

    if (Array.isArray(res.data) && res.data.length > 0) {
      const candles = res.data.map(k => {
        const d = new Date(k[0]);
        return {
          date: d.toISOString().split('T')[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        };
      });

      if (candles.length > 30) {
        candleCache.set(symbol, { timestamp: Date.now(), data: candles });
        return candles;
      }
    }
  } catch (err) {
    console.warn(`[Binance API] Fallback for ${symbol}: ${err.message}`);
  }
  return null;
}

/**
 * Fetch live historical candles
 */
async function fetchCandles(symbol, basePrice = 1000) {
  const cached = candleCache.get(symbol);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  // 1. If it's a crypto symbol, try Binance API first!
  const isCrypto = symbol.endsWith('USDT') || BINANCE_CRYPTO.some(c => c.symbol === symbol);
  if (isCrypto) {
    const binanceCandles = await fetchBinanceCandles(symbol);
    if (binanceCandles) return binanceCandles;
  }

  // 2. Try Yahoo Finance API for Stocks
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
    const response = await axios.get(url, {
      timeout: 4000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const result = response.data?.chart?.result?.[0];
    if (result && result.timestamp && result.indicators?.quote?.[0]) {
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      const opens = quote.open || [];
      const highs = quote.high || [];
      const lows = quote.low || [];
      const closes = quote.close || [];
      const volumes = quote.volume || [];

      const candles = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null && opens[i] !== null && highs[i] !== null && lows[i] !== null) {
          const d = new Date(timestamps[i] * 1000);
          candles.push({
            date: d.toISOString().split('T')[0],
            open: Number(opens[i].toFixed(2)),
            high: Number(highs[i].toFixed(2)),
            low: Number(lows[i].toFixed(2)),
            close: Number(closes[i].toFixed(2)),
            volume: volumes[i] || 100000
          });
        }
      }

      if (candles.length > 30) {
        candleCache.set(symbol, { timestamp: Date.now(), data: candles });
        return candles;
      }
    }
  } catch (err) {
    console.warn(`[StockData] Fallback for ${symbol}: ${err.message}`);
  }

  // 3. Fallback
  const fallback = generateSyntheticCandles(basePrice, 200);
  candleCache.set(symbol, { timestamp: Date.now(), data: fallback });
  return fallback;
}

module.exports = {
  INDIAN_STOCKS,
  US_STOCKS,
  BINANCE_CRYPTO,
  fetchCandles
};
