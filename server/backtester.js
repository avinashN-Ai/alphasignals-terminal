const { evaluateConfluence, calculateATR } = require('./indicators');

/**
 * Backtest Engine for Stock Signals
 * Evaluates real historical Win Rate / Accuracy % across daily candles
 */
function runBacktest(candles, options = {}) {
  const {
    targetPct = 4.0,       // User target % or ATR multiplier
    stopLossPct = 2.5,     // User stop loss %
    maxHoldingDays = 15,   // Maximum candles to hold trade
    minConfidence = 60,    // Minimum confluence confidence
    direction = 'BUY_ONLY', // 'BUY_ONLY' | 'BOTH'
    useAtr = true          // Whether to adapt targets to volatility
  } = options;

  if (!candles || candles.length < 50) {
    return {
      winRate: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      profitFactor: 1,
      avgReturnPct: 0,
      maxDrawdownPct: 0,
      trades: [],
      chartMarkers: []
    };
  }

  const atrs = calculateATR(candles, 14);
  const trades = [];
  const chartMarkers = [];
  let inTrade = false;
  let currentTrade = null;
  let prevSignal = 'NEUTRAL';

  const startIndex = 40;

  for (let i = startIndex; i < candles.length - 1; i++) {
    const candle = candles[i];
    const atr = atrs[i] || (candle.close * 0.025);

    // If currently in a trade, evaluate exit
    if (inTrade && currentTrade) {
      const daysInTrade = i - currentTrade.entryIndex;
      const high = candle.high;
      const low = candle.low;
      const close = candle.close;
      let exitTriggered = false;
      let exitPrice = close;
      let exitReason = 'TIME_EXIT';

      const tradeTargetPct = useAtr ? ((currentTrade.atr * 1.6) / currentTrade.entryPrice) * 100 : targetPct;
      const tradeStopPct = useAtr ? ((currentTrade.atr * 1.3) / currentTrade.entryPrice) * 100 : stopLossPct;

      if (currentTrade.type === 'BUY') {
        const targetPrice = currentTrade.entryPrice * (1 + tradeTargetPct / 100);
        const stopPrice = currentTrade.entryPrice * (1 - tradeStopPct / 100);

        if (high >= targetPrice) {
          exitPrice = targetPrice;
          exitReason = 'TARGET_HIT';
          exitTriggered = true;
        } else if (low <= stopPrice) {
          exitPrice = stopPrice;
          exitReason = 'STOP_LOSS_HIT';
          exitTriggered = true;
        } else if (daysInTrade >= maxHoldingDays) {
          exitPrice = close;
          exitReason = 'MAX_HOLDING';
          exitTriggered = true;
        }
      } else if (currentTrade.type === 'SELL') {
        const targetPrice = currentTrade.entryPrice * (1 - tradeTargetPct / 100);
        const stopPrice = currentTrade.entryPrice * (1 + tradeStopPct / 100);

        if (low <= targetPrice) {
          exitPrice = targetPrice;
          exitReason = 'TARGET_HIT';
          exitTriggered = true;
        } else if (high >= stopPrice) {
          exitPrice = stopPrice;
          exitReason = 'STOP_LOSS_HIT';
          exitTriggered = true;
        } else if (daysInTrade >= maxHoldingDays) {
          exitPrice = close;
          exitReason = 'MAX_HOLDING';
          exitTriggered = true;
        }
      }

      if (exitTriggered) {
        const pnlPct = currentTrade.type === 'BUY'
          ? ((exitPrice - currentTrade.entryPrice) / currentTrade.entryPrice) * 100
          : ((currentTrade.entryPrice - exitPrice) / currentTrade.entryPrice) * 100;

        const isWin = pnlPct > 0;

        currentTrade.exitDate = candle.date;
        currentTrade.exitPrice = Number(exitPrice.toFixed(2));
        currentTrade.exitReason = exitReason;
        currentTrade.pnlPct = Number(pnlPct.toFixed(2));
        currentTrade.isWin = isWin;
        currentTrade.holdingDays = daysInTrade;

        trades.push(currentTrade);

        // Chart marker
        chartMarkers.push({
          time: currentTrade.entryDate,
          position: currentTrade.type === 'BUY' ? 'belowBar' : 'aboveBar',
          color: isWin ? '#10B981' : '#EF4444',
          shape: currentTrade.type === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: `${currentTrade.type} (${isWin ? '+' : ''}${pnlPct.toFixed(1)}%)`,
          id: `trade-${trades.length}`
        });

        inTrade = false;
        currentTrade = null;
      }
      continue;
    }

    // Evaluate entry signal
    const historicalSlice = candles.slice(0, i + 1);
    const analysis = evaluateConfluence(historicalSlice, i);
    const currentSignal = analysis.signal;

    // Trigger on fresh signal crossover from non-buy/sell to active signal
    let signalType = null;
    if (currentSignal.includes('BUY') && !prevSignal.includes('BUY') && analysis.confidence >= minConfidence) {
      signalType = 'BUY';
    } else if (currentSignal.includes('SELL') && !prevSignal.includes('SELL') && analysis.confidence >= minConfidence) {
      if (direction === 'BOTH' || direction === 'SELL_ONLY') {
        signalType = 'SELL';
      }
    }

    prevSignal = currentSignal;

    if (signalType) {
      inTrade = true;
      currentTrade = {
        id: trades.length + 1,
        entryIndex: i,
        entryDate: candle.date,
        entryPrice: candle.close,
        atr: atr,
        type: signalType,
        confidence: analysis.confidence,
        signalDetails: currentSignal
      };
    }
  }

  // Calculate statistics
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.isWin).length;
  const losses = totalTrades - wins;
  const winRate = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(1)) : 0;

  const totalGain = trades.filter(t => t.isWin).reduce((sum, t) => sum + t.pnlPct, 0);
  const totalLoss = Math.abs(trades.filter(t => !t.isWin).reduce((sum, t) => sum + t.pnlPct, 0));
  const profitFactor = totalLoss === 0 ? (totalGain > 0 ? 9.99 : 1.0) : Number((totalGain / totalLoss).toFixed(2));

  const totalPnl = trades.reduce((sum, t) => sum + t.pnlPct, 0);
  const avgReturnPct = totalTrades > 0 ? Number((totalPnl / totalTrades).toFixed(2)) : 0;

  let peak = 0;
  let runningPnl = 0;
  let maxDrawdown = 0;

  for (const t of trades) {
    runningPnl += t.pnlPct;
    if (runningPnl > peak) peak = runningPnl;
    const dd = peak - runningPnl;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    winRate,
    totalTrades,
    wins,
    losses,
    profitFactor,
    avgReturnPct,
    maxDrawdownPct: Number(maxDrawdown.toFixed(2)),
    trades: trades.slice(-25).reverse(),
    chartMarkers: chartMarkers.slice(-50),
    settingsUsed: {
      targetPct,
      stopLossPct,
      maxHoldingDays,
      minConfidence,
      direction
    }
  };
}

module.exports = {
  runBacktest
};
