import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  Target, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function OrderConfirmationModal({ stock, brokerStatus, onClose, onOrderPlaced }) {
  const [quantity, setQuantity] = useState(1);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState(null);

  if (!stock) return null;

  const isCrypto = stock.symbol?.endsWith('USDT') || stock.currency === '$' || stock.market === 'CRYPTO';
  const currency = isCrypto ? '$' : '₹';
  
  const price = stock.price || (stock.confluence ? stock.confluence.currentClose : 1000);
  const target = stock.tradeSetup ? stock.tradeSetup.target1 : Number((price * 1.04).toFixed(2));
  const stopLoss = stock.tradeSetup ? stock.tradeSetup.stopLoss : Number((price * 0.975).toFixed(2));
  const totalAmount = Number((price * quantity).toFixed(2));
  const potentialProfit = Number(((target - price) * quantity).toFixed(2));
  const potentialRisk = Number(((price - stopLoss) * quantity).toFixed(2));

  // Determine broker: crypto goes to Binance; Indian stocks go to Kite
  const defaultBroker = isCrypto ? 'binance' : (brokerStatus?.activeBroker || 'kite');
  const isBinance = defaultBroker === 'binance';
  const brokerName = isBinance ? '🟡 Binance App' : '🔵 Zerodha Kite App';
  const isConnected = isBinance ? brokerStatus?.binance?.connected : brokerStatus?.kite?.connected;

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stock.symbol,
          cleanSymbol: stock.cleanSymbol || stock.symbol.replace('.NS', ''),
          price,
          quantity: Number(quantity),
          target,
          stopLoss,
          signalConfidence: stock.confidence || 75
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (onOrderPlaced) onOrderPlaced(data.position);
        onClose();
        alert(`✅ Order Placed Successfully on ${brokerName}!\n\nTarget ${currency}${target} (+4%) और Stop-Loss ${currency}${stopLoss} (-2.5%) पर 24/7 ऑटो-एग्जिट शुरू हो गया है।`);
      } else {
        setError(data.error || 'Failed to place order');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#131722] border border-[#263044] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#202738] bg-[#0E121B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Execute 1-Click Order</h3>
              <p className="text-xs text-slate-400">Target &amp; Stop-Loss अपने आप सेट होंगे</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2535] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Stock Info */}
          <div className="bg-[#0F131C] border border-[#222B3D] p-3.5 rounded-2xl flex items-center justify-between">
            <div>
              <div className="font-extrabold text-base text-white">
                {stock.cleanSymbol || stock.symbol.replace('.NS', '')}
              </div>
              <div className="text-xs text-slate-400">{stock.name}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-white font-mono">{currency}{price}</div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                {stock.signal || 'BUY'} ({stock.confidence || 75}%)
              </span>
            </div>
          </div>

          {/* Broker Route Indicator */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#171D2B] border border-[#232F45] text-xs">
            <span className="text-slate-400">Platform:</span>
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              {brokerName}
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {isConnected ? 'LIVE' : 'DEMO'}
              </span>
            </span>
          </div>

          {/* Quantity Selector */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-semibold">Quantity (संख्या):</span>
              <span className="text-slate-400">Total: <strong className="text-white font-mono">{currency}{totalAmount.toLocaleString()}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 5, 10, 25, 50].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    quantity === q
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-[#0F131C] text-slate-300 border border-[#222B3D] hover:bg-[#1E2535]'
                  }`}
                >
                  {q}
                </button>
              ))}
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-[#0F131C] border border-[#222B3D] rounded-xl px-2 py-1.5 text-xs text-center font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Auto Exit Levels Card */}
          <div className="bg-[#0F131C] border border-[#222B3D] p-3.5 rounded-2xl space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>ऑटो-एग्जिट नियम (कब निकलना है)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Target Exit (+4%)
                </span>
                <div className="text-sm font-black text-white font-mono mt-0.5">{currency}{target}</div>
                <div className="text-[10px] text-emerald-400 font-medium">+{currency}{potentialProfit} Profit</div>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30">
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Stop-Loss Exit (-2.5%)
                </span>
                <div className="text-sm font-black text-white font-mono mt-0.5">{currency}{stopLoss}</div>
                <div className="text-[10px] text-rose-400 font-medium">-{currency}{potentialRisk} Risk Cut</div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handlePlaceOrder}
            disabled={isPlacing}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPlacing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Place Order with Auto-Exit ({currency}{totalAmount})</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            * आर्डर लगते ही टारगेट और स्टॉप-लॉस की 24/7 ऑटोमैटिक निगरानी शुरू हो जाएगी।
          </p>

        </div>

      </div>
    </div>
  );
}
