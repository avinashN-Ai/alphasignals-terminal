import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldAlert, 
  Activity, 
  Award, 
  Sparkles, 
  Sliders, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Zap
} from 'lucide-react';
import CandlestickChart from './CandlestickChart';
import BacktestSimulator from './BacktestSimulator';

export default function StockModal({ symbol, onClose, onTradeStock }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CHART');
  const [chartMarkers, setChartMarkers] = useState([]);

  useEffect(() => {
    if (!symbol) return;
    setIsLoading(true);

    fetch(`/api/stock/${symbol}`)
      .then(res => res.json())
      .then(result => {
        setData(result);
        if (result.backtest?.chartMarkers) {
          setChartMarkers(result.backtest.chartMarkers);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [symbol]);

  if (!symbol) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#121620] border border-[#2B3547] rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#232936] bg-[#0E121A] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-base text-white">
              {symbol.replace('.NS', '').replace('.BO', '').slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">
                  {symbol.replace('.NS', '').replace('.BO', '')}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                  {symbol.includes('.NS') ? 'NSE India' : 'US Market'}
                </span>
                {data && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                    data.confluence.signal.includes('BUY')
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : data.confluence.signal.includes('SELL')
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {data.confluence.signal} ({data.confluence.confidence}%)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{data?.name} • {data?.sector}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {data && (
              <div className="text-right">
                <div className="text-xl font-black text-white">
                  {data.currency}{data.confluence.currentClose.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                  <span>Accuracy:</span>
                  <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
                    {data.backtest.winRate}% Win-Rate
                  </span>
                </div>
              </div>
            )}

            {/* Quick 1-Click Trade in Modal */}
            {data && (
              <button
                onClick={() => {
                  if (onTradeStock) onTradeStock(data);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Auto Trade</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2535] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#10141C] border-b border-[#232936] text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('CHART')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'CHART'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#1A202C]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Interactive Chart &amp; Signals</span>
          </button>

          <button
            onClick={() => setActiveTab('BACKTEST')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'BACKTEST'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#1A202C]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Accuracy Simulator &amp; Backtest</span>
          </button>

          <button
            onClick={() => setActiveTab('FACTORS')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'FACTORS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#1A202C]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Technical Confluence Factors</span>
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Fetching live candles and calculating multi-factor signals...</span>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-slate-400">
              Failed to load stock data. Please try again.
            </div>
          ) : (
            <>
              {/* Tab 1: Chart */}
              {activeTab === 'CHART' && (
                <div className="space-y-4">
                  <div className="bg-[#0B0E14] border border-[#232936] rounded-2xl p-2.5">
                    <CandlestickChart
                      candles={data.candles}
                      indicators={data.indicators}
                      markers={chartMarkers}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>* Chart displays daily candles, 20 EMA (Cyan), 50 EMA (Amber), and recorded Buy/Sell triggers.</span>
                    <span className="text-emerald-400 font-medium">
                      {chartMarkers.length} Recorded Signal Points
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 2: Backtest & Custom Simulator */}
              {activeTab === 'BACKTEST' && (
                <BacktestSimulator
                  symbol={symbol}
                  initialBacktest={data.backtest}
                  onUpdateMarkers={(markers) => setChartMarkers(markers)}
                />
              )}

              {/* Tab 3: Technical Confluence Factors */}
              {activeTab === 'FACTORS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.confluence.factors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="bg-[#151922] border border-[#232936] rounded-xl p-3.5 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white">{factor.name}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                            factor.status === 'BULLISH'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : factor.status === 'BEARISH'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {factor.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{factor.note}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-[#151922] border border-[#232936] p-3 rounded-xl text-center">
                      <span className="text-xs text-slate-400">RSI (14)</span>
                      <div className="text-lg font-bold text-emerald-400 mt-0.5">{data.confluence.rsi}</div>
                    </div>
                    <div className="bg-[#151922] border border-[#232936] p-3 rounded-xl text-center">
                      <span className="text-xs text-slate-400">MACD Value</span>
                      <div className="text-lg font-bold text-teal-300 mt-0.5">{data.confluence.macd}</div>
                    </div>
                    <div className="bg-[#151922] border border-[#232936] p-3 rounded-xl text-center">
                      <span className="text-xs text-slate-400">Supertrend</span>
                      <div className="text-lg font-bold text-white mt-0.5">{data.currency}{data.confluence.supertrend}</div>
                    </div>
                    <div className="bg-[#151922] border border-[#232936] p-3 rounded-xl text-center">
                      <span className="text-xs text-slate-400">20 EMA</span>
                      <div className="text-lg font-bold text-cyan-400 mt-0.5">{data.currency}{data.confluence.ema20}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trade Execution Plan Card */}
              <div className="bg-gradient-to-r from-[#141A24] via-[#151F28] to-[#141A24] border border-[#2B384E] rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Recommended Trade Setup (सुझाया गया ट्रेड प्लान)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Risk/Reward: {data.confluence.tradeSetup.riskRewardRatio} • Auto-Exit Compatible
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onTradeStock) onTradeStock(data);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
                  >
                    <Zap className="w-4 h-4" />
                    <span>⚡ 1-Click Auto Trade This Setup</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-[#0F141D] p-3 rounded-xl border border-[#222A3A]">
                    <span className="text-xs text-slate-400">Entry Price</span>
                    <div className="text-lg font-extrabold text-white mt-0.5">
                      {data.currency}{data.confluence.tradeSetup.entry}
                    </div>
                    <span className="text-[10px] text-slate-500">Current Market Price</span>
                  </div>

                  <div className="bg-[#0F141D] p-3 rounded-xl border border-rose-500/20">
                    <span className="text-xs text-rose-400 flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Stop Loss
                    </span>
                    <div className="text-lg font-extrabold text-rose-400 mt-0.5">
                      {data.currency}{data.confluence.tradeSetup.stopLoss}
                    </div>
                    <span className="text-[10px] text-rose-400/80">-{data.confluence.tradeSetup.potentialRiskPct}% Risk</span>
                  </div>

                  <div className="bg-[#0F141D] p-3 rounded-xl border border-emerald-500/20">
                    <span className="text-xs text-emerald-400">Target 1 (Base)</span>
                    <div className="text-lg font-extrabold text-emerald-400 mt-0.5">
                      {data.currency}{data.confluence.tradeSetup.target1}
                    </div>
                    <span className="text-[10px] text-emerald-400/80">+{data.confluence.tradeSetup.potentialGainPct}% Gain</span>
                  </div>

                  <div className="bg-[#0F141D] p-3 rounded-xl border border-teal-500/20">
                    <span className="text-xs text-teal-400">Target 2 (Extended)</span>
                    <div className="text-lg font-extrabold text-teal-300 mt-0.5">
                      {data.currency}{data.confluence.tradeSetup.target2}
                    </div>
                    <span className="text-[10px] text-teal-400/80">+{(data.confluence.tradeSetup.potentialGainPct * 1.75).toFixed(1)}% Gain</span>
                  </div>
                </div>
              </div>

              {/* AI & Hindi Commentary */}
              <div className="bg-[#151922] border border-[#232936] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Quantitative Analysis &amp; Hindi Insight (रणनीति विश्लेषण)
                  </h4>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-[#10141C] p-3.5 rounded-xl border border-[#232936]">
                  <p className="font-medium text-emerald-300 mb-1">🇮🇳 विश्लेषण (हिंदी):</p>
                  <p>{data.insightHindi}</p>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
