import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Layers,
  History,
  Lock,
  LogOut,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

export default function BrokerManagerModal({ isOpen, onClose, onRefreshPositions }) {
  const [activeTab, setActiveTab] = useState('BROKERS'); // 'BROKERS' | 'POSITIONS' | 'LOGS'
  const [brokerStatus, setBrokerStatus] = useState(null);
  const [positions, setPositions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Binance inputs
  const [binanceKey, setBinanceKey] = useState('');
  const [binanceSecret, setBinanceSecret] = useState('');

  // Kite inputs
  const [kiteEnctoken, setKiteEnctoken] = useState('');
  const [kiteApiKey, setKiteApiKey] = useState('');
  const [kiteApiSecret, setKiteApiSecret] = useState('');
  const [kiteMethod, setKiteMethod] = useState('enctoken'); // 'enctoken' | 'apikey'

  const fetchStatus = async () => {
    try {
      const [statusRes, posRes, logsRes] = await Promise.all([
        fetch('/api/auth/status'),
        fetch('/api/auth/positions'),
        fetch('/api/auth/logs')
      ]);

      if (statusRes.ok && posRes.ok && logsRes.ok) {
        const sData = await statusRes.json();
        const pData = await posRes.json();
        const lData = await logsRes.json();

        setBrokerStatus(sData);
        setPositions(pData.positions || []);
        setLogs(lData || []);
      }
    } catch (e) {
      console.error('Error fetching auth status:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleSelectBroker = async (brokerId) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId })
      });
      if (res.ok) {
        const data = await res.json();
        setBrokerStatus(data.status);
      }
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBinanceLogin = async (useDemo = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/auth/binance/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: binanceKey,
          apiSecret: binanceSecret,
          useDemo
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(useDemo 
          ? '⚡ Binance Demo Sandbox ($5,000 USDT) Connected & Saved!'
          : `🟢 Binance Live Account Verified! Balance: $${Number(data.result.balance).toFixed(2)} USDT`
        );
        await fetchStatus();
        if (onRefreshPositions) onRefreshPositions();
      } else {
        setErrorMessage(data.error || 'Binance login failed. Please verify API Key & Secret.');
      }
    } catch (e) {
      setErrorMessage(e.message || 'Connection to Binance server failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKiteLogin = async (useDemo = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/auth/kite/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enctoken: kiteEnctoken,
          apiKey: kiteApiKey,
          apiSecret: kiteApiSecret,
          useDemo
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(useDemo
          ? '⚡ Zerodha Kite Demo Sandbox (₹1,00,000) Connected & Saved!'
          : `🟢 Zerodha Kite Verified! Cash Margin: ₹${Number(data.result.balance).toLocaleString('en-IN')}`
        );
        await fetchStatus();
        if (onRefreshPositions) onRefreshPositions();
      } else {
        setErrorMessage(data.error || 'Kite login failed. Check enctoken or credentials.');
      }
    } catch (e) {
      setErrorMessage(e.message || 'Connection to Zerodha Kite server failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (brokerId) => {
    if (!confirm(`Are you sure you want to disconnect ${brokerId === 'binance' ? 'Binance' : 'Zerodha Kite'}?`)) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId })
      });
      if (res.ok) {
        const data = await res.json();
        setBrokerStatus(data.status);
        setSuccessMessage(`${brokerId.toUpperCase()} disconnected.`);
      }
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSquareOff = async (positionId) => {
    if (!confirm('Are you sure you want to square off this position immediately?')) return;
    try {
      const res = await fetch('/api/auth/square-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId })
      });
      if (res.ok) {
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const activeBroker = brokerStatus?.activeBroker || 'binance';
  const binanceData = brokerStatus?.binance || {};
  const kiteData = brokerStatus?.kite || {};

  const openPositions = positions.filter(p => p.status === 'OPEN');
  const closedPositions = positions.filter(p => p.status === 'CLOSED');
  const totalOpenPnl = openPositions.reduce((acc, p) => acc + (p.pnl || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#11151F] border-t sm:border border-[#262D3D] rounded-t-3xl sm:rounded-3xl w-full max-w-4xl max-h-[93vh] flex flex-col shadow-2xl overflow-hidden pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        
        {/* Drag Handle for Mobile */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[#0C0F17]">
          <div className="w-12 h-1.5 rounded-full bg-slate-700"></div>
        </div>

        {/* Header */}
        <div className="px-4 py-3.5 sm:p-5 border-b border-[#1E2535] bg-[#0C0F17] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-blue-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  Trading Terminal &amp; App Login
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PERMANENT LOGIN
                </span>
              </div>
              <p className="text-xs text-slate-400">
                🟡 <strong>Binance App</strong> (Crypto &amp; International) &amp; 🔵 <strong>Zerodha Kite App</strong> (Indian Stocks)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2535] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-950/70 border-b border-rose-500/30 flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="px-5 py-2.5 bg-emerald-950/70 border-b border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#0E121B] border-b border-[#1E2535] text-xs font-semibold overflow-x-auto gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('BROKERS')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'BROKERS'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#1A202C]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Login Apps (Binance &amp; Kite)</span>
            </button>

            <button
              onClick={() => setActiveTab('POSITIONS')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'POSITIONS'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#1A202C]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Active Trades ({openPositions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('LOGS')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'LOGS'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#1A202C]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Auto-Exit Logs</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-400">Active Broker:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
              activeBroker === 'binance' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
            }`}>
              {activeBroker === 'binance' ? '🟡 Binance' : '🔵 Zerodha Kite'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: LOGIN APPS */}
          {activeTab === 'BROKERS' && (
            <div className="space-y-6">
              
              {/* App Switcher Cards */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Select Broker Platform to Trade:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Binance Card */}
                  <div
                    onClick={() => handleSelectBroker('binance')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      activeBroker === 'binance'
                        ? 'bg-amber-950/20 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                        : 'bg-[#151924] border-[#222938] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🟡</span>
                        <span className="font-extrabold text-sm text-white">Binance App</span>
                      </div>
                      {binanceData.connected ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> CONNECTED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          NOT CONNECTED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mb-2">
                      Bitcoin, Ethereum, Solana, Altcoins &amp; International Crypto
                    </p>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#232B3B]">
                      <span className="text-slate-400">Balance:</span>
                      <span className="font-mono font-bold text-amber-400">
                        ${Number(binanceData.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                      </span>
                    </div>
                  </div>

                  {/* Zerodha Kite Card */}
                  <div
                    onClick={() => handleSelectBroker('kite')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      activeBroker === 'kite'
                        ? 'bg-blue-950/20 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
                        : 'bg-[#151924] border-[#222938] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔵</span>
                        <span className="font-extrabold text-sm text-white">Zerodha Kite App</span>
                      </div>
                      {kiteData.connected ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> CONNECTED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          NOT CONNECTED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mb-2">
                      NSE Indian Stocks (Reliance, Tata, HDFC, Infosys) &amp; F&amp;O
                    </p>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#232B3B]">
                      <span className="text-slate-400">Available Cash:</span>
                      <span className="font-mono font-bold text-blue-400">
                        ₹{Number(kiteData.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* ACTIVE BROKER LOGIN FORM */}
              {activeBroker === 'binance' && (
                <div className="bg-[#151A26] border border-[#263044] rounded-2xl p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-[#222B3D] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🟡</span>
                      <div>
                        <h4 className="font-extrabold text-sm text-white">Binance App Login &amp; Sync</h4>
                        <p className="text-xs text-slate-400">यह लॉगिन हमेशा सेव रहेगा (Permanent Disk Storage)</p>
                      </div>
                    </div>
                    {binanceData.connected && (
                      <button
                        onClick={() => handleDisconnect('binance')}
                        className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 transition-all"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Disconnect</span>
                      </button>
                    )}
                  </div>

                  {binanceData.connected ? (
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span className="font-bold text-sm text-emerald-300">
                            {binanceData.isDemo ? 'Binance Demo Sandbox Active' : 'Binance Live Account Connected & Active'}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-white bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                          ${Number(binanceData.balance || 0).toFixed(2)} USDT
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        आपकी Binance चाबियां सुरक्षित हैं और हमेशा कनेक्टेड रहेंगी। अब आप किसी भी क्रिप्टो (BTC, ETH, SOL) पर Buy दबा सकते हैं, टारगेट (+4%) और स्टॉप-लॉस (-2.5%) अपने आप मॉनिटर और एग्जिट होंगे।
                      </p>
                    </div>
                  ) : null}

                  {/* 1-Click Instant Demo Button */}
                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
                        <Zap className="w-4 h-4" />
                        <span>विकल्प 1: तुरंत शुरू करें (1-Click Demo Sandbox)</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        बिना API Key के $5,000 USDT वर्चुअल बैलेंस से तुरंत Binance क्रिप्टो ऑटो-ट्रेडिंग टेस्ट करें।
                      </p>
                    </div>
                    <button
                      onClick={() => handleBinanceLogin(true)}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 transition-all shadow-md shadow-amber-500/20"
                    >
                      ⚡ 1-Click Demo ($5,000 USDT)
                    </button>
                  </div>

                  {/* Real API Key Form */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>विकल्प 2: असली Binance App API Key जोड़ें (Real Trading)</span>
                    </div>

                    {/* Step-by-Step Hindi Guide */}
                    <div className="bg-[#0F131C] border border-[#232B3B] p-3.5 rounded-xl text-xs space-y-2">
                      <div className="font-bold text-amber-400 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Binance App से API Key कैसे निकालें? (1 मिनट में):</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                        <li><strong>Binance Mobile App</strong> खोलें → ऊपर बाएँ कोने में प्रोफाइल आइकन (☰) दबाएं।</li>
                        <li>Search में <strong>"API Management"</strong> टाइप करें और क्लिक करें।</li>
                        <li><strong>"Create API"</strong> पर क्लिक करें → "System Generated" चुनकर नाम दें: <code>AlphaSignals</code></li>
                        <li>OTP या Passkey डालें। स्क्रीन पर <strong>API Key</strong> और <strong>Secret Key</strong> दिखेगी।</li>
                        <li>(सुरक्षा के लिए केवल "Enable Spot &amp; Margin Trading" ऑन रखें, "Withdraw" कभी ऑन न करें)।</li>
                      </ol>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Binance API Key</label>
                        <input
                          type="text"
                          value={binanceKey}
                          onChange={(e) => setBinanceKey(e.target.value)}
                          placeholder="Paste Binance API Key"
                          className="w-full bg-[#0F131C] border border-[#232B3B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Binance Secret Key</label>
                        <input
                          type="password"
                          value={binanceSecret}
                          onChange={(e) => setBinanceSecret(e.target.value)}
                          placeholder="Paste Binance Secret Key"
                          className="w-full bg-[#0F131C] border border-[#232B3B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleBinanceLogin(false)}
                        disabled={isLoading || !binanceKey || !binanceSecret}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                      >
                        {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span>Verify &amp; Connect Binance App Permanently</span>
                      </button>
                      <a
                        href="https://www.binance.com/en/my/settings/api-management"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        Open Binance API Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                </div>
              )}

              {/* ZERODHA KITE LOGIN FORM */}
              {activeBroker === 'kite' && (
                <div className="bg-[#151A26] border border-[#263044] rounded-2xl p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-[#222B3D] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔵</span>
                      <div>
                        <h4 className="font-extrabold text-sm text-white">Zerodha Kite App Login &amp; Sync</h4>
                        <p className="text-xs text-slate-400">यह लॉगिन हमेशा सेव रहेगा (Permanent Disk Storage)</p>
                      </div>
                    </div>
                    {kiteData.connected && (
                      <button
                        onClick={() => handleDisconnect('kite')}
                        className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 transition-all"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Disconnect</span>
                      </button>
                    )}
                  </div>

                  {kiteData.connected ? (
                    <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-blue-400" />
                          <span className="font-bold text-sm text-blue-300">
                            {kiteData.isDemo ? 'Zerodha Demo Sandbox Active' : `Zerodha Kite Connected (${kiteData.userName || 'Verified'})`}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-white bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                          ₹{Number(kiteData.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Available
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Zerodha Kite सत्र सक्रिय है। जब भी आप भारतीय शेयरों (Reliance, Tata Motors आदि) में ट्रेड करेंगे, टारगेट और स्टॉप-लॉस अपने आप मॉनिटर और एग्जिट होंगे।
                      </p>
                    </div>
                  ) : null}

                  {/* 1-Click Instant Demo Button */}
                  <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-blue-400">
                        <Zap className="w-4 h-4" />
                        <span>विकल्प 1: तुरंत शुरू करें (1-Click Demo ₹1,00,000)</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        बिना किसी API के ₹1,00,000 वर्चुअल कैश के साथ तुरंत Zerodha Kite ऑटो-ट्रेडिंग टेस्ट करें।
                      </p>
                    </div>
                    <button
                      onClick={() => handleKiteLogin(true)}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shrink-0 transition-all shadow-md shadow-blue-500/20"
                    >
                      ⚡ 1-Click Kite Demo (₹1,00,000)
                    </button>
                  </div>

                  {/* Kite Method Selector */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        विकल्प 2: असली Zerodha Kite अकाउंट जोड़ें:
                      </span>
                      <div className="flex items-center gap-1 bg-[#0F131C] p-1 rounded-lg border border-[#232B3B] text-xs">
                        <button
                          onClick={() => setKiteMethod('enctoken')}
                          className={`px-2.5 py-1 rounded transition-all ${
                            kiteMethod === 'enctoken' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Enctoken (Free &amp; Direct)
                        </button>
                        <button
                          onClick={() => setKiteMethod('apikey')}
                          className={`px-2.5 py-1 rounded transition-all ${
                            kiteMethod === 'apikey' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Kite Connect API
                        </button>
                      </div>
                    </div>

                    {/* METHOD A: ENCTOKEN (FREE) */}
                    {kiteMethod === 'enctoken' && (
                      <div className="space-y-3">
                        <div className="bg-[#0F131C] border border-[#232B3B] p-3.5 rounded-xl text-xs space-y-2">
                          <div className="font-bold text-blue-400 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Enctoken कैसे निकालें? (100% Free - कोई ₹2,000 API फीस नहीं!):</span>
                          </div>
                          <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                            <li>कंप्यूटर ब्राउज़र में <strong>kite.zerodha.com</strong> खोलें और लॉग इन करें।</li>
                            <li>कीबोर्ड पर <strong>F12</strong> दबाएं (Inspect element खुल जाएगा)।</li>
                            <li><strong>Application</strong> (या Storage) टैब में जाएं → बाएं साइडबार में <strong>Cookies</strong> → <code>https://kite.zerodha.com</code> पर क्लिक करें।</li>
                            <li>सूची में <strong>enctoken</strong> नाम दिखेगा, उसकी Value कॉपी करके नीचे पेस्ट करें:</li>
                          </ol>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Kite Enctoken Value</label>
                          <input
                            type="password"
                            value={kiteEnctoken}
                            onChange={(e) => setKiteEnctoken(e.target.value)}
                            placeholder="Paste your enctoken value here"
                            className="w-full bg-[#0F131C] border border-[#232B3B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleKiteLogin(false)}
                            disabled={isLoading || !kiteEnctoken}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                          >
                            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            <span>Verify &amp; Connect Zerodha Kite Permanently</span>
                          </button>
                          <a
                            href="https://kite.zerodha.com"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            Open Kite Web <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* METHOD B: KITE CONNECT API KEY */}
                    {kiteMethod === 'apikey' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Kite API Key</label>
                            <input
                              type="text"
                              value={kiteApiKey}
                              onChange={(e) => setKiteApiKey(e.target.value)}
                              placeholder="Enter Kite API Key"
                              className="w-full bg-[#0F131C] border border-[#232B3B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Kite API Secret</label>
                            <input
                              type="password"
                              value={kiteApiSecret}
                              onChange={(e) => setKiteApiSecret(e.target.value)}
                              placeholder="Enter Kite API Secret"
                              className="w-full bg-[#0F131C] border border-[#232B3B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              if (!kiteApiKey) {
                                alert('Please enter Kite API Key first.');
                                return;
                              }
                              window.location.href = `https://kite.zerodha.com/connect/login?v=3&api_key=${kiteApiKey.trim()}`;
                            }}
                            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Login via Official Kite Connect Portal</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 2: ACTIVE TRADES */}
          {activeTab === 'POSITIONS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#151A26] border border-[#263044] p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Open Trades</span>
                    <div className="text-xl font-extrabold text-white mt-0.5">{openPositions.length} Positions</div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
                </div>

                <div className="bg-[#151A26] border border-[#263044] p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Live P&amp;L</span>
                    <div className={`text-xl font-extrabold mt-0.5 ${totalOpenPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {totalOpenPnl >= 0 ? '+' : ''}{totalOpenPnl.toFixed(2)}
                    </div>
                  </div>
                  {totalOpenPnl >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-rose-400" />}
                </div>

                <div className="bg-[#151A26] border border-[#263044] p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Auto-Exit Engine</span>
                    <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Target (+4%) / Stop (-2.5%)
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    4s Loop Active
                  </span>
                </div>
              </div>

              {/* Positions Table */}
              <div className="bg-[#151A26] border border-[#263044] rounded-2xl overflow-hidden shadow-lg">
                <div className="px-4 py-3 border-b border-[#222B3D] bg-[#0E121B] flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Active Open Positions (स्वचालित निगरानी चालू है)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    टारगेट आते ही ऑटोमैटिक प्रॉफिट बुक होगा
                  </span>
                </div>

                {openPositions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    कोई ओपन पोजीशन नहीं है। होम स्क्रीन से किसी भी स्टॉक या क्रिप्टो में "BUY" पर क्लिक करें।
                  </div>
                ) : (
                  <div className="divide-y divide-[#222B3D]">
                    {openPositions.map((pos) => {
                      const curr = pos.currency || (pos.symbol?.endsWith('USDT') ? '$' : '₹');
                      const pnlColor = (pos.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400';
                      return (
                        <div key={pos.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1A2030] transition-colors">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white">{pos.cleanSymbol || pos.symbol}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase">
                                {pos.broker}
                              </span>
                              <span className="text-xs text-slate-400">Qty: {pos.quantity}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                              <span>Entry: {curr}{pos.entryPrice}</span>
                              <span className="text-emerald-400">Target: {curr}{pos.target} (+4%)</span>
                              <span className="text-rose-400">Stop: {curr}{pos.stopLoss} (-2.5%)</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className={`font-black text-sm font-mono ${pnlColor}`}>
                                {(pos.pnl || 0) >= 0 ? '+' : ''}{curr}{Number(pos.pnl || 0).toFixed(2)}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Current: {curr}{pos.currentPrice || pos.entryPrice}
                              </div>
                            </div>

                            <button
                              onClick={() => handleSquareOff(pos.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-bold transition-all"
                            >
                              Square Off
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Closed Positions History */}
              {closedPositions.length > 0 && (
                <div className="bg-[#151A26] border border-[#263044] rounded-2xl overflow-hidden shadow-lg mt-4">
                  <div className="px-4 py-2.5 border-b border-[#222B3D] bg-[#0E121B] text-xs font-bold text-slate-400 uppercase">
                    Past Auto-Exited Trades ({closedPositions.length})
                  </div>
                  <div className="divide-y divide-[#222B3D] max-h-48 overflow-y-auto">
                    {closedPositions.map((pos) => {
                      const curr = pos.currency || '$';
                      return (
                        <div key={pos.id} className="p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                              pos.pnl >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {pos.exitReason?.replace('_', ' ') || 'EXIT'}
                            </span>
                            <span className="font-bold text-white">{pos.cleanSymbol || pos.symbol}</span>
                            <span className="text-slate-400">Entry: {curr}{pos.entryPrice} → Exit: {curr}{pos.exitPrice}</span>
                          </div>
                          <div className={`font-bold font-mono ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos.pnl >= 0 ? '+' : ''}{curr}{pos.pnl?.toFixed(2)} ({pos.pnlPct}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUTO-EXIT LOGS */}
          {activeTab === 'LOGS' && (
            <div className="bg-[#151A26] border border-[#263044] rounded-2xl overflow-hidden p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Execution Audit Trail (कब लगाया और कब निकाला)
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No execution events recorded yet.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[#0F131C] border border-[#222B3D] text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">{log.time}</span>
                        <span className="text-slate-200 font-medium">{log.message}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        log.type === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : log.type === 'EXIT_PROFIT'
                          ? 'bg-teal-500/20 text-teal-300'
                          : log.type === 'EXIT_STOPLOSS'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {log.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
