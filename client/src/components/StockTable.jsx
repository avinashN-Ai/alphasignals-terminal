import React, { useState, useMemo } from 'react';
import { 
  Target, 
  ShieldAlert, 
  Sparkles, 
  Zap, 
  BarChart2, 
  LayoutGrid, 
  List,
  Search
} from 'lucide-react';

export default function StockTable({ stocks, onSelectStock, onTradeStock, isLoading }) {
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' | 'TABLE'
  const [filter, setFilter] = useState('ALL');
  const [localSearch, setLocalSearch] = useState('');

  const processedStocks = useMemo(() => {
    let result = [...stocks];

    if (localSearch.trim()) {
      const q = localSearch.toUpperCase();
      result = result.filter(s => 
        s.symbol.toUpperCase().includes(q) || 
        s.name.toUpperCase().includes(q) ||
        s.sector.toUpperCase().includes(q)
      );
    }

    if (filter === 'STRONG_BUY') {
      result = result.filter(s => s.signal === 'STRONG BUY');
    } else if (filter === 'BUY_ALL') {
      result = result.filter(s => s.signal.includes('BUY'));
    } else if (filter === 'HIGH_ACCURACY') {
      result = result.filter(s => s.accuracy.winRate >= 60);
    } else if (filter === 'OVERSOLD') {
      result = result.filter(s => s.rsi < 35);
    } else if (filter === 'SELL') {
      result = result.filter(s => s.signal.includes('SELL'));
    }

    result.sort((a, b) => b.confidence - a.confidence);
    return result;
  }, [stocks, filter, localSearch]);

  const getSignalBadge = (signal, confidence) => {
    if (signal === 'STRONG BUY') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          STRONG BUY ({confidence}%)
        </span>
      );
    }
    if (signal === 'BUY') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
          BUY ({confidence}%)
        </span>
      );
    }
    if (signal.includes('SELL')) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          {signal} ({confidence}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        HOLD / NEUTRAL
      </span>
    );
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      
      {/* Mobile-Friendly Filter & Control Bar */}
      <div className="bg-[#151922] border border-[#232936] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        
        {/* Horizontal Swipeable Filter Pills on Mobile */}
        <div className="flex items-center overflow-x-auto no-scrollbar gap-2 pb-0.5 sm:pb-0">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all active:scale-95 ${
              filter === 'ALL' ? 'bg-slate-700 text-white shadow' : 'bg-[#1C2230] text-slate-300 hover:text-white'
            }`}
          >
            All ({stocks.length})
          </button>

          <button
            onClick={() => setFilter('STRONG_BUY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all active:scale-95 flex items-center gap-1.5 ${
              filter === 'STRONG_BUY' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                : 'bg-[#1C2230] text-emerald-400 hover:bg-[#222B3D]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Strong Buy
          </button>

          <button
            onClick={() => setFilter('HIGH_ACCURACY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all active:scale-95 flex items-center gap-1.5 ${
              filter === 'HIGH_ACCURACY' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                : 'bg-[#1C2230] text-slate-300 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            Win-Rate &ge; 60%
          </button>

          <button
            onClick={() => setFilter('SELL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all active:scale-95 ${
              filter === 'SELL' ? 'bg-rose-600 text-white' : 'bg-[#1C2230] text-rose-400 hover:bg-[#222B3D]'
            }`}
          >
            Sell / Avoid
          </button>
        </div>

        {/* Desktop Filter Search & View Mode Switcher */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Quick filter..."
              className="bg-[#10141C] border border-[#232936] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-44"
            />
          </div>

          <div className="bg-[#10141C] p-1 rounded-xl border border-[#232936] flex items-center">
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'GRID' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Clean Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'TABLE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Compact Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-[#151922] border border-[#232936] rounded-2xl py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Scanning live Binance &amp; Kite NSE markets...</span>
        </div>
      ) : processedStocks.length === 0 ? (
        <div className="bg-[#151922] border border-[#232936] rounded-2xl py-14 text-center text-slate-400 text-sm">
          No stocks or coins match your selected filter.
        </div>
      ) : viewMode === 'GRID' ? (
        
        /* 1. MOBILE-FIRST CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {processedStocks.map((stock) => {
            const isCrypto = stock.market === 'CRYPTO';

            return (
              <div
                key={stock.symbol}
                className="bg-[#151924] hover:bg-[#19202E] border border-[#242C3D] hover:border-emerald-500/50 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-lg"
              >
                <div>
                  {/* Top Bar: Symbol, Platform Badge & Live Price */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 
                          onClick={() => onSelectStock(stock.symbol)}
                          className="font-black text-lg text-white hover:text-emerald-400 cursor-pointer transition-colors"
                        >
                          {stock.cleanSymbol}
                        </h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          isCrypto 
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                            : stock.market === 'IN' 
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' 
                            : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        }`}>
                          {isCrypto ? '🟡 BINANCE' : stock.market === 'IN' ? '🔵 KITE NSE' : '🌍 US TECH'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5 max-w-[180px]">{stock.name}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-white font-mono">
                        {stock.currency}{stock.price.toLocaleString()}
                      </div>
                      <div className={`inline-flex items-center px-1.5 py-0.2 rounded text-xs font-extrabold mt-0.5 ${
                        stock.changePct >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {stock.changePct >= 0 ? '+' : ''}{stock.changePct}%
                      </div>
                    </div>
                  </div>

                  {/* Signal & Accuracy Bar */}
                  <div className="mt-3 pt-3 border-t border-[#232B3C] flex items-center justify-between">
                    <div>{getSignalBadge(stock.signal, stock.confidence)}</div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                        🎯 {stock.accuracy.winRate}% Win-Rate
                      </span>
                    </div>
                  </div>

                  {/* Target & Stop Loss Pills */}
                  {stock.tradeSetup && (
                    <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
                      <div className="bg-[#0F131C] p-2.5 rounded-xl border border-emerald-500/25">
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                          <Target className="w-3.5 h-3.5" /> Target (+4%)
                        </span>
                        <div className="font-black text-sm text-white font-mono mt-0.5">
                          {stock.currency}{stock.tradeSetup.target1}
                        </div>
                      </div>

                      <div className="bg-[#0F131C] p-2.5 rounded-xl border border-rose-500/25">
                        <span className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Stop-Loss (-2.5%)
                        </span>
                        <div className="font-black text-sm text-white font-mono mt-0.5">
                          {stock.currency}{stock.tradeSetup.stopLoss}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Big Thumb-Friendly Mobile Action Buttons */}
                <div className="mt-4 pt-3 border-t border-[#232B3C] grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => onSelectStock(stock.symbol)}
                    className="py-2.5 px-3 rounded-xl bg-[#1D2536] hover:bg-[#252F44] active:scale-95 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-[#2C374F] transition-all"
                  >
                    <BarChart2 className="w-4 h-4 text-blue-400" />
                    <span>Chart &amp; Info</span>
                  </button>

                  <button
                    onClick={() => onTradeStock(stock)}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all"
                  >
                    <Zap className="w-4 h-4" />
                    <span>BUY / TRADE</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* 2. COMPACT TABLE VIEW */
        <div className="bg-[#151922] border border-[#232936] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#10141C] text-xs uppercase tracking-wider text-slate-400 border-b border-[#232936]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Asset / Market</th>
                  <th className="py-3 px-4 font-semibold">Price / 24h</th>
                  <th className="py-3 px-4 font-semibold">Confluence Signal</th>
                  <th className="py-3 px-4 font-semibold">Win-Rate Accuracy</th>
                  <th className="py-3 px-4 font-semibold">Target &amp; Stop Loss</th>
                  <th className="py-3 px-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2430]">
                {processedStocks.map((stock) => (
                  <tr key={stock.symbol} className="hover:bg-[#191F2C] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{stock.cleanSymbol}</div>
                      <div className="text-xs text-slate-400">{stock.name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-white">{stock.currency}{stock.price}</div>
                      <div className={`text-xs ${stock.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stock.changePct >= 0 ? '+' : ''}{stock.changePct}%
                      </div>
                    </td>
                    <td className="py-3 px-4">{getSignalBadge(stock.signal, stock.confidence)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{stock.accuracy.winRate}%</td>
                    <td className="py-3 px-4 text-xs font-mono">
                      <span className="text-emerald-400">T: {stock.currency}{stock.tradeSetup?.target1}</span>
                      <span className="mx-2 text-slate-600">|</span>
                      <span className="text-rose-400">SL: {stock.currency}{stock.tradeSetup?.stopLoss}</span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectStock(stock.symbol)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1C2230] text-slate-200 text-xs font-bold"
                      >
                        Chart
                      </button>
                      <button
                        onClick={() => onTradeStock(stock)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                      >
                        BUY
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
