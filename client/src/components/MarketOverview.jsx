import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldCheck, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function MarketOverview({ summary, onSelectStock }) {
  if (!summary) return null;

  const isBullish = summary.marketSentiment === 'BULLISH';

  return (
    <div className="space-y-4">
      {/* Clean Top Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Market Condition */}
        <div className="bg-[#151922] border border-[#232936] rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-medium">Market Trend</span>
            <div className={`text-base sm:text-lg font-black flex items-center gap-1.5 mt-0.5 ${
              isBullish ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isBullish ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{summary.marketSentiment} ({summary.sentimentScore}% Bullish)</span>
            </div>
          </div>
          <span className={`w-3 h-3 rounded-full ${isBullish ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></span>
        </div>

        {/* Avg Win-Rate */}
        <div className="bg-[#151922] border border-[#232936] rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-medium">Platform Accuracy</span>
            <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 flex items-baseline gap-1">
              <span>{summary.avgAccuracy}%</span>
              <span className="text-xs text-slate-400 font-normal">Win-Rate</span>
            </div>
          </div>
          <Target className="w-5 h-5 text-emerald-400/80" />
        </div>

        {/* Buy Setups */}
        <div className="bg-[#151922] border border-[#232936] rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-medium">Buying Opportunities</span>
            <div className="text-base sm:text-lg font-black text-teal-300 mt-0.5">
              {summary.strongBuys + summary.buys} Stocks / Coins
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
            {summary.strongBuys} Strong
          </span>
        </div>

        {/* Sell / Caution */}
        <div className="bg-[#151922] border border-[#232936] rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-medium">Caution / Sell</span>
            <div className="text-base sm:text-lg font-black text-rose-400 mt-0.5">
              {summary.sells} Assets
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
            Avoid / Short
          </span>
        </div>

      </div>

      {/* Top High Accuracy Carousel / Highlights */}
      {summary.topOpportunities && summary.topOpportunities.length > 0 && (
        <div className="bg-[#131822] border border-[#232E40] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Top High-Accuracy Setups (उच्च एक्यूरेसी वाले चुनिंदा स्टॉक्स / क्रिप्टोकरेंसी)
              </h3>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold hidden sm:inline">
              Historical Win-Rate ≥ 60%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {summary.topOpportunities.map((stock) => (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                className="bg-[#181F2C] hover:bg-[#20293A] border border-[#263245] hover:border-emerald-500/50 rounded-xl p-3 cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-colors">
                    {stock.cleanSymbol}
                  </span>
                  <span className="text-[10px] font-extrabold text-emerald-400">
                    {stock.accuracy.winRate}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{stock.name}</div>
                
                <div className="mt-2.5 pt-2 border-t border-[#232B3B] flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
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
