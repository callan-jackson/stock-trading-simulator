let stockChart = null;
let candleSeries = null;
let volumeSeries = null;
let sma20Series = null;
let sma50Series = null;
let currentSymbol = 'AAPL';
let currentRange = '6mo';

async function initializeChart() {
    const chartContainer = document.getElementById('stockChart');
    if (!chartContainer) return;

    // Clear existing chart
    chartContainer.innerHTML = '';

    // Create new chart
    stockChart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: 400,
        layout: {
            background: { color: '#ffffff' },
            textColor: '#333333',
        },
        grid: {
            vertLines: { color: '#f0f0f0' },
            horzLines: { color: '#f0f0f0' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: '#d1d4dc',
        },
        timeScale: {
            borderColor: '#d1d4dc',
            timeVisible: true,
        },
    });

    // Add candlestick series
    candleSeries = stockChart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
    });

    // Add volume series
    volumeSeries = stockChart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
            top: 0.8,
            bottom: 0,
        },
    });

    // Add SMA series
    sma20Series = stockChart.addLineSeries({
        color: '#2962FF',
        lineWidth: 1,
        title: 'SMA 20',
    });

    sma50Series = stockChart.addLineSeries({
        color: '#FF6D00',
        lineWidth: 1,
        title: 'SMA 50',
    });

    // Setup event listeners
    setupChartControls();
    setupSearchFunctionality();
    
    // Load initial data
    await updateChartData(currentSymbol);

    // Handle window resize
    window.addEventListener('resize', () => {
        if (stockChart) {
            stockChart.resize(
                chartContainer.clientWidth,
                chartContainer.clientHeight
            );
        }
    });
}

async function updateChartData(symbol = currentSymbol) {
    try {
        currentSymbol = symbol;
        document.getElementById('currentSymbol').textContent = symbol;
        
        const response = await fetch(`/api/stocks/${symbol}?range=${currentRange}`);
        const data = await response.json();

        if (!data.history || !data.history.length) {
            console.error('No historical data received');
            return;
        }

        // Prepare candlestick data
        const candleData = data.history.map(item => ({
            time: new Date(item.date).getTime() / 1000,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
        }));

        // Update candlestick series
        candleSeries.setData(candleData);

        // Update volume data
        const volumeData = data.history.map(item => ({
            time: new Date(item.date).getTime() / 1000,
            value: item.volume,
            color: item.close >= item.open ? '#26a69a80' : '#ef535080',
        }));
        volumeSeries.setData(volumeData);

        // Update technical indicators
        if (data.technical) {
            const timestamps = candleData.map(d => d.time);
            
            // Update SMA 20
            if (data.technical.sma20) {
                const sma20Data = data.technical.sma20.map((value, index) => ({
                    time: timestamps[index],
                    value: value,
                }));
                sma20Series.setData(sma20Data);
            }

            // Update SMA 50
            if (data.technical.sma50) {
                const sma50Data = data.technical.sma50.map((value, index) => ({
                    time: timestamps[index],
                    value: value,
                }));
                sma50Series.setData(sma50Data);
            }
        }

        // Update price info
        updatePriceInfo(data.quote);
        
        // Update symbol in trade box
        document.getElementById('symbol').value = symbol;
        document.getElementById('currentPrice').textContent = data.quote.price.toFixed(2);
        updateTotalCost();

    } catch (error) {
        console.error('Failed to fetch chart data:', error);
    }
}

function setupSearchFunctionality() {
    const searchInput = document.getElementById('stockSearch');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/api/stocks/search/${query}`);
            const results = await response.json();

            if (results.length === 0) {
                searchResults.innerHTML = '<div class="search-result">No results found</div>';
            } else {
                searchResults.innerHTML = results.map(stock => `
                    <div class="search-result" onclick="selectStock('${stock.symbol}')">
                        <div class="stock-symbol">${stock.symbol}</div>
                        <div class="stock-name">${stock.name}</div>
                    </div>
                `).join('');
            }

            searchResults.style.display = 'block';
        } catch (error) {
            console.error('Search failed:', error);
        }
    }, 300));

    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.stock-search-container')) {
            searchResults.style.display = 'none';
        }
    });
}

function setupChartControls() {
    // Time range selector
    const timeRange = document.getElementById('timeRange');
    if (timeRange) {
        timeRange.addEventListener('change', async (e) => {
            currentRange = e.target.value;
            await updateChartData();
        });
    }

    // Indicator toggles
    const sma20Toggle = document.getElementById('sma20');
    const sma50Toggle = document.getElementById('sma50');
    const volumeToggle = document.getElementById('volume');

    if (sma20Toggle) {
        sma20Toggle.addEventListener('change', (e) => {
            sma20Series.applyOptions({ visible: e.target.checked });
        });
    }

    if (sma50Toggle) {
        sma50Toggle.addEventListener('change', (e) => {
            sma50Series.applyOptions({ visible: e.target.checked });
        });
    }

    if (volumeToggle) {
        volumeToggle.addEventListener('change', (e) => {
            volumeSeries.applyOptions({ visible: e.target.checked });
        });
    }
}

// Select stock from search results
async function selectStock(symbol) {
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('stockSearch').value = symbol;
    await updateChartData(symbol);
}

function updatePriceInfo(quote) {
    if (!quote) return;

    const currentPriceElement = document.getElementById('currentPrice');
    if (currentPriceElement) {
        // Update without the $ sign - it will be added in the HTML
        currentPriceElement.textContent = quote.price.toFixed(2);
    }

    // Update legend
    const legend = document.getElementById('chartLegend');
    if (legend) {
        const changeClass = quote.change >= 0 ? 'positive' : 'negative';
        const changeSign = quote.change >= 0 ? '+' : '';

        legend.innerHTML = `
            <div class="legend-item">
                <span>Price: ${formatCurrency(quote.price)}</span>
            </div>
            <div class="legend-item ${changeClass}">
                <span>Change: ${changeSign}${formatCurrency(quote.change)} (${changeSign}${quote.changePercent.toFixed(2)}%)</span>
            </div>
            <div class="legend-item">
                <span>Volume: ${formatNumber(quote.volume)}</span>
            </div>
        `;
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', initializeChart);