import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MarketOverview from './components/MarketOverview';
import StockTable from './components/StockTable';
import StockModal from './components/StockModal';
import TradingGuideModal from './components/TradingGuideModal';
import BrokerManagerModal from './components/BrokerManagerModal';
import OrderConfirmationModal from './components/OrderConfirmationModal';
import { 
  LayoutGrid, 
  Zap, 
  BookOpen, 
  Coins, 
  TrendingUp 
} from 'lucide-react';

export default function App() {
  const [market, setMarket] = useState('ALL');
  const [stocks, setStocks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  
  // Modals state
  const [showGuide, setShowGuide] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [orderStock, setOrderStock] = useState(null);

  // Broker status & active positions count
  const [brokerStatus, setBrokerStatus] = useState(null);
  const [activePositionsCount, setActivePositionsCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBrokerStatus = async () => {
    try {
      const [statusRes, posRes] = await Promise.all([
        fetch('/api/auth/status'),
        fetch('/api/auth/positions')
      ]);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setBrokerStatus(data);
      }
      if (posRes.ok) {
        const posData = await posRes.json();
        setActivePositionsCount(posData.activeCount || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = useCallback(async (isRefreshAction = false) => {
    if (isRefreshAction) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [summaryRes, stocksRes] = await Promise.all([
        fetch('/api/market-summary'),
        fetch(`/api/stocks?market=${market}`)
      ]);

      if (summaryRes.ok && stocksRes.ok) {
        const summaryData = await summaryRes.json();
        const stocksData = await stocksRes.json();
        setSummary(summaryData);
        setStocks(stocksData.stocks || []);
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [market]);

  useEffect(() => {
    loadData();
    fetchBrokerStatus();
    const interval = setInterval(fetchBrokerStatus, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        market={market}
        setMarket={setMarket}
        onSelectStock={(sym) => setSelectedStock(sym)}
        onRefresh={() => {
          loadData(true);
          fetchBrokerStatus();
        }}
        isRefreshing={isRefreshing}
        onOpenGuide={() => setShowGuide(true)}
        onOpenBrokerManager={() => setShowBrokerModal(true)}
        brokerStatus={brokerStatus}
      />

      {/* Main Content Container (with bottom padding for mobile nav bar) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-10 space-y-4 sm:space-y-6">
        
        {/* Active Open Positions Banner on Mobile/Desktop if user has trades running */}
        {activePositionsCount > 0 && (
          <div 
            onClick={() => setShowBrokerModal(true)}
            className="bg-gradient-to-r from-emerald-950/80 via-teal-950/60 to-[#141A26] border border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer active:scale-98 transition-all shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
              <div>
                <div className="text-xs sm:text-sm font-black text-white">
                  {activePositionsCount} Active Trade{activePositionsCount > 1 ? 's' : ''} Running (24/7 Auto-Exit Active)
                </div>
                <div className="text-[11px] text-emerald-300">
                  Target (+4%) &amp; Stop-Loss (-2.5%) की निगरानी चालू है • देखने के लिए टैप करें
                </div>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shrink-0">
              View →
            </span>
          </div>
        )}

        {/* Market Overview & Sentiment */}
        <MarketOverview
          summary={summary}
          onSelectStock={(sym) => setSelectedStock(sym)}
        />

        {/* Screener and All Stocks Table */}
        <StockTable
          stocks={stocks}
          isLoading={isLoading}
          onSelectStock={(sym) => setSelectedStock(sym)}
          onTradeStock={(stock) => setOrderStock(stock)}
        />

      </main>

      {/* MOBILE APP FIXED BOTTOM NAVIGATION BAR (Thumb-Friendly for Phones) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D111A]/95 backdrop-blur-xl border-t border-[#222B3C] px-2 pt-1.5 pb-safe shadow-2xl">
        <div className="grid grid-cols-5 gap-1">
          
          <button
            onClick={() => { setMarket('ALL'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              market === 'ALL' && !showBrokerModal && !showGuide
                ? 'text-emerald-400 bg-emerald-500/10 font-black'
                : 'text-slate-400 font-medium'
            }`}
          >
            <LayoutGrid className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">All Market</span>
          </button>

          <button
            onClick={() => { setMarket('CRYPTO'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              market === 'CRYPTO' && !showBrokerModal
                ? 'text-amber-400 bg-amber-500/15 font-black'
                : 'text-slate-400 font-medium'
            }`}
          >
            <Coins className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">🟡 Binance</span>
          </button>

          <button
            onClick={() => { setMarket('IN'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              market === 'IN' && !showBrokerModal
                ? 'text-blue-400 bg-blue-500/15 font-black'
                : 'text-slate-400 font-medium'
            }`}
          >
            <TrendingUp className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">🔵 Kite NSE</span>
          </button>

          <button
            onClick={() => setShowBrokerModal(true)}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              showBrokerModal
                ? 'text-emerald-400 bg-emerald-500/15 font-black'
                : 'text-slate-300 font-bold'
            }`}
          >
            {activePositionsCount > 0 && (
              <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black flex items-center justify-center">
                {activePositionsCount}
              </span>
            )}
            <Zap className="w-5 h-5 mb-0.5 text-amber-400" />
            <span className="text-[10px]">Login/Trades</span>
          </button>

          <button
            onClick={() => setShowGuide(true)}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              showGuide
                ? 'text-emerald-400 bg-emerald-500/15 font-black'
                : 'text-slate-400 font-medium'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Guide</span>
          </button>

        </div>
      </nav>

      {/* Deep-Dive Stock Modal */}
      {selectedStock && (
        <StockModal
          symbol={selectedStock}
          onClose={() => setSelectedStock(null)}
          onTradeStock={(stock) => {
            setSelectedStock(null);
            setOrderStock(stock);
          }}
        />
      )}

      {/* 1-Click Order Confirmation Modal */}
      {orderStock && (
        <OrderConfirmationModal
          stock={orderStock}
          brokerStatus={brokerStatus}
          onClose={() => setOrderStock(null)}
          onOrderPlaced={() => {
            fetchBrokerStatus();
            setShowBrokerModal(true);
          }}
        />
      )}

      {/* Multi-Broker Terminal Modal */}
      <BrokerManagerModal
        isOpen={showBrokerModal}
        onClose={() => setShowBrokerModal(false)}
        onRefreshPositions={fetchBrokerStatus}
      />

      {/* Educational Guide Modal */}
      <TradingGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />

      {/* Desktop Footer */}
      <footer className="hidden md:block border-t border-[#1C2230] bg-[#0E121A] py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400 font-semibold">AlphaSignals Terminal (Binance &amp; Zerodha Kite)</span>
            <span>• Auto-Entry &amp; Auto-Exit Protection</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setShowBrokerModal(true)}
              className="text-amber-400 hover:underline font-semibold"
            >
              🟡 Binance &amp; 🔵 Zerodha Kite Terminal
            </button>
            <span>•</span>
            <button
              onClick={() => setShowGuide(true)}
              className="hover:text-emerald-400 transition-colors"
            >
              एक्यूरेसी गाइड (Guide)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
