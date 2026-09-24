import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Sparkles
} from 'lucide-react';

export default function MarketOverview({ summary, onSelectStock }) {
  if (!summary) return null;

  const isBullish = summary.marketSentiment === 'BULLISH';

  return (
    <div className="space-y-3 sm:space-y-4">
      
      {/* Compact 2x2 Mobile / 4-Col Desktop Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        
        {/* Market Condition */}
        <div className="bg-[#151922] border border-[#232936] rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Market Trend</span>
            <div className={`text-sm sm:text-lg font-black flex items-center gap-1 mt-0.5 ${
              isBullish ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isBullish ? <TrendingUp className="w-4 h-4 shrink-0" /> : <TrendingDown className="w-4 h-4 shrink-0" />}
              <span>{summary.marketSentiment} ({summary.sentimentScore}%)</span>
            </div>
          </div>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isBullish ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></span>
        </div>

        {/* Avg Win-Rate */}
        <div className="bg-[#151922] border border-[#232936] rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Avg Win-Rate</span>
            <div className="text-sm sm:text-lg font-black text-emerald-400 mt-0.5 flex items-baseline gap-1">
              <span>{summary.avgAccuracy}%</span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-normal">Accuracy</span>
            </div>
          </div>
          <Target className="w-5 h-5 text-emerald-400/80 shrink-0" />
        </div>

        {/* Buy Setups */}
        <div className="bg-[#151922] border border-[#232936] rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Buy Signals</span>
            <div className="text-sm sm:text-lg font-black text-teal-300 mt-0.5">
              {summary.strongBuys + summary.buys} Active
            </div>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            {summary.strongBuys} Strong
          </span>
        </div>

        {/* Sell / Caution */}
        <div className="bg-[#151922] border border-[#232936] rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Sell / Risk</span>
            <div className="text-sm sm:text-lg font-black text-rose-400 mt-0.5">
              {summary.sells} Alerts
            </div>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
            Caution
          </span>
        </div>

      </div>

      {/* Top High Accuracy Horizontal Swipeable Carousel on Mobile */}
      {summary.topOpportunities && summary.topOpportunities.length > 0 && (
        <div className="bg-[#131822] border border-[#232E40] rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-200">
                Top High-Accuracy Picks (Swipe →)
              </h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Win-Rate ≥ 60%
            </span>
          </div>

          <div className="flex overflow-x-auto no-scrollbar gap-2.5 pb-1 sm:grid sm:grid-cols-3 lg:grid-cols-6">
            {summary.topOpportunities.map((stock) => (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                className="min-w-[150px] sm:min-w-0 bg-[#181F2C] active:scale-95 hover:bg-[#20293A] border border-[#263245] hover:border-emerald-500/50 rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between shrink-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-white">
                    {stock.cleanSymbol}
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                    {stock.accuracy.winRate}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{stock.name}</div>
                
                <div className="mt-2 pt-2 border-t border-[#232B3B] flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-100 font-mono">
                    {stock.currency}{stock.price.toLocaleString()}
                  </span>
                  <span className={`text-[11px] font-bold ${stock.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stock.changePct >= 0 ? '+' : ''}{stock.changePct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
