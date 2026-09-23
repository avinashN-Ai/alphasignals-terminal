// Technical Indicators and Confluence Signal Calculation Engine

/**
 * Calculate Simple Moving Average (SMA)
 */
function calculateSMA(data, period) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      sma.push(Number((sum / period).toFixed(2)));
    }
  }
  return sma;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
function calculateEMA(data, period) {
  const ema = [];
  const k = 2 / (period + 1);
  let prevEma = null;

  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (val === null || val === undefined) {
      ema.push(null);
      continue;
    }

    if (i < period - 1) {
      ema.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[j];
      }
      prevEma = sum / period;
      ema.push(Number(prevEma.toFixed(2)));
    } else {
      prevEma = val * k + prevEma * (1 - k);
      ema.push(Number(prevEma.toFixed(2)));
    }
  }
  return ema;
}

/**
 * Calculate Relative Strength Index (RSI - 14)
 */
function calculateRSI(closes, period = 14) {
  const rsi = [];
  let gains = [];
  let losses = [];

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      rsi.push(null);
      continue;
    }

    const change = closes[i] - closes[i - 1];
    gains.push(Math.max(0, change));
    losses.push(Math.max(0, -change));

    if (i < period) {
      rsi.push(null);
    } else if (i === period) {
      let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      
      let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      let rsiVal = 100 - (100 / (1 + rs));
      rsi.push(Number(rsiVal.toFixed(2)));
    } else {
      let prevGain = gains.slice(i - period, i - 1).reduce((a, b) => a + b, 0) / (period - 1);
      let prevLoss = losses.slice(i - period, i - 1).reduce((a, b) => a + b, 0) / (period - 1);

      let currentGain = gains[gains.length - 1];
      let currentLoss = losses[losses.length - 1];

      let smoothedGain = (prevGain * (period - 1) + currentGain) / period;
      let smoothedLoss = (prevLoss * (period - 1) + currentLoss) / period;

      let rs = smoothedLoss === 0 ? 100 : smoothedGain / smoothedLoss;
      let rsiVal = 100 - (100 / (1 + rs));
      rsi.push(Number(Math.max(0, Math.min(100, rsiVal)).toFixed(2)));
    }
  }
  return rsi;
}

/**
 * Calculate MACD (12, 26, 9)
 */
function calculateMACD(closes) {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  const macdLine = [];
  for (let i = 0; i < closes.length; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      macdLine.push(Number((ema12[i] - ema26[i]).toFixed(2)));
    } else {
      macdLine.push(null);
    }
  }

  // Filter valid items for signal line EMA
  const validMacdLine = [];
  const offset = macdLine.findIndex(v => v !== null);

  for (let i = offset; i < macdLine.length; i++) {
    validMacdLine.push(macdLine[i]);
  }

  const signalSub = calculateEMA(validMacdLine, 9);
  const signalLine = new Array(offset).fill(null);
  for (let i = 0; i < signalSub.length; i++) {
    signalLine.push(signalSub[i]);
  }

  const histogram = [];
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram.push(Number((macdLine[i] - signalLine[i]).toFixed(2)));
    } else {
      histogram.push(null);
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Calculate Bollinger Bands (20, 2)
 */
function calculateBollingerBands(closes, period = 20, multiplier = 2) {
  const middle = calculateSMA(closes, period);
  const upper = [];
  const lower = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      let sumSqDiff = 0;
      const mean = middle[i];
      for (let j = 0; j < period; j++) {
        sumSqDiff += Math.pow(closes[i - j] - mean, 2);
      }
      const stdDev = Math.sqrt(sumSqDiff / period);
      upper.push(Number((mean + multiplier * stdDev).toFixed(2)));
      lower.push(Number((mean - multiplier * stdDev).toFixed(2)));
    }
  }

  return { upper, middle, lower };
}

/**
 * Calculate ATR (Average True Range)
 */
function calculateATR(candles, period = 14) {
  const tr = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      const val = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      tr.push(val);
    }
  }

  return calculateSMA(tr, period);
}

/**
 * Calculate Supertrend (10, 3)
 */
function calculateSupertrend(candles, period = 10, multiplier = 3) {
  const atr = calculateATR(candles, period);
  const supertrend = [];
  const direction = []; // 1 for Bullish (Green), -1 for Bearish (Red)

  let prevUpper = 0;
  let prevLower = 0;
  let prevTrend = 1;

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1 || atr[i] === null) {
      supertrend.push(null);
      direction.push(null);
      continue;
    }

    const hl2 = (candles[i].high + candles[i].low) / 2;
    let basicUpper = hl2 + multiplier * atr[i];
    let basicLower = hl2 - multiplier * atr[i];

    let finalUpper = basicUpper;
    let finalLower = basicLower;

    if (i > period - 1) {
      finalUpper = (basicUpper < prevUpper || candles[i - 1].close > prevUpper) ? basicUpper : prevUpper;
      finalLower = (basicLower > prevLower || candles[i - 1].close < prevLower) ? basicLower : prevLower;
    }

    let currentTrend = prevTrend;
    if (prevTrend === 1 && candles[i].close < finalLower) {
      currentTrend = -1;
    } else if (prevTrend === -1 && candles[i].close > finalUpper) {
      currentTrend = 1;
    }

    prevUpper = finalUpper;
    prevLower = finalLower;
    prevTrend = currentTrend;

    supertrend.push(Number((currentTrend === 1 ? finalLower : finalUpper).toFixed(2)));
    direction.push(currentTrend);
  }

  return { supertrend, direction };
}

/**
 * Confluence Signal Engine
 * Analyzes multiple indicators together to generate reliable Buy/Sell signals with confidence score.
 */
function evaluateConfluence(candles, index = candles.length - 1) {
  const closes = candles.map(c => c.close);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const bb = calculateBollingerBands(closes, 20, 2);
  const st = calculateSupertrend(candles, 10, 3);
  const volumes = candles.map(c => c.volume);
  const volSma = calculateSMA(volumes, 20);

  const idx = Math.min(index, candles.length - 1);
  const currentClose = closes[idx];
  const currentRsi = rsi[idx] ?? 50;
  const currentEma20 = ema20[idx] ?? currentClose;
  const currentEma50 = ema50[idx] ?? currentClose;
  const currentEma200 = ema200[idx] ?? currentClose;
  const currentMacd = macd.macdLine[idx] ?? 0;
  const currentSignal = macd.signalLine[idx] ?? 0;
  const currentHist = macd.histogram[idx] ?? 0;
  const prevHist = macd.histogram[idx - 1] ?? currentHist;
  const currentSTDir = st.direction[idx] ?? 1;
  const currentVol = volumes[idx] ?? 0;
  const avgVol = volSma[idx] ?? currentVol;

  let bullishPoints = 0;
  let bearishPoints = 0;
  const factors = [];

  // 1. Moving Average Confluence
  if (currentClose > currentEma20 && currentEma20 > currentEma50) {
    bullishPoints += 2.0;
    factors.push({ name: 'EMA Alignment', status: 'BULLISH', note: 'Price > EMA 20 > EMA 50' });
  } else if (currentClose < currentEma20 && currentEma20 < currentEma50) {
    bearishPoints += 2.0;
    factors.push({ name: 'EMA Alignment', status: 'BEARISH', note: 'Price < EMA 20 < EMA 50' });
  } else {
    factors.push({ name: 'EMA Alignment', status: 'NEUTRAL', note: 'Moving averages converging' });
  }

  // 2. Long term trend (200 EMA)
  if (currentEma200 && currentClose > currentEma200) {
    bullishPoints += 1.5;
    factors.push({ name: '200 EMA Trend', status: 'BULLISH', note: 'Trading above 200 EMA (Macro Bullish)' });
  } else if (currentEma200 && currentClose < currentEma200) {
    bearishPoints += 1.5;
    factors.push({ name: '200 EMA Trend', status: 'BEARISH', note: 'Trading below 200 EMA (Macro Bearish)' });
  }

  // 3. RSI Momentum
  if (currentRsi >= 45 && currentRsi <= 68) {
    bullishPoints += 1.5;
    factors.push({ name: 'RSI Momentum', status: 'BULLISH', note: `RSI at ${currentRsi} (Healthy Bullish Zone)` });
  } else if (currentRsi < 32) {
    bullishPoints += 1.5;
    factors.push({ name: 'RSI Oversold', status: 'BULLISH', note: `RSI at ${currentRsi} (Oversold Bounce Zone)` });
  } else if (currentRsi > 75) {
    bearishPoints += 1.5;
    factors.push({ name: 'RSI Overbought', status: 'BEARISH', note: `RSI at ${currentRsi} (Overheated / Pullback Risk)` });
  } else if (currentRsi < 45) {
    bearishPoints += 1.0;
    factors.push({ name: 'RSI Momentum', status: 'BEARISH', note: `RSI at ${currentRsi} (Weak Momentum)` });
  }

  // 4. MACD Status
  if (currentMacd > currentSignal && currentHist > 0) {
    bullishPoints += 2.0;
    factors.push({ name: 'MACD', status: 'BULLISH', note: currentHist > prevHist ? 'MACD Crossover with Expanding Momentum' : 'MACD above Signal' });
  } else if (currentMacd < currentSignal && currentHist < 0) {
    bearishPoints += 2.0;
    factors.push({ name: 'MACD', status: 'BEARISH', note: currentHist < prevHist ? 'MACD Bearish Crossover Expanding' : 'MACD below Signal' });
  } else {
    factors.push({ name: 'MACD', status: 'NEUTRAL', note: 'MACD Signal Flat' });
  }

  // 5. Supertrend Direction
  if (currentSTDir === 1) {
    bullishPoints += 2.0;
    factors.push({ name: 'Supertrend (10,3)', status: 'BULLISH', note: 'Supertrend is Bullish (Green)' });
  } else {
    bearishPoints += 2.0;
    factors.push({ name: 'Supertrend (10,3)', status: 'BEARISH', note: 'Supertrend is Bearish (Red)' });
  }

  // 6. Volume Confirmation
  if (currentVol > avgVol * 1.15) {
    if (bullishPoints > bearishPoints) bullishPoints += 1.0;
    else if (bearishPoints > bullishPoints) bearishPoints += 1.0;
    factors.push({ name: 'Volume Spike', status: 'ACTIVE', note: 'Volume 15%+ above 20-day Average' });
  }

  const netScore = bullishPoints - bearishPoints;
  const maxPoints = 10.0;
  let signal = 'NEUTRAL';
  let confidence = 50;

  if (netScore >= 5.0) {
    signal = 'STRONG BUY';
    confidence = Math.min(95, Math.round(75 + (netScore / maxPoints) * 20));
  } else if (netScore >= 2.0) {
    signal = 'BUY';
    confidence = Math.min(78, Math.round(60 + (netScore / maxPoints) * 18));
  } else if (netScore <= -5.0) {
    signal = 'STRONG SELL';
    confidence = Math.min(95, Math.round(75 + (Math.abs(netScore) / maxPoints) * 20));
  } else if (netScore <= -2.0) {
    signal = 'SELL';
    confidence = Math.min(78, Math.round(60 + (Math.abs(netScore) / maxPoints) * 18));
  } else {
    signal = 'NEUTRAL';
    confidence = 50 + Math.round(Math.abs(netScore) * 5);
  }

  // Compute recommended trade levels (Target & Stop Loss)
  const atrVal = calculateATR(candles, 14)[idx] || (currentClose * 0.02);
  let stopLoss = 0;
  let target1 = 0;
  let target2 = 0;

  if (signal.includes('BUY')) {
    stopLoss = Number((currentClose - 1.5 * atrVal).toFixed(2));
    target1 = Number((currentClose + 2.0 * atrVal).toFixed(2));
    target2 = Number((currentClose + 3.5 * atrVal).toFixed(2));
  } else if (signal.includes('SELL')) {
    stopLoss = Number((currentClose + 1.5 * atrVal).toFixed(2));
    target1 = Number((currentClose - 2.0 * atrVal).toFixed(2));
    target2 = Number((currentClose - 3.5 * atrVal).toFixed(2));
  } else {
    stopLoss = Number((currentClose * 0.97).toFixed(2));
    target1 = Number((currentClose * 1.04).toFixed(2));
    target2 = Number((currentClose * 1.07).toFixed(2));
  }

  const risk = Math.abs(currentClose - stopLoss);
  const reward = Math.abs(target1 - currentClose);
  const riskReward = risk > 0 ? Number((reward / risk).toFixed(2)) : 1.5;

  return {
    signal,
    confidence,
    netScore,
    currentClose,
    rsi: currentRsi,
    macd: currentMacd,
    macdSignal: currentSignal,
    macdHist: currentHist,
    ema20: currentEma20,
    ema50: currentEma50,
    ema200: currentEma200,
    supertrend: st.supertrend[idx],
    supertrendDirection: currentSTDir,
    upperBand: bb.upper[idx],
    lowerBand: bb.lower[idx],
    factors,
    tradeSetup: {
      entry: currentClose,
      stopLoss,
      target1,
      target2,
      riskRewardRatio: `1:${riskReward}`,
      potentialGainPct: Number(((Math.abs(target1 - currentClose) / currentClose) * 100).toFixed(2)),
      potentialRiskPct: Number(((Math.abs(stopLoss - currentClose) / currentClose) * 100).toFixed(2))
    }
  };
}

module.exports = {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateSupertrend,
  evaluateConfluence
};
