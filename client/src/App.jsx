import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MarketOverview from './components/MarketOverview';
import StockTable from './components/StockTable';
import StockModal from './components/StockModal';
import TradingGuideModal from './components/TradingGuideModal';
import BrokerManagerModal from './components/BrokerManagerModal';
import OrderConfirmationModal from './components/OrderConfirmationModal';

export default function App() {
  const [market, setMarket] = useState('ALL');
  const [stocks, setStocks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  
  // Modals state
  const [showGuide, setShowGuide] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [orderStock, setOrderStock] = useState(null);

  // Broker status
  const [brokerStatus, setBrokerStatus] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBrokerStatus = async () => {
    try {
      const res = await fetch('/api/brokers/status');
      if (res.ok) {
        const data = await res.json();
        setBrokerStatus(data);
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
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
            setShowBrokerModal(true); // Open broker terminal to show active position
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

      {/* Footer */}
      <footer className="border-t border-[#1C2230] bg-[#0E121A] py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
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
