// Airtable configuration - loaded from URL parameters, localStorage, or external config file
// Priority: URL parameters > localStorage > config.js
// URL parameters: ?sponsorsAccessToken=xxx&sponsorsBaseId=yyy&sponsorsTableName=zzz
function getAirtableConfig() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 1. Try to get from URL parameters first (highest priority)
    let accessToken = urlParams.get('sponsorsAccessToken') || urlParams.get('accessToken');
    let baseId = urlParams.get('sponsorsBaseId') || urlParams.get('baseId');
    let tableName = urlParams.get('sponsorsTableName') || urlParams.get('tableName');
    
    if (accessToken && baseId && tableName) {
        console.log('✅ Using Airtable config from URL parameters');
        return { accessToken, baseId, tableName };
    }
    
    // 2. Try to get from localStorage (second priority)
    accessToken = localStorage.getItem('airtable_sponsors_accessToken');
    baseId = localStorage.getItem('airtable_sponsors_baseId');
    tableName = localStorage.getItem('airtable_sponsors_tableName');
    
    if (accessToken && baseId && tableName) {
        console.log('✅ Using Airtable config from localStorage');
        return { accessToken, baseId, tableName };
    }
    
    // 3. Fall back to CONFIG object (if it exists)
    if (typeof CONFIG !== 'undefined' && CONFIG.sponsors) {
        console.log('✅ Using Airtable config from CONFIG object');
        return CONFIG.sponsors;
    }
    
    // No config found
    console.error('❌ No Airtable configuration found. Please provide credentials via URL parameters, localStorage, or config.js');
    return null;
}

const AIRTABLE_CONFIG = getAirtableConfig();

// Filter values for AMS25 column
const FILTER_VALUES = [
    'AMS25 - Title',
    'AMS25 - Moon',
    'AMS25 - 3 Block',
    'AMS25 - 2 Block',
    'AMS25 - 1 Block'
];

// Cache configuration
const CACHE_CONFIG = {
    key: 'sponsors_cache',
    expiryHours: 24, // Cache expires after 24 hours
    version: '1.0' // Increment this when you want to force cache refresh
};

let swiper = null;

// Function to generate sponsor ID from company name
function generateSponsorId(companyName) {
    return companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .substring(0, 50); // Limit length to 50 characters
}

// Function to save data to cache
function saveToCache(data) {
    try {
        const cacheData = {
            data: data,
            timestamp: Date.now(),
            version: CACHE_CONFIG.version
        };
        localStorage.setItem(CACHE_CONFIG.key, JSON.stringify(cacheData));
        console.log('✅ Data cached successfully');
    } catch (error) {
        console.warn('⚠️ Failed to save to cache:', error);
    }
}

// Function to load data from cache
function loadFromCache() {
    try {
        const cached = localStorage.getItem(CACHE_CONFIG.key);
        if (!cached) return null;
        
        const cacheData = JSON.parse(cached);
        const now = Date.now();
        const expiryTime = cacheData.timestamp + (CACHE_CONFIG.expiryHours * 60 * 60 * 1000);
        
        // Check if cache is expired or version is outdated
        if (now > expiryTime || cacheData.version !== CACHE_CONFIG.version) {
            console.log('🔄 Cache expired or outdated, fetching fresh data');
            localStorage.removeItem(CACHE_CONFIG.key);
            return null;
        }
        
        console.log('✅ Loading data from cache');
        return cacheData.data;
    } catch (error) {
        console.warn('⚠️ Failed to load from cache:', error);
        localStorage.removeItem(CACHE_CONFIG.key);
        return null;
    }
}

// Function to fetch data from Airtable with pagination
async function fetchAirtableData() {
    try {
        let allRecords = [];
        let offset = null;
        let pageCount = 0;
        
        const updateProgress = (message) => {
            const progressEl = document.getElementById('loading-progress');
            if (progressEl) {
                progressEl.textContent = message;
            }
        };
        
        do {
            pageCount++;
            let url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tableName}`;
            
            // Add pagination parameters
            const params = new URLSearchParams();
            if (offset) {
                params.append('offset', offset);
            }
            // Increase page size to reduce number of requests
            params.append('pageSize', '100');
            
            if (params.toString()) {
                url += '?' + params.toString();
            }
            
            updateProgress(`Fetching page ${pageCount}... (${allRecords.length} records so far)`);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            allRecords = allRecords.concat(data.records || []);
            
            // Get the offset for the next page
            offset = data.offset;
            
        } while (offset);
        
        updateProgress(`Complete! Fetched ${allRecords.length} total records`);
        return allRecords;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Function to filter records based on AMS25 column
function filterRecords(records) {
    const filtered = records.filter(record => {
        const AMS25Value = record.fields.AMS25;
        
        let matches = false;
        
        if (AMS25Value) {
            // Handle both string and array values
            if (Array.isArray(AMS25Value)) {
                // If it's an array, check if any value in the array matches our filter
                matches = AMS25Value.some(value => FILTER_VALUES.includes(value));
            } else {
                // If it's a string, check direct match
                matches = FILTER_VALUES.includes(AMS25Value);
            }
        }
        
        return matches;
    });
    
            // Log only the records that pass the filter
        filtered.forEach((record, index) => {
            const name = record.fields.Name || 'Unknown';
            const rank = record.fields.AMS25 || 'No Rank';
            const imageUrl = record.fields['Webflow Original Image URL'] || 'No Image';
            const sponsorId = generateSponsorId(name);
            
            console.log(`✅ Sponsor ${index + 1}:`, {
                id: sponsorId,
                name: name,
                rank: rank,
                imageUrl: imageUrl
            });
        });
    
    console.log(`Total filtered sponsors: ${filtered.length}`);
    return filtered;
}

// Function to create swiper slides grouped by type
function createSlides(filteredRecords) {
    const swiperWrapper = document.getElementById('swiper-wrapper');
    swiperWrapper.innerHTML = '';

    // Group sponsors by their AMS25 type
    const groupedSponsors = {
        'AMS25 - Title': [],
        'AMS25 - Moon': [],
        'AMS25 - 3 Block': [],
        'AMS25 - 2 Block': [],
        'AMS25 - 1 Block': []
    };
    
    // Array to collect all sponsors for the combined slide
    let allSponsors = [];

                // Sort sponsors into groups
            filteredRecords.forEach(record => {
                const AMS25Value = record.fields.AMS25;
                const logoUrl = record.fields['Webflow Original Image URL'] || '';
                const sponsorName = record.fields.Name || 'Unknown Sponsor';
                const sponsorId = generateSponsorId(sponsorName);

                const logoScale = record.fields['Logo Scale'] || 1; // Default to 1 (100%) if not specified
                
                // Extract filename from logo URL for comparison
                const logoFileName = logoUrl ? logoUrl.split('/').pop().split('?')[0] : 'No logo file';
                
                // Log company name vs logo filename for verification
                console.log(`🏢 "${sponsorName}" → 📁 "${logoFileName}"`);
                
                // Check for potential mismatches (basic comparison)
                if (logoUrl && sponsorName !== 'Unknown Sponsor') {
                    const nameWords = sponsorName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
                    const fileNameLower = logoFileName.toLowerCase();
                    const hasNameMatch = nameWords.some(word => word.length > 2 && fileNameLower.includes(word));
                    
                    if (!hasNameMatch) {
                        console.warn(`🟣 Potential mismatch: "${sponsorName}" ↔️ "${logoFileName}"`);
                    }
                }
                
                const sponsorData = { 
                    id: sponsorId,
                    name: sponsorName, 
                    logoUrl: logoUrl,
                    type: AMS25Value,
                    hasImage: !!logoUrl,
                    logoScale: logoScale
                };
                
                // Add to allSponsors array (avoid duplicates)
                if (!allSponsors.find(s => s.id === sponsorId)) {
                    allSponsors.push(sponsorData);
                }
                
                if (Array.isArray(AMS25Value)) {
                    AMS25Value.forEach(value => {
                        if (groupedSponsors[value]) {
                            groupedSponsors[value].push({ 
                                id: sponsorId,
                                name: sponsorName, 
                                logoUrl: logoUrl,
                                hasImage: !!logoUrl,
                                logoScale: logoScale
                            });
                        }
                    });
                } else if (AMS25Value && groupedSponsors[AMS25Value]) {
                    groupedSponsors[AMS25Value].push({ 
                        id: sponsorId,
                        name: sponsorName, 
                        logoUrl: logoUrl,
                        hasImage: !!logoUrl,
                        logoScale: logoScale
                    });
                }
                
                if (!logoUrl) {
                    console.log(`⚠️ Sponsor "${sponsorName}" has no logo URL - will show placeholder`);
                }
            });

                // Create slides in specific order
                const slideOrder = [
                    'AMS25 - Title',
                    'AMS25 - Moon', 
                    'AMS25 - 3 Block'
                ];

                // Create slides for individual sponsor types (split if needed)
                let currentSlideNumber = 1;
                
                // Custom max sponsors per slide for each group
                const maxSponsorsPerGroup = {
                    'AMS25 - Title': 8,     // Larger logos, fewer per slide
                    'AMS25 - Moon': 3,     // Medium size group
                    'AMS25 - 3 Block': 5,  // Smaller logos, more per slide
                    'AMS25 - 2 Block': 20,  // Even smaller
                    'AMS25 - 1 Block': 25,   // Smallest logos, most per slide
                    'overview': 29  // 29 sponsors per slide for the overview       
                };
                
                // Custom slide duration (in milliseconds) for each group
                const slideDurationPerGroup = {
                    'AMS25 - Title': 8000,     // 8 seconds - premium sponsors get more time
                    'AMS25 - Moon': 6000,      // 6 seconds
                    'AMS25 - 3 Block': 5000,   // 5 seconds
                    'AMS25 - 2 Block': 4000,   // 4 seconds
                    'AMS25 - 1 Block': 3000,   // 3 seconds
                    'overview': 10000           // 5 seconds for overview slides
                };
                
                slideOrder.forEach((groupType) => {
                    const sponsors = groupedSponsors[groupType];
                    if (sponsors && sponsors.length > 0) {
                        // Sort sponsors alphabetically by name
                        sponsors.sort((a, b) => a.name.localeCompare(b.name));
                        
                        // Get the custom max sponsors for this group
                        const maxSponsorsForThisGroup = maxSponsorsPerGroup[groupType] || 20; // Default to 20 if not defined
                        
                        // Calculate how many slides this group needs
                        const slidesNeeded = Math.ceil(sponsors.length / maxSponsorsForThisGroup);
                        
                        console.log(`📊 ${groupType}: ${sponsors.length} sponsors, max ${maxSponsorsForThisGroup} per slide, splitting into ${slidesNeeded} slide(s)`);
                        
                        // Create slides for this group
                        for (let i = 0; i < slidesNeeded; i++) {
                            const startIndex = i * maxSponsorsForThisGroup;
                            const endIndex = Math.min(startIndex + maxSponsorsForThisGroup, sponsors.length);
                            const sponsorsForSlide = sponsors.slice(startIndex, endIndex);
                            
                            const slide = document.createElement('div');
                            slide.className = 'swiper-slide';
                            
                            // Store the duration for this slide
                            const slideDuration = slideDurationPerGroup[groupType] || 5000;
                            slide.dataset.duration = slideDuration;
                            
                            // Convert group type to CSS class name
                            const sponsorTypeClass = groupType.toLowerCase()
                                .replace(/[^a-z0-9]/g, '-')
                                .replace(/-+/g, '-')
                                .replace(/^-|-$/g, '');
                            
                            // Create a grid of logos for this group
                            const logosHtml = sponsorsForSlide.map(sponsor => {
                                const customScale = sponsor.logoScale !== 1 ? `style="transform: scale(${sponsor.logoScale}) !important;"` : '';
                                
                                if (sponsor.hasImage) {
                                    return `<div class="sponsor-item ${sponsorTypeClass}" id="${sponsor.id}-slide${currentSlideNumber}">
                                        <img src="${sponsor.logoUrl}" alt="${sponsor.name}" class="sponsor-logo ${sponsorTypeClass}" ${customScale}>
                                    </div>`;
                                } else {
                                    return `<div class="sponsor-item ${sponsorTypeClass} sponsor-placeholder" id="${sponsor.id}-slide${currentSlideNumber}">
                                        <div class="sponsor-logo ${sponsorTypeClass} placeholder-logo" ${customScale}>
                                            <div class="placeholder-text">${sponsor.name}</div>
                                        </div>
                                    </div>`;
                                }
                            }).join('');
                            
                            slide.innerHTML = `
                                <div class="slide-content">
                                    <div class="sponsors-row">
                                        ${logosHtml}
                                    </div>
                                </div>
                            `;
                            
                            swiperWrapper.appendChild(slide);
                            
                            const partInfo = slidesNeeded > 1 ? ` - Part ${i + 1}` : '';
                            console.log(`✅ Created slide ${currentSlideNumber} for ${groupType}${partInfo} with ${sponsorsForSlide.length} sponsors`);
                            currentSlideNumber++;
                        }
                    }
                });

                // Create dynamic number of slides for all sponsors
                if (allSponsors.length > 0) {
                    // Sort all sponsors alphabetically by name
                    allSponsors.sort((a, b) => a.name.localeCompare(b.name));
                    
                    // Calculate optimal sponsors per slide (aim for 12-20 sponsors per slide)
                    const maxSponsorsPerSlide = maxSponsorsPerGroup['overview'];
                    const numberOfSlides = Math.ceil(allSponsors.length / maxSponsorsPerSlide);
                    
                    console.log(`📊 Total sponsors: ${allSponsors.length}, Creating ${numberOfSlides} sponsor overview slides`);
                    
                    // Helper function to create sponsor HTML
                    const createSponsorHtml = (sponsor, slideNumber) => {
                        const slideClass = `all-sponsors-slide-${slideNumber}`;
                        // Combine the uniform overview scaling (0.5) with custom logo scale
                        const combinedScale = 0.7 * (sponsor.logoScale || 1);
                        const customScale = `style="transform: scale(${combinedScale}) !important;"`;
                        
                        if (sponsor.hasImage) {
                            return `<div class="sponsor-item ${slideClass}" id="${sponsor.id}-slide${slideNumber}">
                                <img src="${sponsor.logoUrl}" alt="${sponsor.name}" class="sponsor-logo all-sponsors-uniform" ${customScale}>
                            </div>`;
                        } else {
                            return `<div class="sponsor-item ${slideClass} sponsor-placeholder" id="${sponsor.id}-slide${slideNumber}">
                                <div class="sponsor-logo all-sponsors-uniform placeholder-logo" ${customScale}>
                                    <div class="placeholder-text">${sponsor.name}</div>
                                </div>
                            </div>`;
                        }
                    };
                    
                    // Create the sponsor overview slides (starting after type slides)
                    for (let i = 0; i < numberOfSlides; i++) {
                        const slideNumber = currentSlideNumber + i;
                        const startIndex = i * maxSponsorsPerSlide;
                        const endIndex = Math.min(startIndex + maxSponsorsPerSlide, allSponsors.length);
                        const sponsorsForSlide = allSponsors.slice(startIndex, endIndex);
                        
                        const slide = document.createElement('div');
                        slide.className = 'swiper-slide';
                        
                        // Store the duration for overview slides
                        slide.dataset.duration = slideDurationPerGroup['overview'];
                        
                        const sponsorHtml = sponsorsForSlide.map(sponsor => createSponsorHtml(sponsor, slideNumber)).join('');
                        
                        slide.innerHTML = `
                            <div class="slide-content">
                                <div class="sponsors-row all-sponsors-row">
                                    ${sponsorHtml}
                                </div>
                            </div>
                        `;
                        
                        swiperWrapper.appendChild(slide);
                        console.log(`✅ Created slide ${slideNumber} "All Sponsors - Part ${i + 1}" with ${sponsorsForSlide.length} sponsors`);
                    }
                }
}

// Function to initialize swiper
function initializeSwiper() {
    if (swiper) {
        swiper.destroy();
    }
    
            swiper = new Swiper('.swiper', {
            effect: 'creative',
            creativeEffect: {
                prev: {
                    opacity: 0,
                    translate: [0, 0, -1000],
                },
                next: {
                    opacity: 0,
                    translate: [0, 0, 1000],
                },
            },
            loop: true,
            autoplay: {
                delay: 5000, // Default delay, will be overridden per slide
                disableOnInteraction: false,
            },
            on: {
                slideChangeTransitionEnd: function () {
                    animateSlide(this.slides[this.activeIndex]);
                    updateAutoplayDelay(this);
                },
                init: function () {
                    animateSlide(this.slides[this.activeIndex]);
                    updateAutoplayDelay(this);
                }
            }
        });

        // Add keyboard controls
        document.addEventListener('keydown', function(event) {
            if (swiper) {
                switch(event.key) {
                    case 'ArrowLeft':
                        swiper.slidePrev();
                        break;
                    case 'ArrowRight':
                        swiper.slideNext();
                        break;
                }
            }
        });
}

// Function to initialize background video
function initializeBackgroundVideo() {
    const video = document.getElementById('background-video');
    if (video) {
        // Handle video load success
        video.addEventListener('loadeddata', () => {
            console.log('✅ Background video loaded successfully');
            video.style.display = 'block';
        });
        
        // Handle video load error - fallback to image
        video.addEventListener('error', () => {
            console.log('⚠️ Background video failed to load, using image fallback');
            video.style.display = 'none';
        });
        
        // Ensure video plays
        video.play().catch(e => {
            console.log('⚠️ Video autoplay blocked or failed:', e);
        });
    }
}

// Main function to load and display data
async function loadSponsorData() {
    try {
        // Check if config is available
        if (!AIRTABLE_CONFIG) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h3>⚠️ Configuration Required</h3>
                    <p>Please provide Airtable credentials via URL parameters:</p>
                    <code style="display: block; background: #1a1a1a; padding: 10px; margin: 10px 0; word-break: break-all;">
                        ?sponsorsAccessToken=YOUR_TOKEN&sponsorsBaseId=YOUR_BASE&sponsorsTableName=YOUR_TABLE
                    </code>
                    <p style="margin-top: 15px; font-size: 0.9em;">Or create a config.js file from config.example.js</p>
                </div>
            `;
            document.getElementById('error').style.display = 'block';
            return;
        }
        
        // Initialize background video
        initializeBackgroundVideo();
        
        // Show loading
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';
        document.getElementById('swiper-container').style.display = 'none';

        // Try to load from cache first
        let records = loadFromCache();
        
        if (records) {
            // Use cached data
            console.log('Total records loaded from cache:', records.length);
            // Show clear cache button since we have cached data
            document.getElementById('clear-cache-btn').style.display = 'block';
            // Show pause button
            document.getElementById('pause-btn').style.display = 'block';
        } else {
            // Fetch fresh data from Airtable
            records = await fetchAirtableData();
            console.log('Total records fetched from Airtable:', records.length);
            
            // Save to cache for next time
            saveToCache(records);
            // Show clear cache button after saving data
            document.getElementById('clear-cache-btn').style.display = 'block';
            // Show pause button
            document.getElementById('pause-btn').style.display = 'block';
        }

        // Filter records
        const filteredRecords = filterRecords(records);

        // Hide loading
        document.getElementById('loading').style.display = 'none';

        if (filteredRecords.length === 0) {
            document.getElementById('error').innerHTML = 'No sponsors found matching the filter criteria.';
            document.getElementById('error').style.display = 'block';
            return;
        }

        // Create slides
        createSlides(filteredRecords);

        // Show swiper container
        document.getElementById('swiper-container').style.display = 'block';

        // Initialize swiper
        setTimeout(() => {
            initializeSwiper();
        }, 100);

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').innerHTML = `Error loading data: ${error.message}`;
        document.getElementById('error').style.display = 'block';
    }
}

// Function to update autoplay delay based on current slide
function updateAutoplayDelay(swiperInstance) {
    const currentSlide = swiperInstance.slides[swiperInstance.activeIndex];
    const duration = currentSlide.dataset.duration || 5000; // Default to 5 seconds
    
    // Update the autoplay delay
    swiperInstance.autoplay.stop();
    swiperInstance.params.autoplay.delay = parseInt(duration);
    swiperInstance.autoplay.start();
    
    console.log(`🕒 Slide ${swiperInstance.activeIndex + 1} duration: ${duration}ms`);
}

// Function to animate sponsor logos when slide changes
function animateSlide(slide) {
    // Reset all sponsor items in all slides
    document.querySelectorAll('.swiper-slide .sponsor-item').forEach(el => {
        el.style.opacity = 0;
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'none';
    });

    // Animate sponsor items in the active slide
    const sponsors = slide.querySelectorAll('.sponsor-item');
    
    // Check if this is an overview slide (has all-sponsors-slide- class)
    const isOverviewSlide = slide.querySelector('.sponsor-item[class*="all-sponsors-slide-"]') !== null;
    
    // Use faster animation for overview slides with many logos
    const animationDelay = isOverviewSlide ? 50 : 200; // 50ms for overview, 200ms for type slides
    
    sponsors.forEach((el, i) => {
        setTimeout(() => {
            el.style.transition = 'opacity 0.8s ease-out, transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
            el.style.opacity = 1;
            el.style.transform = 'translateY(0)';
        }, i * animationDelay);
    });
    
    console.log(`🎬 Animating ${sponsors.length} logos with ${animationDelay}ms delay (${isOverviewSlide ? 'Overview' : 'Type'} slide)`);
}

// Function to toggle pause/play for swiper
function togglePause() {
    console.log('🔄 Toggle pause function called');
    
    if (!swiper) {
        console.log('❌ Swiper not found');
        return;
    }
    
    const btn = document.getElementById('pause-btn');
    if (!btn) {
        console.log('❌ Pause button not found');
        return;
    }
    
    console.log('🔄 Toggle pause clicked');
    console.log('Swiper autoplay:', swiper.autoplay);
    console.log('Autoplay running:', swiper.autoplay.running);
    console.log('Autoplay paused:', swiper.autoplay.paused);
    
    // For Swiper 11, use the correct API
    try {
        if (swiper.autoplay.running) {
            swiper.autoplay.stop();
            btn.innerHTML = '▶️ Play';
            btn.title = 'Resume slideshow';
            console.log('⏸️ Swiper paused');
        } else {
            swiper.autoplay.start();
            btn.innerHTML = '⏸️ Pause';
            btn.title = 'Pause slideshow';
            console.log('▶️ Swiper resumed');
        }
    } catch (error) {
        console.error('Error with stop/start:', error);
        // Try pause/resume approach for Swiper 11
        try {
            if (swiper.autoplay.paused) {
                swiper.autoplay.resume();
                btn.innerHTML = '⏸️ Pause';
                btn.title = 'Pause slideshow';
                console.log('▶️ Swiper resumed (pause/resume)');
            } else {
                swiper.autoplay.pause();
                btn.innerHTML = '▶️ Play';
                btn.title = 'Resume slideshow';
                console.log('⏸️ Swiper paused (pause/resume)');
            }
        } catch (error2) {
            console.error('Error with pause/resume:', error2);
            // Last resort - toggle the autoplay parameter
            if (swiper.params.autoplay) {
                swiper.params.autoplay.disableOnInteraction = true;
                swiper.autoplay.stop();
                btn.innerHTML = '▶️ Play';
                btn.title = 'Resume slideshow';
                console.log('⏸️ Swiper paused (disableOnInteraction)');
            } else {
                swiper.params.autoplay = { delay: 5000, disableOnInteraction: false };
                swiper.autoplay.start();
                btn.innerHTML = '⏸️ Pause';
                btn.title = 'Pause slideshow';
                console.log('▶️ Swiper resumed (disableOnInteraction)');
            }
        }
    }
}

// Function to clear cache manually
function clearCache() {
    try {
        // Show loading state
        const btn = document.getElementById('clear-cache-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '🔄 Clearing...';
        btn.disabled = true;
        
        // Clear cache
        localStorage.removeItem(CACHE_CONFIG.key);
        console.log('🗑️ Cache cleared successfully');
        
        // Reload the page to fetch fresh data
        setTimeout(() => {
            window.location.reload();
        }, 500);
    } catch (error) {
        console.error('Error clearing cache:', error);
        // Reset button if error
        const btn = document.getElementById('clear-cache-btn');
        btn.innerHTML = '🔄 Clear Cache & Refresh';
        btn.disabled = false;
    }
}

// Add cache info to console
console.log('💡 Cache Info:');
console.log(`- Cache expires after ${CACHE_CONFIG.expiryHours} hours`);
console.log(`- Cache version: ${CACHE_CONFIG.version}`);
console.log('- To clear cache manually, run: clearCache()');

// Load data when page loads
document.addEventListener('DOMContentLoaded', loadSponsorData); 