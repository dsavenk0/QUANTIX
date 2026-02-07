# **App Name**: MarketPulse Stream

## Core Features:

- Exchange Adapter: Abstract base class for exchange integrations with WebSocket connection management, auto-reconnect, stream subscriptions (depthUpdate, trade, markPrice) using ccxt or native ws.
- Local Orderbook Management: Buffer events and maintain a synchronized local Orderbook (Bids/Asks) derived from snapshots + diff updates for Binance. Bids/Asks shall be maintained in-memory using high-performance data structures.
- Metrics Calculation: Calculate Bid_Total, Ask_Total, Diff, and Delta based on order book data at specified depth levels (1.5%, 3%, 5%, 8%, 15%, 30%, 60%). Values converted to Millions of USD ($mln) using mathjs or native BigNumber.
- Aggregated Market Average Calculation: Logic to aggregate (Sum Bids / Sum Asks) across multiple pairs.
- Data Bundling and Firebase Sync: Bundle OHLCV data with calculated indicators (delta, diff, funding, liq_long_pred). Ensure the chart price, indicators and predictions from the AI models will be available for TradingView.
- Live Data Push to Firebase: Synchronize bundled data to Firebase Realtime Database at `live_feed/{exchange}/{symbol}` in JSON format, delivering necessary signals for the TradingView application. Firebase Admin SDK to be used for interacting with Firestore.
- Liquidation Prediction: An AI model predicts likely long liquidation price levels based on a variety of indicators and then includes that in the Firestore output for visualization in the frontend as a decision making tool.

## Style Guidelines:

- Primary color: Deep indigo (#4B0082) to evoke a sense of depth, insight, and the vastness of market data.
- Background color: Very dark desaturated indigo (#120321) for high contrast and to allow data visualizations to pop.
- Accent color: Electric purple (#BF00FF) to highlight critical metrics and interactive elements.
- Body and headline font: 'Space Grotesk' (sans-serif) for a computerized, techy feel. For larger chunks of text use 'Inter' (sans-serif).
- Code font: 'Source Code Pro' (monospace) for displaying code snippets, algorithms, and configurations.
- Design a data-dense layout optimized for real-time monitoring, clear charts, and concise tabular data presentation.
- Implement smooth, subtle animations to reflect real-time updates and maintain user engagement without distracting from the data.