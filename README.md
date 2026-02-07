# QUANTIX: Advanced Cryptocurrency Analysis Dashboard

**QUANTIX** is a high-performance dashboard for real-time analysis of cryptocurrency markets. It provides traders with powerful tools to track price dynamics, trading volumes, and market sentiment across several leading exchanges.

![QUANTIX](https://github.com/dsavenk0/QUANTIX/ascii-art.png)

## 🚀 Key Features

- **Advanced Charts**: Integration with **TradingView Advanced Charts** for professional technical analysis.
- **Multi-Exchange Support**: Seamless switching between **Binance, Kraken, Bybit, OKX**.
- **Real-Time Data**: Direct connection to exchange **WebSockets** for instant updates on prices, trades, and the order book.
- **Dynamic Widget Grid**:
    - **Drag-and-Drop**: Easily rearrange widgets.
    - **Resizing**: Adjust the height of each widget.
    - **Expand/Collapse**: Maximize a widget for detailed analysis or collapse it for a compact view.
    - **Pinning**: Pin the most important widgets to the top of the screen.
- **Key Analytical Widgets**:
    - **Top Movers**: A list of the 100 most active assets by trading volume.
    - **Order Book**: A detailed order book with market depth visualization.
    - **Market Sentiment**: A market sentiment indicator based on the ratio of buy and sell orders.
    - **Cumulative Delta**: A cumulative delta chart to track buyer and seller pressure.
- **Personalization**: All layout, visibility, and widget state settings are **saved in cookies**, so your interface remains the same on your next visit.
- **Responsive Design**: Optimized for both desktop and mobile devices.

---

## ⚙️ Architecture

The project is built on modern web technologies with a focus on performance and extensibility.

### Frontend

- **Framework**: **Next.js 15** with the App Router.
- **UI**: **React 19** paired with the **ShadCN UI** component library and styled with **Tailwind CSS**.
- **Charts**: The central element is the **TradingView Advanced Charts Widget**, which provides extensive analysis capabilities.

### State Management

The state management system is fully declarative and built on native **React Hooks** (`useState`, `useEffect`, `useMemo`, `useCallback`).

- **Source of Truth**: `src/app/page.tsx` is the "smart" component that owns the entire state of the dashboard (selected exchange, pair, widget states).
- **Presentational Components**: Widget components (`TopMovers`, `OrderBook`, etc.) are "dumb". They only display data and call handler functions received through `props`.
- **State Persistence**: **Cookies** are used to save user settings between sessions (layout, widget visibility, theme). This eliminates the need for a backend for personalization.

### Widget System

This is the core of the application's interactivity. The entire layout, including order, sizes, and state (collapsed/expanded/pinned), is managed through a single central state `widgets` in `page.tsx`.

- **State**:
    ```typescript
    // Keys to identify each widget
    type WidgetKey = 'topMovers' | 'orderBook' | 'marketSentiment' | 'cumulativeDelta';

    // Object describing the state of one position in the widget grid
    export type WidgetState = { 
      key: WidgetKey;    // Which widget is in this cell
      expanded: boolean; // Is it expanded to full width
      pinned: boolean;   // Is it pinned (cannot be moved/collapsed)
      height: number;    // Current height in pixels
    };
    ```
- **Layout**: A **CSS Grid** with two columns is used on desktop. Widgets can occupy one or both columns (`isFullWidth`). Special logic is applied to the last odd widget in a row to make it span the full width, creating a balanced look.
- **Interactivity**:
    - **Drag-and-Drop**: Implemented using the `dnd-kit` library. An important detail: when dragging, only the widget "keys" (`key`) are swapped, while their properties (size, status) remain tied to the grid cell. This allows moving content while preserving the layout structure.
    - **Resizing**: Implemented using native mouse (`onMouseDown`) and touch (`onTouchStart`) event handlers on a special element in the widget's footer. The height is synchronized between "neighbors" in the same row on desktop.
    - **Pinning**: A pinned widget is always expanded to full width and cannot be moved or resized.

### Exchange Integration

The architecture is designed to make it easy to add new exchanges.

- **Location**: All logic is located in `src/lib/exchanges/`.
- **`ExchangeClient` Interface**: Each exchange implements a common interface (`client.ts`) that defines methods for:
    - `fetchKlines`: Loading historical candlestick data (OHLCV).
    - `fetchOrderBook`: Loading the order book.
    - `fetchAllSymbols`: Getting a list of all available trading pairs.
    - `connect`: Establishing a WebSocket connection to receive real-time data.
- **Client Factory**: The file `src/lib/exchanges/index.ts` exports a `getExchangeClient` function that returns the required client by its name.

---

## 📁 Project Structure

```
src
├── app
│   ├── page.tsx               # Main page, core logic and state
│   └── layout.tsx             # Root layout
├── components
│   ├── dashboard              # Dashboard components
│   │   ├── chart-panel.tsx    # Panel with the TradingView chart
│   │   ├── draggable-widget.tsx # HOC for Drag-and-Drop
│   │   └── *.tsx              # Widget components (OrderBook, TopMovers, etc.)
│   ├── layout                 # Layout components (Header, LoadingScreen)
│   └── ui                     # Components from ShadCN
├── hooks
│   ├── use-mobile.tsx         # Hook to detect mobile devices
│   └── use-toast.ts           # Hook for notifications
└── lib
    ├── exchanges              # Logic for working with exchanges
    │   ├── client.ts          # Exchange client interface
    │   ├── index.ts           # Client factory
    │   └── [exchange].ts      # Client implementations (binance.ts, kraken.ts)
    ├── indicators.ts          # Functions for calculating technical indicators
    └── utils.ts               # Utilities
```

---

## 🔧 Customization and Extension

### How to add a new widget?

1.  **Create the component**: Write a new React component in `src/components/dashboard/`. It should accept `props` from `page.tsx` (functions like `onHide`, `onExpand`, etc.).
2.  **Add a key**: Extend the `WidgetKey` type in `src/app/page.tsx` by adding a unique identifier for your widget.
3.  **Initialize the state**: Add the new widget to the initial states of `widgets` and `widgetVisibility` in `page.tsx`.
4.  **Add rendering logic**: In the JSX markup of `page.tsx`, add an `else if` block to render your component based on its `key`.

### How to add a new exchange?

1.  **Create the client**: In the `src/lib/exchanges/` folder, create a file `my-exchange.ts`.
2.  **Implement the interface**: Create a class that implements the `ExchangeClient` interface and write the logic for all its methods using the new exchange's API and WebSocket endpoints.
3.  **Register the client**: In the `src/lib/exchanges/index.ts` file, import your new client and add it to the `exchangeClients` object.

---

## 🏁 Local Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start the development server**:
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:3000`.
