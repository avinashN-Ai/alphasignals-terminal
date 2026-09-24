import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Search, 
  RefreshCw, 
  BookOpen, 
  X
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
      }, 200);
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
    ? (isConnected ? `🟡 Binance ($${Number(balance || 0).toFixed(0)})` : '🟡 Login Binance')
    : (isConnected ? `🔵 Kite (₹${Number(balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })})` : '🔵 Login Kite');

  return (
    <header className="sticky top-0 z-40 bg-[#0D111A]/95 backdrop-blur-xl border-b border-[#222938] shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Top Row: Brand Logo + Broker Pill + Refresh */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer shrink-0 active:scale-95 transition-transform" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg tracking-tight text-white">AlphaSignals</span>
                <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  PRO
                </span>
              </div>
              <div className="text-[10px] text-slate-400 hidden sm:block">Binance &amp; Zerodha Kite Auto-Terminal</div>
            </div>
          </div>

          {/* Desktop Market Tabs */}
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
              onClick={() => setMarket('CRYPTO')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                market === 'CRYPTO' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-amber-400 hover:text-white'
              }`}
            >
              🪙 Binance Crypto
            </button>
            <button
              onClick={() => setMarket('IN')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                market === 'IN' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              🇮🇳 India (Kite NSE)
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

          {/* Desktop Search Bar */}
          <div className="hidden sm:block flex-1 max-w-xs relative" ref={searchRef}>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowDropdown(true)}
                placeholder="Search BTC, SOL, RELIANCE..."
                className="w-full bg-[#151922] border border-[#252D3D] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-[#151A26] border border-[#2B3548] rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectStock(item.symbol);
                      setShowDropdown(false);
                      setSearchQuery('');
                    }}
                    className="px-4 py-3 hover:bg-[#1E2638] active:bg-[#252F45] cursor-pointer flex items-center justify-between border-b border-[#222B3C] last:border-0"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{item.symbol.replace('.NS', '')}</div>
                      <div className="text-[11px] text-slate-400">{item.name}</div>
                    </div>
                    <div className="text-xs text-emerald-400 font-bold">Chart →</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenBrokerManager}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition-all active:scale-95 shadow-sm ${
                isConnected 
                  ? (isBinance ? 'bg-amber-950/40 text-amber-300 border-amber-500/50' : 'bg-blue-950/40 text-blue-300 border-blue-500/50')
                  : 'bg-[#182030] text-amber-300 border-amber-500/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{brokerLabel}</span>
            </button>

            <button
              onClick={onOpenGuide}
              className="hidden lg:flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[#181E2C] text-slate-300 hover:text-white border border-slate-700"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guide</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-200 bg-[#161B26] hover:bg-[#1E2535] active:scale-95 border border-[#252D3D] disabled:opacity-50"
              title="Refresh Live Market Prices"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

        </div>

        {/* Mobile Full-Width Search Bar (Visible on Mobile Phones) */}
        <div className="sm:hidden pb-2.5 relative">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowDropdown(true)}
              placeholder="🔍 Search BTC, SOL, RELIANCE, TATA..."
              className="w-full bg-[#151A24] border border-[#263042] rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-[#161C28] border border-[#2C374B] rounded-2xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onSelectStock(item.symbol);
                    setShowDropdown(false);
                    setSearchQuery('');
                  }}
                  className="px-4 py-3.5 active:bg-[#222C40] cursor-pointer flex items-center justify-between border-b border-[#222B3C] last:border-0"
                >
                  <div>
                    <div className="font-extrabold text-sm text-white">{item.symbol.replace('.NS', '')}</div>
                    <div className="text-xs text-slate-400">{item.name}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    View →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
