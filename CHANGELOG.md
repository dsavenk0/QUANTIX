# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0]

### Added
- Added a "Bitcoin Halving Countdown" widget that tracks the current block height, calculates the next halving event, and displays a real-time countdown.

## [1.2.0]

### Added
- Implemented drag-and-drop functionality for reordering dashboard widgets using `dnd-kit`.
- Widgets now feature a drag handle for intuitive repositioning.
- When dragging a widget over another, the target widget displays a "Drop Here" placeholder for clear visual feedback.
- A semi-transparent "ghost" of the widget appears during dragging for a smoother user experience.

### Changed
- Replaced the up/down arrow buttons for moving widgets with the new drag-and-drop system.

## [1.1.0]

### Changed
- Cleaned up TradingView widget interface by hiding most top toolbar buttons, leaving only the "Indicators" button.
- Removed the "Annotations" tool group from the TradingView side toolbar for a cleaner drawing experience.
- The last widget in a row now spans the full width if the total number of widgets is odd, creating a more balanced layout.

### Fixed
- Corrected the time formatting on the Cumulative Delta chart's X-axis to display granular time (`HH:mm:ss`) instead of a single date, accurately reflecting the real-time nature of the data.
- Restored the TradingView chart which was previously invisible due to a configuration error with custom colors.

## [1.0.9]

### Changed
- The changelog process has been updated. From now on, entries will be more detailed, referencing specific code changes where applicable to improve traceability.

## [1.0.8]

### Added
- Integrated the full TradingView widget for advanced charting capabilities.

### Changed
- Replaced the custom-built chart with the TradingView widget.
- Default chart now loads without any pre-set indicators for a cleaner experience.

### Removed
- Removed Coinbase from the list of available exchanges due to its public API limitations for real-time data.
- The following custom chart components are no longer in use: `price-chart.tsx`, `volume-chart.tsx`, `cumulative-delta-chart.tsx`, `market-sentiment.tsx`, `drawing-toolbar.tsx`.

### Fixed
- Corrected an issue where the TradingView widget would fail to display due to incorrect configuration and initialization.
- Resolved a bug causing the OKX order book to not display data correctly.
- Ensured the TradingView widget background matches the site's theme and its corners are properly rounded within the container card.
- Fixed a `TypeError: Load failed` error when selecting some exchanges by improving how loading states and invalid symbols are handled.
- Added a notification to inform users about the lack of real-time data for exchanges that don't support public WebSockets.

## [1.0.7]

### Added
- Full integration for OKX exchange.

### Removed
- Removed Hyperliquid exchange integration.

### Fixed
- Fixed an issue where pairs with stablecoin bases (e.g., `TUSD/USDT`) were filtered out.
- Allowed pairs with `USDC` as the quote currency in the Top Movers list.
- Improved API error handling and stability for Coinbase and Kraken integrations.
- Updated Coinbase integration to use the new Advanced Trade API, resolving deprecation errors. Note: Real-time order book and cumulative delta are unavailable for Coinbase due to new API limitations.

## [1.0.6]

### Added
- Full integration for Coinbase, Kraken, and Bybit exchanges.
- Data for klines, order book, and trades are now fetched from the selected exchange's API.
- Real-time updates via WebSocket for all integrated exchanges.

### Changed
- Refactored exchange integration into a modular client-based architecture.

## [1.0.5]

### Added
- Manual drawing on the price chart with "Brush" and "Trend Line" tools.
- Collapsible drawing toolbar for a cleaner interface.
- Fibonacci Retracement tool added to the drawing toolbar.
- Cumulative Delta indicator to track buying and selling pressure.
- Market Sentiment indicator based on order book depth.

### Changed
- Improved mobile responsiveness for better viewing on smaller devices.
- Corrected Cumulative Delta calculation to be truly cumulative and changed visualization to an area chart.
- Increased y-axis tick count on Cumulative Delta chart for better readability.

### Fixed
- Implemented a robust auto-reconnect mechanism for the WebSocket connection.
- Corrected time formatting on the volume chart for 4h and 1d timeframes.
- Prevented WebSocket errors by ensuring a symbol is always selected.
- Corrected a `try...catch` syntax error.
- Fixed layout issue where RSI panel would overlap other elements.
- Fixed an issue where the RSI line would become flat after layout correction.

## [1.0.4]

### Added
- Top 100 movers list by volume.
- Cryptocurrency icons for the top movers list.
- Clicking on a mover in the list opens its chart.

### Changed
- Moved the Order Book component below the main chart panel.
- Updated main layout to accommodate the new Top Movers list.

## [1.0.3]

### Added
- Technical indicators feature.
- Dropdown menu for selecting indicators (MA 20, 50, 100 and RSI 14).
- MAs are displayed as an overlay on the price chart.
- RSI is displayed in a separate panel below the volume chart.

## [1.0.2]

### Added
- Searchable combobox to find and select any trading pair from Binance.

### Fixed
- Inefficient data fetching that re-fetched entire history on an interval. Data is now streamed via WebSockets.

## [1.0.1]

### Added
- Git and a CHANGELOG.md for versioning application changes.

## [1.0.0]

### Added
- Initial setup of the QUANTIX cryptocurrency trading dashboard.
- Real-time data fetching from Binance API for candlestick charts and order book.
- Candlestick chart with timeframe switching capabilities.
- Order book component.
- Basic layout with header and dynamic naming.

### Fixed
- Multiple React hydration errors.

### Removed
- Placeholder AI functionality and related components.
