import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

export default function CandlestickChart({ candles, indicators, markers }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !candles || candles.length === 0) return;

    // Clear previous chart if any
    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#10141C' },
        textColor: '#94A3B8',
        fontSize: 12,
        fontFamily: "'JetBrains Mono', 'Inter', monospace",
      },
      grid: {
        vertLines: { color: '#1C2331' },
        horzLines: { color: '#1C2331' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#3B82F6',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: '#3B82F6',
          width: 1,
          style: 3,
        },
      },
      timeScale: {
        borderColor: '#232936',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#232936',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 380,
    });

    chartInstanceRef.current = chart;

    // 1. Candlestick Series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    const formattedCandles = candles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    })).sort((a, b) => (a.time > b.time ? 1 : -1));

    candleSeries.setData(formattedCandles);

    // 2. EMA 20 line (Cyan)
    if (indicators?.ema20 && indicators.ema20.length > 0) {
      const ema20Series = chart.addLineSeries({
        color: '#06B6D4',
        lineWidth: 1.5,
        title: 'EMA 20',
      });
      ema20Series.setData(indicators.ema20);
    }

    // 3. EMA 50 line (Amber)
    if (indicators?.ema50 && indicators.ema50.length > 0) {
      const ema50Series = chart.addLineSeries({
        color: '#F59E0B',
        lineWidth: 1.5,
        title: 'EMA 50',
      });
      ema50Series.setData(indicators.ema50);
    }

    // 4. Volume Series (bottom)
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set as an overlay
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const volumeData = candles.map(c => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
    })).sort((a, b) => (a.time > b.time ? 1 : -1));

    volumeSeries.setData(volumeData);

    // 5. Historical Buy & Sell Signals markers
    if (markers && markers.length > 0) {
      // lightweight charts requires markers sorted by time ascending
      const sortedMarkers = [...markers].sort((a, b) => (a.time > b.time ? 1 : -1));
      candleSeries.setMarkers(sortedMarkers);
    }

    chart.timeScale().fitContent();

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, indicators, markers]);

  return (
    <div className="w-full relative">
      {/* Legend */}
      <div className="absolute top-2 left-3 z-10 flex items-center gap-3 bg-[#10141C]/80 backdrop-blur px-2.5 py-1 rounded-lg border border-[#232936] text-[11px]">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-[#06B6D4]"></span>
          <span className="text-slate-400">EMA 20</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-[#F59E0B]"></span>
          <span className="text-slate-400">EMA 50</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-emerald-400">Buy Signal</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          <span className="text-rose-400">Sell Signal</span>
        </div>
      </div>

      {/* Chart container */}
      <div ref={chartContainerRef} className="w-full rounded-xl overflow-hidden" />
    </div>
  );
}
