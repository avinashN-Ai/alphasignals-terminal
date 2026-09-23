import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldAlert, 
  Sparkles, 
  Zap, 
  BarChart2, 
  LayoutGrid, 
  List,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function StockTable({ stocks, onSelectStock, onTradeStock, isLoading }) {
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' (Card view - clean) | 'TABLE'
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

    // Default sort by winRate or signal confidence
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
    <div className="space-y-4">
      
      {/* Clean Control Bar */}
      <div className="bg-[#151922] border border-[#232936] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        
        {/* Left: Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'ALL' ? 'bg-slate-700 text-white' : 'bg-[#1C2230] text-slate-400 hover:text-white'
            }`}
          >
            All ({stocks.length})
          </button>

          <button
            onClick={() => setFilter('STRONG_BUY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filter === 'HIGH_ACCURACY' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                : 'bg-[#1C2230] text-slate-300 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            Accuracy &ge; 60%
          </button>

          <button
            onClick={() => setFilter('SELL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'SELL' ? 'bg-rose-600 text-white' : 'bg-[#1C2230] text-rose-400 hover:bg-[#222B3D]'
            }`}
          >
            Sell / Risk Alert
          </button>
        </div>

        {/* Right: Search & View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter names..."
              className="bg-[#10141C] border border-[#232936] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-36 sm:w-44"
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
        <div className="bg-[#151922] border border-[#232936] rounded-2xl py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Scanning live NSE, US &amp; Binance markets...</span>
        </div>
      ) : processedStocks.length === 0 ? (
        <div className="bg-[#151922] border border-[#232936] rounded-2xl py-14 text-center text-slate-400 text-sm">
          No stocks or coins match your selected filter.
        </div>
      ) : viewMode === 'GRID' ? (
        
        /* 1. CLEAN CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {processedStocks.map((stock) => {
            const isBuy = stock.signal.includes('BUY');
            const isSell = stock.signal.includes('SELL');
            const isCrypto = stock.market === 'CRYPTO';

            return (
              <div
                key={stock.symbol}
                className="bg-[#151922] hover:bg-[#181F2B] border border-[#232936] hover:border-emerald-500/50 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 group shadow-md"
              >
                <div>
                  {/* Top Bar: Symbol & Market Tag */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-white group-hover:text-emerald-400 transition-colors">
                          {stock.cleanSymbol}
                        </h3>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                          isCrypto 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : stock.market === 'IN' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {isCrypto ? 'BINANCE' : stock.market === 'IN' ? 'NSE' : 'US'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{stock.name}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-white font-mono">
                        {stock.currency}{stock.price.toLocaleString()}
                      </div>
                      <div className={`text-xs font-bold flex items-center justify-end gap-0.5 mt-0.5 ${
                        stock.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {stock.changePct >= 0 ? '+' : ''}{stock.changePct}%
                      </div>
                    </div>
                  </div>

                  {/* Signal & Accuracy Bar */}
                  <div className="mt-3 pt-3 border-t border-[#232936] flex items-center justify-between">
                    <div>{getSignalBadge(stock.signal, stock.confidence)}</div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 font-mono">
                        {stock.accuracy.winRate}% Win-Rate
                      </span>
                      <div className="text-[10px] text-slate-500">Backtested</div>
                    </div>
                  </div>

                  {/* Target & Stop Loss Pills */}
                  {stock.tradeSetup && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#10141C] p-2 rounded-xl border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Target className="w-3 h-3" /> Target
                        </span>
                        <div className="font-extrabold text-white font-mono mt-0.5">
                          {stock.currency}{stock.tradeSetup.target1}
                        </div>
                        <span className="text-[10px] text-emerald-400/80">+{stock.tradeSetup.potentialGainPct}%</span>
                      </div>

                      <div className="bg-[#10141C] p-2 rounded-xl border border-rose-500/20">
                        <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Stop-Loss
                        </span>
                        <div className="font-extrabold text-white font-mono mt-0.5">
                          {stock.currency}{stock.tradeSetup.stopLoss}
                        </div>
                        <span className="text-[10px] text-rose-400/80">-{stock.tradeSetup.potentialRiskPct}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-[#232936] flex items-center gap-2">
                  <button
                    onClick={() => onTradeStock(stock)}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Auto Trade</span>
                  </button>

                  <button
                    onClick={() => onSelectStock(stock.symbol)}
                    className="p-2 rounded-xl bg-[#1C2230] hover:bg-[#242D3F] text-slate-300 hover:text-white transition-colors"
                    title="View TradingView Chart &amp; Deep Analysis"
                  >
                    <BarChart2 className="w-4 h-4" />
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
                  <th className="py-3 px-4 font-semibold">RSI &amp; Supertrend</th>
                  <th className="py-3 px-4 font-semibold">Target &amp; Stop Loss</th>
                  <th className="py-3 px-4 text-right font-semibold">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232936]">
                {processedStocks.map((stock) => (
                  <tr
                    key={stock.symbol}
                    className="hover:bg-[#1A202C] cursor-pointer transition-colors"
                    onClick={() => onSelectStock(stock.symbol)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        {stock.cleanSymbol}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {stock.market}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[140px]">{stock.name}</div>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-white">{stock.currency}{stock.price.toLocaleString()}</div>
                      <div className={`text-xs font-semibold ${stock.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stock.changePct >= 0 ? '+' : ''}{stock.changePct}%
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getSignalBadge(stock.signal, stock.confidence)}
                    </td>

                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span className="font-bold text-emerald-400 text-xs">{stock.accuracy.winRate}%</span>
                      <span className="text-[10px] text-slate-500 block">PF: {stock.accuracy.profitFactor}</span>
                    </td>

                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <div className="font-semibold text-slate-300">RSI: {stock.rsi}</div>
                      <div className={`text-[10px] font-medium ${stock.supertrendDirection === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stock.supertrendDirection === 1 ? 'Bullish ST' : 'Bearish ST'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs font-mono whitespace-nowrap">
                      {stock.tradeSetup ? (
                        <div>
                          <div className="text-emerald-400 font-bold">T1: {stock.currency}{stock.tradeSetup.target1}</div>
                          <div className="text-rose-400 text-[11px]">SL: {stock.currency}{stock.tradeSetup.stopLoss}</div>
                        </div>
                      ) : 'N/A'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTradeStock(stock);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Trade</span>
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
