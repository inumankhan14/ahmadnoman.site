// Constants
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const COINS_PER_PAGE = 250; // Maximum allowed by CoinGecko API

// DOM Elements
const coinGrid = document.querySelector('.coin-grid');

// State
let coins = [];
let lastUpdateTime = new Date();

// Format time ago
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };
    
    for (let [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }
    return 'Just now';
}

// Format large numbers
function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

// Create sparkline chart
function createSparkline(prices, color) {
    const width = 120;
    const height = 40;
    const padding = 5;
    
    // Find min and max values
    const values = prices.map(p => p);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate points
    const points = prices.map((price, i) => {
        const x = (i / (prices.length - 1)) * (width - 2 * padding) + padding;
        const y = height - padding - ((price - min) / (max - min)) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');
    
    return `
        <svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <path d="M ${points}" fill="none" stroke="${color}" stroke-width="2"/>
        </svg>
    `;
}

// Fetch coins data
async function fetchCoins(page = 1) {
    try {
        const response = await fetch(
            `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${COINS_PER_PAGE}&page=${page}&sparkline=true&price_change_percentage=24h`
        );
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

// Create coin card
function createCoinCard(coin) {
    const priceChangeClass = coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
    const sparklineColor = coin.price_change_percentage_24h >= 0 ? '#00ff88' : '#ff4444';
    
    return `
        <div class="coin-card">
            <div class="coin-left">
                <img src="${coin.image}" alt="${coin.name}" class="coin-logo">
                <div class="coin-info">
                    <div class="coin-name">${coin.symbol.toUpperCase()}</div>
                    <div class="coin-fullname">${coin.name}</div>
                </div>
            </div>
            <div class="coin-middle">
                <div class="price-container">
                    <div class="coin-price">$${coin.current_price.toFixed(2)}</div>
                    <div class="coin-change ${priceChangeClass}">
                        ${coin.price_change_percentage_24h >= 0 ? '↑' : '↓'}
                        ${Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                    </div>
                </div>
                <div class="chart-container">
                    ${createSparkline(coin.sparkline_in_7d.price, sparklineColor)}
                </div>
                <div class="market-cap">$${formatNumber(coin.market_cap)}</div>
            </div>
            <div class="coin-right">
                <div class="coin-update" data-timestamp="${Date.now()}">Just now</div>
            </div>
        </div>
    `;
}

// Load and display coins
async function loadCoins() {
    const coinGrid = document.querySelector('.coin-grid');
    let page = 1;
    let allCoins = [];
    
    // Show loading state
    coinGrid.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading cryptocurrencies...</div>';
    
    // Fetch first batch of coins
    const initialCoins = await fetchCoins(page);
    allCoins = [...initialCoins];
    
    // Display initial coins
    if (allCoins.length > 0) {
        coinGrid.innerHTML = allCoins.map(coin => createCoinCard(coin)).join('');
    } else {
        coinGrid.innerHTML = '<div style="text-align: center; padding: 2rem;">No cryptocurrencies found</div>';
    }
    
    // Load more coins when scrolling near bottom
    const observer = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting) {
            page++;
            const moreCoins = await fetchCoins(page);
            if (moreCoins.length > 0) {
                allCoins = [...allCoins, ...moreCoins];
                coinGrid.innerHTML = allCoins.map(coin => createCoinCard(coin)).join('');
            }
        }
    }, { threshold: 0.1 });
    
    // Observe last coin card for infinite scroll
    const lastCard = coinGrid.lastElementChild;
    if (lastCard) {
        observer.observe(lastCard);
    }
}

// Update timestamps
function updateTimestamps() {
    document.querySelectorAll('.coin-update').forEach(element => {
        const timestamp = parseInt(element.dataset.timestamp);
        element.textContent = formatTimeAgo(timestamp);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCoins();
    
    // Update timestamps every second
    setInterval(updateTimestamps, 1000);
    
    // Refresh coin data every 30 seconds
    setInterval(loadCoins, 30000);
}); 