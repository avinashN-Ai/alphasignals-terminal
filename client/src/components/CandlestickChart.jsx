import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

// Helper to deduplicate and strictly sort time-series data for lightweight-charts
function deduplicateByTime(arr) {
  if (!Array.isArray(arr)) return [];
  const map = new Map();
  for (const item of arr) {
    if (item && item.time) {
      map.set(item.time, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
}

export default function CandlestickChart({ candles, indicators, markers }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !candles || candles.length === 0) return;

    chartContainerRef.current.innerHTML = '';

    let chart = null;
    try {
      const containerWidth = chartContainerRef.current.clientWidth || 340;
      const isMobile = window.innerWidth < 640;

      chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#10141C' },
          textColor: '#94A3B8',
          fontSize: isMobile ? 10 : 12,
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
        width: containerWidth,
        height: isMobile ? 280 : 380,
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

      const formattedCandles = deduplicateByTime(
        candles.map(c => ({
          time: c.time || c.date,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume || 0)
        }))
      );

      candleSeries.setData(formattedCandles);

      // 2. EMA 20 line (Cyan)
      if (indicators?.ema20 && indicators.ema20.length > 0) {
        const ema20Series = chart.addLineSeries({
          color: '#06B6D4',
          lineWidth: 1.5,
          title: 'EMA 20',
        });
        ema20Series.setData(deduplicateByTime(indicators.ema20));
      }

      // 3. EMA 50 line (Amber)
      if (indicators?.ema50 && indicators.ema50.length > 0) {
        const ema50Series = chart.addLineSeries({
          color: '#F59E0B',
          lineWidth: 1.5,
          title: 'EMA 50',
        });
        ema50Series.setData(deduplicateByTime(indicators.ema50));
      }

      // 4. Volume Series (bottom)
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });

      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      const volumeData = formattedCandles.map(c => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)',
      }));

      volumeSeries.setData(volumeData);

      // 5. Markers for Buy / Sell Signals
      if (markers && markers.length > 0) {
        const validTimes = new Set(formattedCandles.map(c => c.time));
        const deduplicatedMarkers = deduplicateByTime(
          markers.filter(m => m && validTimes.has(m.time))
        );
        candleSeries.setMarkers(deduplicatedMarkers);
      }

      chart.timeScale().fitContent();
    } catch (err) {
      console.error('Chart rendering warning:', err);
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth || 340,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.remove();
        } catch (e) {}
        chartInstanceRef.current = null;
      }
    };
  }, [candles, indicators, markers]);

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap items-center gap-3 mb-2 px-2 text-[11px] font-medium text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span>
          <span>20 EMA</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span>
          <span>50 EMA</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
          <span>Buy Entry</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
          <span>Target / SL Exit</span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full rounded-xl overflow-hidden min-h-[280px]" />
    </div>
  );
}
