// Global chart variable
let priceChart = null;

class BitcoinPriceDisplay {
    constructor() {
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check if dual currency mode is enabled
        this.dualCurrency = urlParams.get('dualCurrency') === 'true';
        
        // Set local currency (EUR for Amsterdam, CNY for Asia, AED for MENA)
        const localCurrencyParam = urlParams.get('localCurrency')?.toUpperCase();
        this.localCurrency = localCurrencyParam || 'AED'; // Default to AED for MENA
        
        // In dual currency mode, we'll alternate between USD and local currency
        // In single currency mode, use the specified currency or USD
        if (this.dualCurrency) {
            this.currencies = ['USD', this.localCurrency];
            this.currentCurrencyIndex = 0;
            this.currency = this.currencies[0];
        } else {
            this.currency = urlParams.get('currency')?.toUpperCase() || 'USD';
        }
        
        this.priceApiUrl = 'https://pvxg.net/bitcoin-price/index.php';
        this.historicalApiUrl = `https://mempool.space/api/v1/historical-price?currency=${this.currency}`;
        this.refreshInterval = 3000; // 3 seconds for price updates
        this.currencyAnimationInterval = 5000; // 5 seconds between currency switches
        
        this.priceElement = document.getElementById('price');
        this.errorElement = document.getElementById('error-message');
        this.loadingElement = document.getElementById('loading-spinner');
        this.lastUpdatedElement = document.getElementById('last-updated');
        this.priceValueContainer = document.getElementById('price-value');
        this.currencyElement = document.querySelector('.currency');
        
        this.currentPrice = null;
        this.startOfYearPrice = null;
        this.allPrices = {}; // Store all currency prices
        
        // Update currency label in HTML
        if (this.currencyElement) {
            this.currencyElement.textContent = this.currency;
        }
        
        // Set fixed width for dual currency mode to prevent layout shift
        if (this.dualCurrency && this.priceValueContainer) {
            this.priceValueContainer.style.width = '38vw';
            this.priceValueContainer.style.transition = 'width 0.3s ease';
        }
        
        this.init();
    }

    async init() {
        await this.fetchBitcoinPrice();
        this.startRefreshInterval();
        
        // Start currency animation if in dual currency mode
        if (this.dualCurrency) {
            this.startCurrencyAnimation();
        }
        
        this.hideLoading();
    }

    async fetchBitcoinPrice() {
        try {
            // Fetch latest prices from pvxg.net API
            const response = await fetch(this.priceApiUrl);
            const data = await response.json();
            
            // Store all prices
            this.allPrices = {
                USD: data.USD,
                EUR: data.EUR,
                GBP: data.GBP,
                CNY: data.CNY,
                JPY: data.JPY,
                CAD: data.CAD,
                CHF: data.CHF,
                RUB: data.RUB,
                BRL: data.BRL,
                AED: data.AED,
                TRY: data.TRY,
                AUD: data.AUD,
                MXN: data.MXN,
                THB: data.THB,
                ILS: data.ILS,
                INR: data.INR,
                ZAR: data.ZAR,
                SEK: data.SEK,
                SAR: data.SAR,
                ARS: data.ARS
            };
            
            // Update current price display
            this.updatePriceDisplay();

            // Fetch historical prices for chart (still using mempool.space for historical data)
            await this.updateHistoricalChart();

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

    updatePriceDisplay() {
        const price = this.allPrices[this.currency];
        if (price && this.priceElement) {
            const priceText = Number(price).toLocaleString();
            
            // Add leading zero in grey if price is below 100,000
            if (price < 100000) {
                this.priceElement.innerHTML = `<span style="color: #444; text-shadow: none; filter: none; opacity: 1;">0</span>${priceText}`;
            } else {
                this.priceElement.textContent = priceText;
            }
            
            this.currentPrice = price;
        }
        
        // Update currency label
        if (this.currencyElement) {
            this.currencyElement.textContent = this.currency;
        }
    }

    async updateHistoricalChart() {
        try {
            const historicalUrl = `https://mempool.space/api/v1/historical-price?currency=${this.currency}`;
            const response = await fetch(historicalUrl);
            const json = await response.json();
            
            if (json.prices && json.prices.length > 0) {
                // Prepare data for chart (YTD)
                const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
                const pricesYTD = json.prices.filter(p => p.time >= startOfYear).slice().reverse();
                
                const labels = pricesYTD.map(p => {
                    const d = new Date(p.time * 1000);
                    return d.toLocaleDateString();
                });
                const data = pricesYTD.map(p => p[this.currency]);

                // Draw chart
                this.updateChart(labels, data);
            }
        } catch (e) {
            console.error('Error fetching historical data:', e);
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

    animateCounterToValue(targetValue) {
        if (!this.priceElement) return;
        
        const currentText = this.priceElement.textContent.replace(/,/g, '');
        const currentValue = parseFloat(currentText) || 0;
        const target = parseFloat(targetValue);
        
        const duration = 800; // Animation duration in ms
        const steps = 30;
        const stepDuration = duration / steps;
        const increment = (target - currentValue) / steps;
        
        let currentStep = 0;
        
        const animate = () => {
            currentStep++;
            
            if (currentStep <= steps) {
                const value = currentValue + (increment * currentStep);
                this.priceElement.textContent = Math.round(value).toLocaleString();
                setTimeout(animate, stepDuration);
            } else {
                // Ensure we end on the exact target value
                this.priceElement.textContent = Math.round(target).toLocaleString();
            }
        };
        
        animate();
    }

    animateDigitRoll(element, targetText, delay = 0) {
        setTimeout(() => {
            const chars = '0123456789';
            const duration = 500;
            const steps = 15;
            let currentStep = 0;
            
            const animate = () => {
                if (currentStep < steps) {
                    // Show random digits during animation
                    const randomChar = chars[Math.floor(Math.random() * chars.length)];
                    element.textContent = randomChar;
                    currentStep++;
                    setTimeout(animate, duration / steps);
                } else {
                    // Set final value
                    element.textContent = targetText;
                }
            };
            
            animate();
        }, delay);
    }

    animatePriceChange(newPrice) {
        if (!this.priceElement) return;
        
        const targetText = Number(newPrice).toLocaleString();
        const hasLeadingZero = newPrice < 100000;
        const currentHasLeadingZero = this.currentPrice && this.currentPrice < 100000;
        
        // Get current text (strip the grey zero if present to get the actual number)
        let currentText = this.priceElement.textContent || this.priceElement.innerText;
        // Remove leading 0 if it exists
        if (currentHasLeadingZero && currentText.startsWith('0')) {
            currentText = currentText.substring(1);
        }
        
        // Wrap each character in a span for individual animation
        const wrapper = document.createElement('span');
        wrapper.style.display = 'inline-flex';
        wrapper.style.whiteSpace = 'nowrap';
        wrapper.style.fontVariantNumeric = 'tabular-nums';
        
        // Add leading grey zero based on TARGET price (not current)
        // This ensures immediate appearance/disappearance when crossing 100k threshold
        const spans = [];
        if (hasLeadingZero) {
            const zeroSpan = document.createElement('span');
            zeroSpan.textContent = '0';
            zeroSpan.style.display = 'inline-block';
            zeroSpan.style.textAlign = 'center';
            zeroSpan.style.minWidth = '0.65em';
            zeroSpan.style.width = '0.65em';
            zeroSpan.style.color = '#444';
            zeroSpan.style.textShadow = 'none';
            zeroSpan.style.filter = 'none';
            zeroSpan.style.opacity = '1';
            wrapper.appendChild(zeroSpan);
            // Don't add to spans array - it won't be animated
        }
        // If target doesn't have leading zero, just don't add it - instant removal
        
        // Create spans based on TARGET text structure to ensure commas are always in right place
        // Map current digits to target positions
        const currentDigitsOnly = currentText.replace(/,/g, '');
        const targetDigitsOnly = targetText.replace(/,/g, '');
        
        let currentDigitIndex = 0;
        
        for (let i = 0; i < targetText.length; i++) {
            const span = document.createElement('span');
            span.style.display = 'inline-block';
            span.style.textAlign = 'center';
            
            if (targetText[i] === ',') {
                // Comma - always stays static
                span.textContent = ',';
                span.style.minWidth = '0.3em';
                span.style.width = '0.3em';
                wrapper.appendChild(span);
                // Don't add commas to spans array for animation
            } else {
                // Digit - will be animated
                span.style.minWidth = '0.65em';
                span.style.width = '0.65em';
                
                // Initialize with current digit or empty if we don't have enough
                if (currentDigitIndex < currentDigitsOnly.length) {
                    span.textContent = currentDigitsOnly[currentDigitIndex];
                    currentDigitIndex++;
                } else {
                    span.textContent = '0';
                }
                
                wrapper.appendChild(span);
                spans.push(span);
            }
        }
        
        this.priceElement.textContent = '';
        this.priceElement.appendChild(wrapper);
        
        // Animate each digit span to its target value
        let targetDigitIndex = 0;
        for (let i = 0; i < targetText.length; i++) {
            if (targetText[i] !== ',') {
                const targetDigit = targetText[i];
                this.animateDigitRoll(spans[targetDigitIndex], targetDigit, targetDigitIndex * 30);
                targetDigitIndex++;
            }
        }
        
        // Clean up and restore normal text after animation
        setTimeout(() => {
            if (hasLeadingZero) {
                this.priceElement.innerHTML = `<span style="color: #444; text-shadow: none; filter: none; opacity: 1;">0</span>${targetText}`;
            } else {
                this.priceElement.textContent = targetText;
            }
        }, 800);
    }

    startCurrencyAnimation() {
        setInterval(() => {
            // Switch to next currency
            this.currentCurrencyIndex = (this.currentCurrencyIndex + 1) % this.currencies.length;
            const previousCurrency = this.currency;
            this.currency = this.currencies[this.currentCurrencyIndex];
            
            // Animate currency label with a flip effect
            if (this.currencyElement) {
                this.currencyElement.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
                this.currencyElement.style.transform = 'rotateX(90deg)';
                this.currencyElement.style.opacity = '0';
                
                setTimeout(() => {
                    this.currencyElement.textContent = this.currency;
                    this.currencyElement.style.transform = 'rotateX(0deg)';
                    this.currencyElement.style.opacity = '1';
                }, 300);
            }
            
            // Animate the price with rolling digits
            const newPrice = this.allPrices[this.currency];
            if (newPrice && this.priceElement) {
                this.animatePriceChange(newPrice);
                this.currentPrice = newPrice;
            }
            
            // Update chart
            this.updateHistoricalChart();
            
        }, this.currencyAnimationInterval);
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