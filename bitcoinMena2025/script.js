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

// Get event code from URL parameter (e.g., ?event=MENA25)
function getEventCode() {
    console.log('🔍 DEBUG: Reading event code from URL');
    console.log('🔍 DEBUG: Current URL:', window.location.href);
    console.log('🔍 DEBUG: Search params:', window.location.search);
    
    const urlParams = new URLSearchParams(window.location.search);
    const eventCode = urlParams.get('event') || 'MENA25'; // Default to MENA25
    
    console.log(`🎯 Event code parameter from URL: "${urlParams.get('event')}"`);
    console.log(`🎯 Final event code (with fallback): "${eventCode}"`);
    
    return eventCode;
}

// Get swiper dimensions from URL parameters (e.g., ?swiperWidth=100vw&swiperHeight=56.25vw)
function getSwiperDimensions() {
    const urlParams = new URLSearchParams(window.location.search);
    const width = urlParams.get('swiperWidth') || '100vw';
    const height = urlParams.get('swiperHeight') || '56.25vw';
    
    console.log(`📐 Swiper dimensions from URL: width="${width}", height="${height}"`);
    
    return { width, height };
}

// Apply swiper dimensions to the swiper element
function applySwiperDimensions() {
    const dimensions = getSwiperDimensions();
    const swiperElement = document.querySelector('.swiper');
    
    if (swiperElement) {
        swiperElement.style.width = dimensions.width;
        swiperElement.style.height = dimensions.height;
        console.log(`✅ Applied swiper dimensions: ${dimensions.width} x ${dimensions.height}`);
    }
}

const EVENT_CODE = getEventCode();
console.log(`🔍 DEBUG: EVENT_CODE constant set to: "${EVENT_CODE}"`);

// Cache configuration - key includes event code for event-specific caching
const CACHE_CONFIG = {
    key: `sponsors_cache_${getEventCode()}`,
    expiryHours: 24, // Cache expires after 24 hours
    version: '1.1' // Increment this when you want to force cache refresh
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

// Function to filter records based on event-specific column (e.g., MENA25, AMS25, B26)
function filterRecords(records) {
    console.log('🔍 DEBUG: Starting filter process');
    console.log(`🔍 DEBUG: Event code to filter by: "${EVENT_CODE}"`);
    console.log(`🔍 DEBUG: Looking for column named: "${EVENT_CODE}"`);
    console.log(`🔍 DEBUG: Total records to filter: ${records.length}`);
    
    // First, let's see what values exist in the event-specific column
    const uniqueEventValues = new Set();
    records.forEach(record => {
        const columnValue = record.fields[EVENT_CODE]; // Use event code as column name
        if (columnValue) {
            if (Array.isArray(columnValue)) {
                columnValue.forEach(value => uniqueEventValues.add(value));
            } else {
                uniqueEventValues.add(columnValue);
            }
        }
    });
    console.log(`🔍 DEBUG: Unique values found in "${EVENT_CODE}" column:`, Array.from(uniqueEventValues).sort());
    
    const filtered = records.filter((record, index) => {
        const columnValue = record.fields[EVENT_CODE]; // Use event code as column name (e.g., "MENA25")
        const sponsorName = record.fields.Name || 'Unknown';
        
        let matches = false;
        
        // Debug log for first 10 records
        if (index < 10) {
            console.log(`🔍 DEBUG Record ${index + 1}:`, {
                name: sponsorName,
                [`${EVENT_CODE} column value`]: columnValue,
                type: Array.isArray(columnValue) ? 'array' : typeof columnValue
            });
        }
        
        // A record matches if it has ANY value in the event-specific column
        if (columnValue) {
            if (Array.isArray(columnValue)) {
                // If it's an array and has any values, it matches
                matches = columnValue.length > 0;
                if (index < 10) {
                    console.log(`  🔍 Array with ${columnValue.length} values: ${matches ? 'MATCH' : 'NO MATCH'}`);
                    console.log(`  🔍 Values:`, columnValue);
                }
            } else if (typeof columnValue === 'string') {
                // If it's a non-empty string, it matches
                matches = columnValue.length > 0;
                if (index < 10) {
                    console.log(`  🔍 String value "${columnValue}": ${matches ? 'MATCH' : 'NO MATCH'}`);
                }
            } else {
                if (index < 10) {
                    console.log(`  🔍 Unexpected type:`, typeof columnValue);
                }
            }
        } else if (index < 10) {
            console.log(`  🔍 No value in "${EVENT_CODE}" column for this record`);
        }
        
        return matches;
    });
    
    console.log(`🔍 DEBUG: Records that passed filter: ${filtered.length}`);
    
    // Log only the records that pass the filter
    filtered.forEach((record, index) => {
        const name = record.fields.Name || 'Unknown';
        const eventColumnValue = record.fields[EVENT_CODE] || 'No Value';
        const imageUrl = record.fields['Webflow Original Image URL'] || 'No Image';
        const sponsorId = generateSponsorId(name);
        
        console.log(`✅ Sponsor ${index + 1}:`, {
            id: sponsorId,
            name: name,
            [`${EVENT_CODE} tier`]: eventColumnValue,
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

    // Add video intro slide only on expo_hall_sponsors.html page
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'expo_hall_sponsors.html') {
        const videoSlide = document.createElement('div');
        videoSlide.className = 'swiper-slide';
        videoSlide.dataset.duration = 15000; // 15 seconds for video slide
        videoSlide.innerHTML = `
            <video autoplay muted loop playsinline style="width: 100%; height: 100%; object-fit: cover;">
                <source src="bitcoin_mema25_enterprise_stage_ANTALPHA.mp4" type="video/mp4">
            </video>
        `;
        swiperWrapper.appendChild(videoSlide);
        console.log('✅ Created video intro slide');
    }

    // Dynamically build groupedSponsors based on what's found in the data
    const groupedSponsors = {};
    
    // Array to collect all sponsors for the combined slide
    let allSponsors = [];

                // Sort sponsors into groups
            filteredRecords.forEach(record => {
                const eventColumnValue = record.fields[EVENT_CODE]; // Use event code as column name
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
                    type: eventColumnValue,
                    hasImage: !!logoUrl,
                    logoScale: logoScale
                };
                
                // Add to allSponsors array (avoid duplicates)
                if (!allSponsors.find(s => s.id === sponsorId)) {
                    allSponsors.push(sponsorData);
                }
                
                // Get tier values from the event-specific column
                let tierValues = [];
                if (Array.isArray(eventColumnValue)) {
                    tierValues = eventColumnValue;
                } else if (typeof eventColumnValue === 'string') {
                    tierValues = [eventColumnValue];
                }
                
                // Add sponsor to each tier group
                tierValues.forEach(tierValue => {
                    if (!groupedSponsors[tierValue]) {
                        groupedSponsors[tierValue] = [];
                    }
                    groupedSponsors[tierValue].push({ 
                        id: sponsorId,
                        name: sponsorName, 
                        logoUrl: logoUrl,
                        hasImage: !!logoUrl,
                        logoScale: logoScale
                    });
                });
                
                if (!logoUrl) {
                    console.log(`⚠️ Sponsor "${sponsorName}" has no logo URL - will show placeholder`);
                }
            });

                // Define tier order for slides (generic patterns)
                // Note: '1 and 2 Block' are excluded from dedicated slides but will appear in overview
                const tierOrder = ['Title', 'Moon', '3 Block'];
                
                // Build slide order dynamically based on what exists in the data
                const slideOrder = tierOrder
                    .map(tier => `${EVENT_CODE} - ${tier}`)
                    .filter(key => groupedSponsors[key] && groupedSponsors[key].length > 0);
                
                console.log('📋 Slide order:', slideOrder);

                // Create slides for individual sponsor types (split if needed)
                let currentSlideNumber = 1;
                
                // Custom max sponsors per slide for each tier (generic)
                const maxSponsorsByTier = {
                    'Title': 1,     // Larger logos, fewer per slide
                    'Moon': 2,      // Medium size group
                    '3 Block': 5,   // Smaller logos, more per slide
                    '2 Block': 20,  // Even smaller
                    '1 Block': 25,  // Smallest logos, most per slide
                    'overview': 24  // 29 sponsors per slide for the overview       
                };
                
                // Custom slide duration (in milliseconds) for each tier
                const slideDurationByTier = {
                    'Title': 8000,     // 8 seconds - premium sponsors get more time
                    'Moon': 6000,      // 6 seconds
                    '3 Block': 5000,   // 5 seconds
                    '2 Block': 4000,   // 4 seconds
                    '1 Block': 3000,   // 3 seconds
                    'overview': 10000  // 10 seconds for overview slides
                };
                
                // Helper function to get tier from event string (e.g., "MENA25 - Title" -> "Title")
                const getTier = (eventString) => {
                    const parts = eventString.split(' - ');
                    return parts.length > 1 ? parts[1] : 'default';
                };
                
                // Helper function to get generic tier class (e.g., "Title" -> "sponsor-item-title")
                const getGenericTierClass = (tier) => {
                    return 'sponsor-item-' + tier.toLowerCase().replace(/\s+/g, '-');
                };
                
                slideOrder.forEach((groupType) => {
                    const sponsors = groupedSponsors[groupType];
                    const tier = getTier(groupType);
                    const genericTierClass = getGenericTierClass(tier);
                    
                    if (sponsors && sponsors.length > 0) {
                        // Sort sponsors alphabetically by name
                        sponsors.sort((a, b) => a.name.localeCompare(b.name));
                        
                        // Get the custom max sponsors for this group based on tier
                        const maxSponsorsForThisGroup = maxSponsorsByTier[tier] || 20; // Default to 20 if not defined
                        
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
                            
                            // Store the duration for this slide based on tier
                            const slideDuration = slideDurationByTier[tier] || 5000;
                            slide.dataset.duration = slideDuration;
                            
                            // Convert group type to CSS class name (event-specific)
                            const sponsorTypeClass = groupType.toLowerCase()
                                .replace(/[^a-z0-9]/g, '-')
                                .replace(/-+/g, '-')
                                .replace(/^-|-$/g, '');
                            
                            // Create a grid of logos for this group
                            const logosHtml = sponsorsForSlide.map(sponsor => {
                                const customScale = sponsor.logoScale !== 1 ? `style="transform: scale(${sponsor.logoScale}) !important;"` : '';
                                
                                if (sponsor.hasImage) {
                                    return `<div class="sponsor-item ${genericTierClass} ${sponsorTypeClass}" id="${sponsor.id}-slide${currentSlideNumber}">
                                        <img src="${sponsor.logoUrl}" alt="${sponsor.name}" class="sponsor-logo ${sponsorTypeClass}" ${customScale}>
                                    </div>`;
                                } else {
                                    return `<div class="sponsor-item ${genericTierClass} ${sponsorTypeClass} sponsor-placeholder" id="${sponsor.id}-slide${currentSlideNumber}">
                                        <div class="sponsor-logo ${sponsorTypeClass} placeholder-logo" ${customScale}>
                                            <div class="placeholder-text">${sponsor.name}</div>
                                        </div>
                                    </div>`;
                                }
                            }).join('');
                            
                            // Create row class based on tier (e.g., "sponsors-row-title", "sponsors-row-moon")
                            const rowTierClass = 'sponsors-row-' + tier.toLowerCase().replace(/\s+/g, '-');
                            
                            slide.innerHTML = `
                                <div class="slide-content">
                                    <div class="sponsors-row ${rowTierClass}">
                                        ${logosHtml}
                                    </div>
                                </div>
                            `;
                            
                            swiperWrapper.appendChild(slide);
                            
                            const partInfo = slidesNeeded > 1 ? ` - Part ${i + 1}` : '';
                            console.log(`✅ Created slide ${currentSlideNumber} for ${groupType}${partInfo} with ${sponsorsForSlide.length} sponsors (row class: ${rowTierClass})`);
                            currentSlideNumber++;
                        }
                    }
                });

                // Create dynamic number of slides for all sponsors
                if (allSponsors.length > 0) {
                    // Sort all sponsors alphabetically by name
                    allSponsors.sort((a, b) => a.name.localeCompare(b.name));
                    
                    // Calculate optimal sponsors per slide (aim for 12-20 sponsors per slide)
                    const maxSponsorsPerSlide = maxSponsorsByTier['overview'];
                    const numberOfSlides = Math.ceil(allSponsors.length / maxSponsorsPerSlide);
                    
                    console.log(`📊 Total sponsors: ${allSponsors.length}, Creating ${numberOfSlides} sponsor overview slides`);
                    
                    // Helper function to create sponsor HTML
                    const createSponsorHtml = (sponsor, slideNumber) => {
                        const slideClass = `all-sponsors-slide-${slideNumber}`;
                        // Combine the uniform overview scaling (0.5) with custom logo scale
                        const combinedScale = 0.7 * (sponsor.logoScale || 1);
                        const customScale = `style="transform: scale(${combinedScale}) !important;"`;
                        
                        // Get the generic tier class from the sponsor's tier value
                        let genericTierClass = 'sponsor-item-overview';
                        if (sponsor.type) {
                            // sponsor.type contains the tier values (array or string)
                            const tierValues = Array.isArray(sponsor.type) ? sponsor.type : [sponsor.type];
                            if (tierValues.length > 0) {
                                const firstTier = getTier(tierValues[0]);
                                genericTierClass = getGenericTierClass(firstTier);
                            }
                        }
                        
                        if (sponsor.hasImage) {
                            return `<div class="sponsor-item ${genericTierClass} ${slideClass}" id="${sponsor.id}-slide${slideNumber}">
                                <img src="${sponsor.logoUrl}" alt="${sponsor.name}" class="sponsor-logo all-sponsors-uniform" ${customScale}>
                            </div>`;
                        } else {
                            return `<div class="sponsor-item ${genericTierClass} ${slideClass} sponsor-placeholder" id="${sponsor.id}-slide${slideNumber}">
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
                        slide.dataset.duration = slideDurationByTier['overview'];
                        
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

        // Debug: Show available column names from first record
        if (records.length > 0) {
            console.log('🔍 DEBUG: Available columns in first record:', Object.keys(records[0].fields).sort());
            console.log('🔍 DEBUG: First record sample:', {
                Name: records[0].fields.Name,
                [`${EVENT_CODE} (target column)`]: records[0].fields[EVENT_CODE],
                Events: records[0].fields.Events,
                AMS25: records[0].fields.AMS25,
                MENA25: records[0].fields.MENA25,
                B26: records[0].fields.B26
            });
        }

        // Filter records
        const filteredRecords = filterRecords(records);

        // Hide loading
        document.getElementById('loading').style.display = 'none';

        if (filteredRecords.length === 0) {
            // Collect unique values from the event-specific column for debugging
            const uniqueColumnValues = new Set();
            records.forEach(record => {
                const columnValue = record.fields[EVENT_CODE];
                if (columnValue) {
                    if (Array.isArray(columnValue)) {
                        columnValue.forEach(value => uniqueColumnValues.add(value));
                    } else {
                        uniqueColumnValues.add(columnValue);
                    }
                }
            });
            
            // Also show which columns exist
            const availableColumns = records.length > 0 ? Object.keys(records[0].fields).sort() : [];
            const eventColumns = availableColumns.filter(col => col.match(/^[A-Z]+\d+$/) || col === 'Events');
            
            const valuesList = Array.from(uniqueColumnValues).sort().map(e => `<li><code>${e}</code></li>`).join('');
            const columnsList = eventColumns.map(c => {
                const hasData = records.some(r => r.fields[c]);
                return `<li><code>${c}</code> ${hasData ? '✓' : '(empty)'}</li>`;
            }).join('');
            
            document.getElementById('error').innerHTML = `
                <div style="padding: 20px; text-align: left;">
                    <h3>❌ No sponsors found matching filter criteria</h3>
                    <div style="background: #2a2a2a; padding: 15px; margin: 15px 0; border-radius: 5px;">
                        <p><strong>🔍 Debug Info:</strong></p>
                        <p>• Looking for column: <code style="background: #ff6600; padding: 2px 6px; border-radius: 3px;">${EVENT_CODE}</code></p>
                        <p>• Total records in database: <strong>${records.length}</strong></p>
                        <p>• Records with data in <code>${EVENT_CODE}</code> column: <strong>${filteredRecords.length}</strong></p>
                    </div>
                    <div style="background: #1a4d1a; padding: 15px; margin: 15px 0; border-radius: 5px;">
                        <p><strong>✅ Values found in "${EVENT_CODE}" column:</strong></p>
                        ${uniqueColumnValues.size > 0 ? `<ul style="margin: 10px 0; padding-left: 20px;">${valuesList}</ul>` : `<p>No data found in the <code>${EVENT_CODE}</code> column</p>`}
                    </div>
                    <div style="background: #1a4d4d; padding: 15px; margin: 15px 0; border-radius: 5px;">
                        <p><strong>📋 Available event columns in Airtable:</strong></p>
                        ${eventColumns.length > 0 ? `<ul style="margin: 10px 0; padding-left: 20px;">${columnsList}</ul>` : '<p>No event columns found</p>'}
                    </div>
                    <div style="background: #1a1a4d; padding: 15px; margin: 15px 0; border-radius: 5px;">
                        <p><strong>💡 Suggestions:</strong></p>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Check if the <code>${EVENT_CODE}</code> column exists in your Airtable</li>
                            <li>Verify sponsors have values in the <code>${EVENT_CODE}</code> column</li>
                            <li>Check the browser console (F12) for detailed debug logs</li>
                            <li>Try a different event code: ${eventColumns.map(c => `<code>?event=${c}</code>`).join(', ')}</li>
                        </ul>
                    </div>
                    <button onclick="clearCache()" style="background: #ff6600; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                        🔄 Clear Cache & Reload
                    </button>
                </div>
            `;
            document.getElementById('error').style.display = 'block';
            return;
        }

        // Create slides
        createSlides(filteredRecords);

        // Show swiper container
        document.getElementById('swiper-container').style.display = 'block';

        // Apply custom swiper dimensions from URL parameters
        applySwiperDimensions();

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