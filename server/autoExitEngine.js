const { getPositions, squareOffPosition, addLog } = require('./authService');
const { fetchCandles } = require('./stocksData');
const { evaluateConfluence } = require('./indicators');

let isRunning = false;
let monitorInterval = null;

/**
 * Continuous Auto-Exit and Position Monitor Loop
 */
function startAutoExitEngine() {
  if (isRunning) return;
  isRunning = true;
  console.log('[AutoExitEngine] 🚀 Continuous Position & Exit Monitor started (checking every 4s)...');

  monitorInterval = setInterval(async () => {
    try {
      const openPositions = getPositions().filter(p => p.status === 'OPEN');
      if (openPositions.length === 0) return;

      for (const pos of openPositions) {
        // Fetch current live price
        const candles = await fetchCandles(pos.symbol);
        if (!candles || candles.length === 0) continue;

        const currentCandle = candles[candles.length - 1];
        const currentPrice = currentCandle.close;

        // Update live P&L
        pos.currentPrice = currentPrice;
        pos.pnl = Number(((currentPrice - pos.entryPrice) * pos.quantity).toFixed(2));
        pos.pnlPct = Number((((currentPrice - pos.entryPrice) / pos.entryPrice) * 100).toFixed(2));

        // 1. Check Target Hit (कब निकलना है - Profit Exit)
        if (currentPrice >= pos.target) {
          console.log(`[AutoExitEngine] 🎯 TARGET REACHED for ${pos.cleanSymbol}: LTP ₹${currentPrice} >= Target ₹${pos.target}`);
          await squareOffPosition(pos.id, 'TARGET_HIT', currentPrice);
          continue;
        }

        // 2. Check Stop-Loss Hit (कब निकलना है - Loss Protection Exit)
        if (currentPrice <= pos.stopLoss) {
          console.log(`[AutoExitEngine] 🛑 STOP LOSS HIT for ${pos.cleanSymbol}: LTP ₹${currentPrice} <= Stop ₹${pos.stopLoss}`);
          await squareOffPosition(pos.id, 'STOP_LOSS_HIT', currentPrice);
          continue;
        }

        // 3. Check Signal Reversal (अगर अचानक Bearish ब्रेकडाउन हो जाए)
        const confluence = evaluateConfluence(candles);
        if (confluence.signal === 'STRONG SELL') {
          console.log(`[AutoExitEngine] ⚠️ REVERSAL SIGNAL for ${pos.cleanSymbol}: Trend turned Strong Sell`);
          await squareOffPosition(pos.id, 'REVERSAL_EXIT', currentPrice);
          continue;
        }
      }
    } catch (err) {
      console.error('[AutoExitEngine] Error in monitor loop:', err.message);
    }
  }, 4000);
}

function stopAutoExitEngine() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  isRunning = false;
  console.log('[AutoExitEngine] Stopped.');
}

module.exports = {
  startAutoExitEngine,
  stopAutoExitEngine
};
