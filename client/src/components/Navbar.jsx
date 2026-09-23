import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Search, 
  RefreshCw, 
  BookOpen, 
  Zap
} from 'lucide-react';

export default function Navbar({ 
  market, 
  setMarket, 
  onSelectStock, 
  onRefresh, 
  isRefreshing, 
  onOpenGuide,
  onOpenBrokerManager,
  brokerStatus
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      const delayDebounce = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
            setShowDropdown(true);
          }
        } catch (e) {
          console.error(e);
        }
      }, 250);
      return () => clearTimeout(delayDebounce);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchQuery]);

  const activeBroker = brokerStatus?.activeBroker || 'binance';
  const isBinance = activeBroker === 'binance';
  const isConnected = isBinance ? brokerStatus?.binance?.connected : brokerStatus?.kite?.connected;
  const balance = isBinance ? brokerStatus?.binance?.balance : brokerStatus?.kite?.balance;
  
  const brokerLabel = isBinance 
    ? (isConnected ? `🟡 Binance ($${Number(balance || 0).toFixed(0)})` : '🟡 Binance (Connect)')
    : (isConnected ? `🔵 Kite (₹${Number(balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })})` : '🔵 Kite (Connect)');

  return (
    <header className="sticky top-0 z-40 bg-[#0E121A]/95 backdrop-blur-md border-b border-[#232936]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">AlphaSignals</span>
                <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hidden sm:inline">
                  PRO
                </span>
              </div>
            </div>
          </div>

          {/* Market Tabs */}
          <div className="hidden md:flex items-center bg-[#151922] p-1 rounded-xl border border-[#232936] text-xs font-semibold">
            <button
              onClick={() => setMarket('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                market === 'ALL' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setMarket('IN')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                market === 'IN' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              🇮🇳 India (NSE)
            </button>
            <button
              onClick={() => setMarket('CRYPTO')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                market === 'CRYPTO' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-amber-400 hover:text-white'
              }`}
            >
              🪙 Binance Crypto
            </button>
            <button
              onClick={() => setMarket('US')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                market === 'US' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌍 US Tech
            </button>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-xs sm:max-w-sm relative" ref={searchRef}>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowDropdown(true)}
                placeholder="Search BTC, RELIANCE, NVDA..."
                className="w-full bg-[#151922] border border-[#232936] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-[#151922] border border-[#2B3242] rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectStock(item.symbol);
                      setShowDropdown(false);
                      setSearchQuery('');
                    }}
                    className="px-4 py-2.5 hover:bg-[#1C2230] cursor-pointer flex items-center justify-between border-b border-[#232936] last:border-0"
                  >
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        {item.symbol.replace('.NS', '')}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.name}</div>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-semibold">
                      Analyze →
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenBrokerManager}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                isConnected 
                  ? (isBinance ? 'bg-amber-950/30 text-amber-300 border-amber-500/40 hover:bg-amber-900/40' : 'bg-blue-950/30 text-blue-300 border-blue-500/40 hover:bg-blue-900/40')
                  : 'bg-[#171E2B] text-slate-300 border-slate-700 hover:bg-[#20293B]'
              }`}
              title="Switch Broker (Binance / Zerodha Kite)"
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              <span>{brokerLabel}</span>
            </button>

            <button
              onClick={onOpenGuide}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1C2230] text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guide</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-xl text-slate-300 bg-[#151922] hover:bg-[#1C2230] border border-[#232936] disabled:opacity-50"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

        </div>

        {/* Mobile Market Tabs Bar */}
        <div className="flex md:hidden items-center pb-2.5 overflow-x-auto gap-1 text-xs">
          <button
            onClick={() => setMarket('ALL')}
            className={`px-2.5 py-1 rounded-lg shrink-0 font-medium ${
              market === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setMarket('IN')}
            className={`px-2.5 py-1 rounded-lg shrink-0 font-medium ${
              market === 'IN' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            🇮🇳 India
          </button>
          <button
            onClick={() => setMarket('CRYPTO')}
            className={`px-2.5 py-1 rounded-lg shrink-0 font-bold ${
              market === 'CRYPTO' ? 'bg-amber-500 text-slate-950' : 'text-amber-400'
            }`}
          >
            🪙 Binance Crypto
          </button>
          <button
            onClick={() => setMarket('US')}
            className={`px-2.5 py-1 rounded-lg shrink-0 font-medium ${
              market === 'US' ? 'bg-purple-600 text-white' : 'text-slate-400'
            }`}
          >
            🌍 US Tech
          </button>
        </div>

      </div>
    </header>
  );
}
