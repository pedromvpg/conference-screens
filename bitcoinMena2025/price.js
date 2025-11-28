// Global chart variable
let priceChart = null;

class BitcoinPriceDisplay {
    constructor() {
        // Check URL parameter for currency (default to USD)
        const urlParams = new URLSearchParams(window.location.search);
        this.currency = urlParams.get('currency')?.toUpperCase() === 'EUR' ? 'EUR' : 'USD';
        
        this.latestApiUrl = 'https://mempool.space/api/v1/prices';
        this.historicalApiUrl = `https://mempool.space/api/v1/historical-price?currency=${this.currency}`;
        this.refreshInterval = 3000; // 3 seconds to match the reference script
        this.priceElement = document.getElementById('price');
        this.errorElement = document.getElementById('error-message');
        this.loadingElement = document.getElementById('loading-spinner');
        this.lastUpdatedElement = document.getElementById('last-updated');
        this.priceValueContainer = document.getElementById('price-value');
        this.currencyElement = document.querySelector('.currency');
        
        this.currentPrice = null;
        this.startOfYearPrice = null;
        
        // Update currency label in HTML
        if (this.currencyElement) {
            this.currencyElement.textContent = this.currency;
        }
        
        this.init();
    }

    async init() {
        await this.fetchBitcoinPrice();
        this.startRefreshInterval();
        this.hideLoading();
    }

    async fetchBitcoinPrice() {
        try {
            // Fetch latest price from mempool.space
            const latestResponse = await fetch(this.latestApiUrl);
            const latestJson = await latestResponse.json();
            const priceText = Number(latestJson[this.currency]).toLocaleString();
            
            if (this.priceElement) {
                this.priceElement.textContent = priceText;
                this.currentPrice = latestJson[this.currency];
            }

            // Fetch historical prices for chart
            const response = await fetch(this.historicalApiUrl);
            const json = await response.json();
            
            if (json.prices && json.prices.length > 0) {
                // Prepare data for chart (YTD)
                const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
                const pricesYTD = json.prices.filter(p => p.time >= startOfYear).slice().reverse(); // oldest to newest
                
                const labels = pricesYTD.map(p => {
                    const d = new Date(p.time * 1000);
                    return d.toLocaleDateString();
                });
                const data = pricesYTD.map(p => p[this.currency]);

                // Draw chart
                this.updateChart(labels, data);
            }

            this.updateLastUpdated();
            this.hideError();
            
        } catch (e) {
            if (this.priceElement) {
                this.priceElement.textContent = 'Error fetching price.';
            }
            console.error('Error fetching or parsing price:', e);
            this.showError('Failed to fetch Bitcoin price. Please check your connection.');
        }
    }

    updateChart(labels, data) {
        const ctxElem = document.getElementById('price-chart');
        if (ctxElem) {
            let ctx = ctxElem.getContext ? ctxElem.getContext('2d') : null;
            if (!ctx && ctxElem.tagName === 'CANVAS') {
                ctx = ctxElem.getContext('2d');
            }
            if (!ctx && ctxElem.tagName !== 'CANVAS') {
                // If #price-chart is not a canvas, replace it with one
                const canvas = document.createElement('canvas');
                canvas.id = 'price-chart';
                ctxElem.parentNode.replaceChild(canvas, ctxElem);
                ctx = canvas.getContext('2d');
            }
            if (ctx) {
                if (priceChart) {
                    priceChart.data.labels = labels;
                    priceChart.data.datasets[0].data = data;
                    priceChart.update();
                } else {
                    priceChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: `BTC/${this.currency}`,
                                data: data,
                                borderColor: '#ffffff',
                                backgroundColor: 'rgba(255, 255, 255, 0)',
                                pointRadius: 0,
                                borderWidth: 3,
                                fill: false,
                                tension: 0.1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                title: {
                                    display: false
                                }
                            },
                            scales: {
                                x: {
                                    display: false
                                },
                                y: {
                                    display: false
                                }
                            },
                            elements: {
                                point: {
                                    radius: 0
                                }
                            },
                            interaction: {
                                intersect: false
                            }
                        }
                    });
                }
            }
        }
    }

    updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        this.lastUpdatedElement.textContent = `Last updated: ${timeString}`;
    }

    hideLoading() {
        this.loadingElement.style.display = 'none';
        this.priceElement.style.display = 'inline';
    }

    showError(message) {
        this.errorElement.textContent = message;
        this.errorElement.style.display = 'block';
        this.hideLoading();
    }

    hideError() {
        this.errorElement.style.display = 'none';
    }

    startRefreshInterval() {
        setInterval(() => {
            this.fetchBitcoinPrice();
        }, this.refreshInterval);
    }
}

// Initialize the Bitcoin price display when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BitcoinPriceDisplay();
});

// Handle visibility change to pause/resume updates
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - updates will continue in background');
    } else {
        console.log('Page visible - refreshing data');
        // Optionally trigger an immediate refresh when page becomes visible
    }
}); 