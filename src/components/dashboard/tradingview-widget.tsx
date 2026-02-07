
'use client';

import React, { useEffect, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  exchange: string;
  timeframe: string;
  isToolbarVisible: boolean;
  isDetailsVisible: boolean;
}

const tvTimeframeMap: { [key: string]: string } = {
  '1m': '1',
  '5m': '5',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
};

const WIDGET_CONTAINER_ID = 'tradingview_widget_container';

function TradingViewWidget({ symbol, exchange, timeframe, isToolbarVisible, isDetailsVisible }: TradingViewWidgetProps) {

  useEffect(() => {
    const createWidget = () => {
      if (typeof (window as any).TradingView === 'undefined' || !document.getElementById(WIDGET_CONTAINER_ID)) {
        return;
      }
      
      const container = document.getElementById(WIDGET_CONTAINER_ID);
      if (container) {
          container.innerHTML = '';
      }

      new (window as any).TradingView.widget({
        autosize: true,
        symbol: `${exchange.toUpperCase()}:${symbol.replace('-', '').toUpperCase()}`,
        interval: tvTimeframeMap[timeframe] || '240',
        timezone: 'Etc/UTC',
        theme: "dark",
        style: '1',
        locale: 'en',
        enable_publishing: false,
        withdateranges: false,
        hide_side_toolbar: !isToolbarVisible,
        allow_symbol_change: true, 
        hide_top_toolbar: false,
        details: isDetailsVisible,
        hide_bottom_toolbar: true,
        container_id: WIDGET_CONTAINER_ID,
        disabled_features: [
            "header_symbol_search",
            "header_resolutions",
            'header_chart_type',
            'header_settings',
            'header_compare',
            'header_screenshot',
            'header_fullscreen_button',
            'annotations_tool_group',
            "use_localstorage_for_settings"
        ],
        enabled_features: [
            'header_indicators',
        ],
        overrides: {
            "paneProperties.background": "rgba(16, 24, 19, 0.5)",
            "scalesProperties.textColor": "#61DCC2",
        },
      });
    };

    const scriptId = 'tradingview-widget-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = createWidget;
      document.head.appendChild(script);
    } else {
      createWidget();
    }
    
  }, [symbol, exchange, timeframe, isToolbarVisible, isDetailsVisible]);

  return (
    <div id={WIDGET_CONTAINER_ID} className="h-full w-full" />
  );
}

export default memo(TradingViewWidget);
