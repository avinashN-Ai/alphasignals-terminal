import React from 'react';
import { 
  X, 
  BookOpen, 
  Target, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle,
  TrendingUp,
  Percent
} from 'lucide-react';

export default function TradingGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#151922] border border-[#2B3547] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232936] flex items-center justify-between bg-[#10141C]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Stock Analysis &amp; Buy/Sell Accuracy Guide (गाइड)
              </h3>
              <p className="text-xs text-slate-400">
                एक्यूरेसी कैसे नापें और सही स्टॉक चुनकर प्रॉफिटेबल ट्रेड कैसे लें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2535] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          
          {/* Section 1: Accuracy Formula */}
          <div className="bg-[#10141C] border border-[#232936] rounded-xl p-4">
            <h4 className="font-bold text-white flex items-center gap-2 mb-2 text-emerald-400">
              <Target className="w-4 h-4" />
              1. Buy &amp; Sell Accuracy (Win-Rate %) कैसे कैलकुलेट होती है?
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              हमारा सिस्टम हर स्टॉक के पिछले 250 से 500 ट्रेडिंग दिनों (Historical Daily Candles) पर बिना किसी चीटिंग के बैकटेस्टिंग रन करता है:
            </p>
            <div className="bg-[#171D28] p-3 rounded-lg border border-[#232B3B] text-xs font-mono text-emerald-300 mb-3">
              Accuracy (Win-Rate %) = (Target Hit होने वाले सफल ट्रेड्स / कुल ट्रेड्स) × 100
            </div>
            <ul className="text-xs space-y-1.5 list-disc list-inside text-slate-400">
              <li><strong className="text-slate-200">विन (Win):</strong> जब स्टॉक का प्राइस Stop Loss हिट होने से पहले Target (+4%) पर पहुंच जाता है।</li>
              <li><strong className="text-slate-200">लॉस (Loss):</strong> जब प्राइस Target से पहले Stop Loss (-2%) काट देता है।</li>
              <li><strong className="text-slate-200">प्रॉफिट फैक्टर (Profit Factor):</strong> कुल कमाए गए मुनाफे और कुल नुकसान का अनुपात। 1.5 से अधिक होना बेहतरीन माना जाता है।</li>
            </ul>
          </div>

          {/* Section 2: Confluence Signals */}
          <div className="bg-[#10141C] border border-[#232936] rounded-xl p-4">
            <h4 className="font-bold text-white flex items-center gap-2 mb-2 text-teal-400">
              <ShieldCheck className="w-4 h-4" />
              2. Confluence Signals (एक साथ कई इंडिकेटर्स का संगम)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              सिर्फ एक इंडिकेटर (जैसे केवल RSI) से 50% फेक सिग्नल मिलते हैं। इसलिए हमारा प्लेटफॉर्म 5 फैक्टर्स को मिलाता है:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-[#151922] border border-[#232936]">
                <strong className="text-white">1. EMA 20 &amp; 50:</strong> ट्रेंड की दिशा। जब प्राइस EMA 20 और 50 के ऊपर हो तो केवल Buy ट्रेड लें।
              </div>
              <div className="p-2.5 rounded-lg bg-[#151922] border border-[#232936]">
                <strong className="text-white">2. RSI (14):</strong> मोमेंटम। 45-65 का लेवल सबसे सेफ बुलिश जोन होता है। &lt;30 पर बाउंस का मौका।
              </div>
              <div className="p-2.5 rounded-lg bg-[#151922] border border-[#232936]">
                <strong className="text-white">3. MACD Crossover:</strong> जब MACD लाइन सिग्नल लाइन को ऊपर क्रॉस करे तो तेजी की पुष्टि होती है।
              </div>
              <div className="p-2.5 rounded-lg bg-[#151922] border border-[#232936]">
                <strong className="text-white">4. Supertrend (10,3):</strong> ग्रीन सुपरट्रेंड ट्रेलिंग स्टॉप-लॉस और सपोर्ट का काम करता है।
              </div>
            </div>
          </div>

          {/* Section 3: 5 Golden Rules */}
          <div className="bg-[#10141C] border border-[#232936] rounded-xl p-4">
            <h4 className="font-bold text-white flex items-center gap-2 mb-2 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              3. ट्रेडिंग के 5 अनिवार्य सुनहरे नियम (Golden Rules)
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>कभी बिना स्टॉप-लॉस ट्रेड न करें:</strong> हर ट्रेड में स्टॉप-लॉस पहले से तय रखें।</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Risk-to-Reward रेश्यो:</strong> हमेशा कम से कम 1:1.5 या 1:2 रखें ताकि 50% एक्यूरेसी पर भी आप प्रॉफिट में रहें।</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>हाई एक्यूरेसी (&gt;70%) वाले स्टॉक्स चुनें:</strong> स्क्रीनर में फ़िल्टर लगाकर केवल उन स्टॉक्स में ट्रेड करें जिनका ऐतिहासिक ट्रैक रिकॉर्ड मजबूत है।</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>कैपिटल रिस्क मैनेजमेंट:</strong> किसी भी एक ट्रेड में अपनी कुल पूँजी का 1% से 2% से अधिक रिस्क न लें।</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#232936] bg-[#10141C] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
          >
            समझ गया (Got It)
          </button>
        </div>

      </div>
    </div>
  );
}
