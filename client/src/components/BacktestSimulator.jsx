import React, { useState } from 'react';
import { 
  Sliders, 
  Target, 
  ShieldAlert, 
  Clock, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Percent,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';

export default function BacktestSimulator({ symbol, initialBacktest, onUpdateMarkers }) {
  const [targetPct, setTargetPct] = useState(4.0);
  const [stopLossPct, setStopLossPct] = useState(2.5);
  const [holdingDays, setHoldingDays] = useState(15);
  const [minConfidence, setMinConfidence] = useState(60);
  const [direction, setDirection] = useState('BUY_ONLY'); // 'BUY_ONLY' | 'BOTH'
  const [useAtr, setUseAtr] = useState(true);
  
  const [backtestResult, setBacktestResult] = useState(initialBacktest);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          targetPct: Number(targetPct),
          stopLossPct: Number(stopLossPct),
          maxHoldingDays: Number(holdingDays),
          minConfidence: Number(minConfidence),
          direction,
          useAtr
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBacktestResult(data);
        if (onUpdateMarkers && data.chartMarkers) {
          onUpdateMarkers(data.chartMarkers);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const currentData = backtestResult || initialBacktest;

  return (
    <div className="space-y-6">
      {/* Parameter Adjustment Controls */}
      <div className="bg-[#121620] border border-[#232936] rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Custom Strategy &amp; Accuracy Simulator</h4>
              <p className="text-xs text-slate-400">अपनी सुविधानुसार Target % और Stop-Loss बदलें और लाइव एक्यूरेसी देखें</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direction Selector */}
            <div className="bg-[#181F2C] p-1 rounded-xl border border-[#263142] flex items-center text-xs">
              <button
                type="button"
                onClick={() => setDirection('BUY_ONLY')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  direction === 'BUY_ONLY' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cash (Buy Only)
              </button>
              <button
                type="button"
                onClick={() => setDirection('BOTH')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  direction === 'BOTH' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                F&amp;O (Buy &amp; Short)
              </button>
            </div>

            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>Simulate</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Target % */}
          <div className="bg-[#171D28] border border-[#232B3B] p-3 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Profit Target
              </span>
              <span className="font-bold text-emerald-400">+{targetPct}%</span>
            </div>
            <input
              type="range"
              min="1.5"
              max="15.0"
              step="0.5"
              value={targetPct}
              onChange={(e) => setTargetPct(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
          </div>

          {/* Stop Loss % */}
          <div className="bg-[#171D28] border border-[#232B3B] p-3 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Stop Loss Limit
              </span>
              <span className="font-bold text-rose-400">-{stopLossPct}%</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="8.0"
              step="0.5"
              value={stopLossPct}
              onChange={(e) => setStopLossPct(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
          </div>

          {/* Max Holding Days */}
          <div className="bg-[#171D28] border border-[#232B3B] p-3 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Max Holding
              </span>
              <span className="font-bold text-blue-400">{holdingDays} Days</span>
            </div>
            <input
              type="range"
              min="3"
              max="30"
              step="1"
              value={holdingDays}
              onChange={(e) => setHoldingDays(parseInt(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
          </div>

          {/* Min Signal Confidence */}
          <div className="bg-[#171D28] border border-[#232B3B] p-3 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Min Confidence
              </span>
              <span className="font-bold text-amber-400">&ge; {minConfidence}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="85"
              step="5"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Simulator Metrics Display */}
      {currentData && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Win Rate */}
          <div className="bg-[#121620] border border-[#232936] rounded-xl p-3.5 text-center">
            <span className="text-xs text-slate-400">Backtest Win-Rate</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {currentData.winRate}%
            </div>
            <span className="text-[10px] text-slate-500">Historical Accuracy</span>
          </div>

          {/* Total Trades */}
          <div className="bg-[#121620] border border-[#232936] rounded-xl p-3.5 text-center">
            <span className="text-xs text-slate-400">Total Setups</span>
            <div className="text-xl font-bold text-white mt-1">
              {currentData.totalTrades}
            </div>
            <span className="text-[10px] text-emerald-400">{currentData.wins} Wins</span> / <span className="text-[10px] text-rose-400">{currentData.losses} Losses</span>
          </div>

          {/* Profit Factor */}
          <div className="bg-[#121620] border border-[#232936] rounded-xl p-3.5 text-center">
            <span className="text-xs text-slate-400">Profit Factor</span>
            <div className="text-xl font-bold text-teal-300 mt-1">
              {currentData.profitFactor}
            </div>
            <span className="text-[10px] text-slate-500">&gt; 1.5 is High Quality</span>
          </div>

          {/* Avg Return per Trade */}
          <div className="bg-[#121620] border border-[#232936] rounded-xl p-3.5 text-center">
            <span className="text-xs text-slate-400">Avg Return / Trade</span>
            <div className={`text-xl font-bold mt-1 ${currentData.avgReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currentData.avgReturnPct >= 0 ? '+' : ''}{currentData.avgReturnPct}%
            </div>
            <span className="text-[10px] text-slate-500">Per trade expectancy</span>
          </div>

          {/* Max Drawdown */}
          <div className="bg-[#121620] border border-[#232936] rounded-xl p-3.5 text-center">
            <span className="text-xs text-slate-400">Max Drawdown</span>
            <div className="text-xl font-bold text-rose-400 mt-1">
              {currentData.maxDrawdownPct}%
            </div>
            <span className="text-[10px] text-slate-500">Peak-to-trough risk</span>
          </div>
        </div>
      )}

      {/* Historical Trades Log */}
      {currentData?.trades && currentData.trades.length > 0 && (
        <div className="bg-[#121620] border border-[#232936] rounded-xl p-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Recent Backtested Signals ({currentData.trades.length} Trades)
          </h5>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {currentData.trades.map((t, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#161B26] border border-[#222938] text-xs"
              >
                <div className="flex items-center gap-2">
                  {t.isWin ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span className={t.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.type}
                      </span>
                      <span>@ {t.entryPrice}</span>
                      <span className="text-[10px] text-slate-500">({t.entryDate})</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Exit: {t.exitPrice} on {t.exitDate} • {t.exitReason.replace('_', ' ')} ({t.holdingDays}d)
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-bold ${t.isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.isWin ? '+' : ''}{t.pnlPct}%
                  </span>
                  <div className="text-[10px] text-slate-500">
                    Conf: {t.confidence}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
