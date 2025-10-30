// LED C - Airtable Integration Script
// This script fetches content from Airtable and displays it in the LED C display

// Airtable configuration - loaded from external config file
// Make sure config.js exists (copy from config.example.js if needed)
const AIRTABLE_CONFIG = CONFIG.agenda;

// Video configuration
const VIDEO_CONFIG = {
    videoUrl: "video/bitcoin_asia_promo.mp4", // Default video path - update this to your actual video file
    autoplay: true,
    muted: true,
    loop: true
};

// Price configuration
const PRICE_CONFIG = {
    latestApiUrl: 'https://mempool.space/api/v1/prices',
    historicalApiUrl: 'https://mempool.space/api/v1/historical-price?currency=USD',
    refreshInterval: 120000, // 2 minutes for price header updates
    chartUpdateInterval: 300000 // 5 minutes for chart data rebuilds
};

let swiper = null;
let selectedDate = new Date(); // Current date by default
let selectedTime = new Date(); // Current time by default
let currentPrice = null;
let priceChart = null;
let isUpdatingChart = false;
let isFetchingPrice = false;

// Debug counters
let fetchPriceCallCount = 0;
let updateChartCallCount = 0;
let lastChartUpdate = 0;
let lastPriceUpdate = 0;

// Function to fetch data from Airtable
async function fetchAirtableEvents() {
    try {
        let allRecords = [];
        let offset = null;
        let pageCount = 0;
        
        do {
            pageCount++;
            let url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tableName}`;
            
            // Add pagination parameters
            const params = new URLSearchParams();
            if (offset) {
                params.append('offset', offset);
            }
            params.append('pageSize', '100');
            
            if (params.toString()) {
                url += '?' + params.toString();
            }
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Airtable API Error Details:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: url,
                    baseId: AIRTABLE_CONFIG.baseId,
                    tableName: AIRTABLE_CONFIG.tableName,
                    errorResponse: errorText
                });
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Response: ${errorText}`);
            }

            const data = await response.json();
            
            // Log the raw API response for debugging
            console.log(`📡 Raw Airtable API Response (Page ${pageCount}):`, data);
            console.log(`📊 Records in this page:`, data.records?.length || 0);
            
            // Log first record's structure for field analysis
            if (data.records && data.records.length > 0) {
                console.log(`🔍 First record structure:`, data.records[0]);
                console.log(`📋 Available fields in first record:`, Object.keys(data.records[0].fields || {}));
            }
            
            allRecords = allRecords.concat(data.records || []);
            
            // Get the offset for the next page
            offset = data.offset;
            
        } while (offset);
        
        // Log summary of all unique fields across all records
        const allUniqueFields = new Set();
        allRecords.forEach(record => {
            Object.keys(record.fields || {}).forEach(field => {
                allUniqueFields.add(field);
            });
        });
        
        console.log(`🎯 FINAL SUMMARY:`);
        console.log(`📊 Total records fetched: ${allRecords.length}`);
        console.log(`📋 All unique fields across all records (${allUniqueFields.size} fields):`);
        Array.from(allUniqueFields).sort().forEach((field, index) => {
            console.log(`   ${index + 1}. ${field}`);
        });
        
        return allRecords;
    } catch (error) {
        console.error('❌ Error fetching Airtable data:', error);
        throw error;
    }
}

// Function to filter and sort events by time
function processEventsForDisplay(events) {
    console.log('🔄 processEventsForDisplay called with', events.length, 'events');
    console.log('   📅 Processing for selectedDate:', selectedDate);
    console.log('   🕐 Processing for selectedTime:', selectedTime);
    
    // Filter events by stage (Nakamoto or Genesis)
    const stageFilteredEvents = events.filter(event => {
        const stage = event.fields['⚙️ Stage'] || event.fields.Stage || '';
        return stage.includes('Nakamoto Stage') || stage.includes('Genesis Stage');
    });
    console.log('   🎭 Stage filtered events:', stageFilteredEvents.length);
    
    // Sort ALL events by Unix Time first
    const allSortedEvents = stageFilteredEvents.sort((a, b) => {
        const timeA = a.fields['Unix Time'] || 0;
        const timeB = b.fields['Unix Time'] || 0;
        return timeA - timeB;
    });
    console.log('   📊 All sorted events:', allSortedEvents.length);
    
    // Get the selected date (start of day) and next day
    const selectedDateStart = new Date(selectedDate);
    selectedDateStart.setHours(0, 0, 0, 0);
    const selectedDateEnd = new Date(selectedDate);
    selectedDateEnd.setHours(23, 59, 59, 999);
    
    console.log('   📅 Date range: ', selectedDateStart.toISOString(), 'to', selectedDateEnd.toISOString());
    
    // Filter events by selected date
    const dateFilteredEvents = allSortedEvents.filter(event => {
        const unixTime = event.fields['Unix Time'];
        if (!unixTime) return false;
        
        const eventDate = new Date(unixTime * 1000);
        const isOnSelectedDate = eventDate >= selectedDateStart && eventDate <= selectedDateEnd;
        
        if (isOnSelectedDate) {
            console.log('   ✅ Event on selected date:', event.fields.Title || event.fields['Session Name'], 'at', eventDate.toISOString());
        }
        
        return isOnSelectedDate;
    });
    console.log('   📅 Date filtered events:', dateFilteredEvents.length);
    
    // If no events found for the selected date, find the next available events
    let eventsToProcess = dateFilteredEvents;
    if (dateFilteredEvents.length === 0) {
        const selectedTimeUnix = Math.floor(selectedTime.getTime() / 1000);
        
        // Find next events after the selected time (from any date)
        const futureEvents = allSortedEvents.filter(event => {
            const eventStartUnix = event.fields['Unix Time'];
            return eventStartUnix && eventStartUnix > selectedTimeUnix;
        });
        
        if (futureEvents.length > 0) {
            // Take the next 4 future events to ensure we have enough for both slides
            eventsToProcess = futureEvents.slice(0, 4);
        } else {
            // Absolute fallback: use any available events
            eventsToProcess = allSortedEvents.slice(0, 4);
        }
    }
    
    // Determine "Now Playing" vs "Up Next" based on selected time
    const selectedTimeUnix = Math.floor(selectedTime.getTime() / 1000);
    
    // Find events happening around the selected time
    const eventsWithStatus = eventsToProcess.map(event => {
        const eventStartUnix = event.fields['Unix Time'];
        const endTimeField = event.fields['⚙️ End Time'] || event.fields['End Time'];
        let eventEndUnix = eventStartUnix + (event.fields.duration * 60) || eventStartUnix + 1800; // Default 30 min if no duration
        
        // Try to parse end time if available
        if (endTimeField && typeof endTimeField === 'string') {
            try {
                const endDate = new Date(endTimeField);
                if (!isNaN(endDate.getTime())) {
                    eventEndUnix = Math.floor(endDate.getTime() / 1000);
                }
            } catch (e) {
                // Use calculated end time
            }
        }
        
        const isCurrentlyPlaying = selectedTimeUnix >= eventStartUnix && selectedTimeUnix <= eventEndUnix;
        const isUpcoming = selectedTimeUnix < eventStartUnix;
        
        return {
            ...event,
            isCurrentlyPlaying,
            isUpcoming,
            eventStartUnix,
            eventEndUnix
        };
    });
    
    return eventsWithStatus;
}

// Function to create slides from Airtable data
function createSlidesFromEvents(events) {
    console.log('🎨 createSlidesFromEvents called with', events.length, 'events');
    console.log('   📅 Current selectedDate:', selectedDate);
    console.log('   🕐 Current selectedTime:', selectedTime);
    
    const swiperWrapper = document.getElementById('swiper-wrapper');
    if (!swiperWrapper) {
        console.error('❌ Swiper wrapper not found!');
        return;
    }
    
    console.log('   🧹 Clearing existing slides...');
    swiperWrapper.innerHTML = '';

    console.log('   🎨 Creating slideshow with 3 slides: price chart, now playing, up next...');
    
    // Create price chart slide first
    console.log('   📈 Creating price chart slide...');
    createPriceChartSlide(1);

    if (events.length === 0) {
        console.log('⚠️ No events found');
        return;
    }

    // Process and filter events
    console.log('   🔄 Processing events for display...');
    const processedEvents = processEventsForDisplay(events);
    
    if (processedEvents.length === 0) {
        console.log('⚠️ No events found for the selected criteria');
        return;
    }

    console.log('   📊 Processed events:', processedEvents.length);

    // Filter events by status based on selected time
    const currentlyPlayingEvents = processedEvents.filter(event => event.isCurrentlyPlaying);
    const upcomingEvents = processedEvents.filter(event => event.isUpcoming);
    const allEvents = processedEvents; // All available events as final fallback
    
    // Create "Now Playing" slide - only show events that are actually happening right now
    let nowPlayingSlideEvents = [];
    if (currentlyPlayingEvents.length > 0) {
        nowPlayingSlideEvents = currentlyPlayingEvents.slice(0, 2);
    } else {
        nowPlayingSlideEvents = []; // Don't show any events if nothing is currently playing
    }
    
    createEventSlide('Now Playing', nowPlayingSlideEvents, processedEvents, 2);
    
    // Create "Up Next" slide - show next available events
    let upNextSlideEvents = [];
    if (currentlyPlayingEvents.length > 0 && upcomingEvents.length > 0) {
        upNextSlideEvents = upcomingEvents.slice(0, 2);
    } else if (upcomingEvents.length > 2) {
        upNextSlideEvents = upcomingEvents.slice(2, 4);
    } else if (allEvents.length > 2) {
        upNextSlideEvents = allEvents.slice(2, 4);
    } else {
        // If we have very few events, repeat some for the second slide
        upNextSlideEvents = allEvents.slice(0, 2);
    }
    
    // Ensure we always have something for the second slide
    if (upNextSlideEvents.length === 0) {
        upNextSlideEvents = nowPlayingSlideEvents;
    }
    
    createEventSlide('Up Next', upNextSlideEvents, processedEvents, 3);
}

// Helper function to get session title with appropriate class
function getSessionTitleHtml(title) {
    const longTitleClass = title && title.length > 60 ? ' long-title' : '';
    return `<div class="session-title${longTitleClass}">${title}</div>`;
}

// Helper function to format event info
function formatEventInfo(event) {
    const title = event.fields.Title || event.fields['Session Name'] || 'TBA';
    
    // Debug: Log all available fields to see what speaker fields exist
    console.log('📋 Available fields for event:', title);
    const speakerFields = Object.keys(event.fields).filter(field => 
        field.toLowerCase().includes('speaker') || 
        field.toLowerCase().includes('name') ||
        field.toLowerCase().includes('company')
    );
    console.log('🎤 Speaker-related fields:', speakerFields);
    speakerFields.forEach(field => {
        console.log(`   ${field}:`, event.fields[field]);
    });
    
    let speakers = event.fields['Confirmed Speakers Full Name (Formatted)'] || 
                  event.fields['⚙️ Speakers'] || 
                  'TBA';
    
    // Format speakers: the data already has hyphens separating names from companies
    if (speakers && speakers !== 'TBA') {
        speakers = speakers.replace(/["'"''""]/g, ''); // Remove quotes first
        console.log('🎤 Raw speakers string:', speakers);
        
        // Split by commas to get individual speakers
        const speakerList = speakers.split(',').map(speaker => {
            const trimmed = speaker.trim();
            console.log(`🔍 Processing speaker: "${trimmed}"`);
            
            // Split by hyphen to separate name from company
            if (trimmed.includes(' - ')) {
                const parts = trimmed.split(' - ');
                const name = parts[0].trim();
                const company = parts.slice(1).join(' - ').trim(); // In case there are multiple hyphens
                
                console.log(`   👤 Name: "${name}"`);
                console.log(`   🏢 Company: "${company}"`);
                
                const result = `<span class="speaker-name">${name}</span> <span class="speaker-company">${company}</span>`;
                console.log(`   ✅ Final result: "${result}"`);
                return result;
            } else {
                // No hyphen found, treat entire string as name
                console.log(`   ⚠️ No hyphen found, treating as name only: "${trimmed}"`);
                const result = `<span class="speaker-name">${trimmed}</span>`;
                console.log(`   ✅ Final result (name only): "${result}"`);
                return result;
            }
        });
        
        speakers = speakerList.join('<br/>');
        console.log('🎉 Final formatted speakers:', speakers);
    }
    
    const startTime = event.fields['Start Time (Time Only)'] || 
                     event.fields['⚙️ Start Time'] || 
                     'TBA';
    const endTime = event.fields['End Time (Time Only)'] || 
                   event.fields['⚙️ End Time'] || 
                   '';
    
    const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime;
    
    return { title, speakers, timeDisplay };
}

// Helper function to find next or current event for a specific stage
function findEventForStage(allEvents, stageName, slideType) {
    const selectedTimeUnix = Math.floor(selectedTime.getTime() / 1000);
    
    // Get ALL events from cache, but do our own filtering instead of using processEventsForDisplay
    const cachedEvents = JSON.parse(localStorage.getItem('airtable_events_cache') || '[]');
    
    // Filter by stage first, then by time - bypass the 4-event limit
    const stageFilteredEvents = cachedEvents.filter(event => {
        const stage = event.fields['⚙️ Stage'] || event.fields.Stage || '';
        return stage.includes('Nakamoto Stage') || stage.includes('Genesis Stage');
    });
    
    // Find all events for this specific stage
    const stageEvents = stageFilteredEvents.filter(event => {
        const stage = event.fields['⚙️ Stage'] || event.fields.Stage || '';
        return stage.includes(stageName);
    });
    
    let relevantEvents = [];
    
    if (slideType === 'Now Playing') {
        // For "Now Playing", only show currently playing events
        relevantEvents = stageEvents.filter(event => {
            const eventStartUnix = event.fields['Unix Time'];
            const endTimeField = event.fields['⚙️ End Time'] || event.fields['End Time'];
            let eventEndUnix = eventStartUnix + (event.fields.duration * 60) || eventStartUnix + 1800; // Default 30 min if no duration
            
            // Try to parse end time if available
            if (endTimeField && typeof endTimeField === 'string') {
                try {
                    const endDate = new Date(endTimeField);
                    if (!isNaN(endDate.getTime())) {
                        eventEndUnix = Math.floor(endDate.getTime() / 1000);
                    }
                } catch (e) {
                    // Use calculated end time
                }
            }
            
            const isCurrentlyPlaying = selectedTimeUnix >= eventStartUnix && selectedTimeUnix <= eventEndUnix;
            return eventStartUnix && isCurrentlyPlaying;
        });
        
        if (relevantEvents.length === 0) {
            // If nothing is currently playing, check if there are future events or if all events have ended
            const futureEvents = stageEvents.filter(event => {
                const eventStartUnix = event.fields['Unix Time'];
                return eventStartUnix && eventStartUnix > selectedTimeUnix;
            });
            
            const pastEvents = stageEvents.filter(event => {
                const eventStartUnix = event.fields['Unix Time'];
                const endTimeField = event.fields['⚙️ End Time'] || event.fields['End Time'];
                let eventEndUnix = eventStartUnix + (event.fields.duration * 60) || eventStartUnix + 1800;
                
                if (endTimeField && typeof endTimeField === 'string') {
                    try {
                        const endDate = new Date(endTimeField);
                        if (!isNaN(endDate.getTime())) {
                            eventEndUnix = Math.floor(endDate.getTime() / 1000);
                        }
                    } catch (e) {
                        // Use calculated end time
                    }
                }
                
                return eventStartUnix && eventEndUnix < selectedTimeUnix;
            });
            
            if (futureEvents.length > 0) {
                return { title: 'Starting soon', speakers: '', timeDisplay: '' };
            } else if (pastEvents.length > 0) {
                return { title: 'Closed', speakers: '', timeDisplay: '' };
            } else {
                return { title: 'No session scheduled', speakers: '', timeDisplay: '' };
            }
        }
    } else {
        // For "Up Next", find the next upcoming event
        relevantEvents = stageEvents.filter(event => {
            const eventStartUnix = event.fields['Unix Time'];
            return eventStartUnix && eventStartUnix > selectedTimeUnix;
        });
    }
    
    if (relevantEvents.length > 0) {
        // Sort by time and get the next/current one
        relevantEvents.sort((a, b) => a.fields['Unix Time'] - b.fields['Unix Time']);
        const targetEvent = relevantEvents[0];
        return formatEventInfo(targetEvent);
    }
    
    // If no relevant events for "Up Next", determine appropriate message
    if (slideType === 'Up Next') {
        const pastEvents = stageEvents.filter(event => {
            const eventStartUnix = event.fields['Unix Time'];
            return eventStartUnix && eventStartUnix < selectedTimeUnix;
        });
        
        if (pastEvents.length > 0) {
            return { title: 'Closed', speakers: '', timeDisplay: '' };
        } else {
            return { title: 'No session scheduled', speakers: '', timeDisplay: '' };
        }
    }
    
    return { title: 'No session scheduled', speakers: '', timeDisplay: '' };
}

// Function to create a single slide with events
function createEventSlide(slideTitle, events, allProcessedEvents, slideNumber) {
    const swiperWrapper = document.getElementById('swiper-wrapper');
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    
    // Group events by stage
    const nakamotoEvents = events.filter(event => {
        const stage = event.fields['⚙️ Stage'] || event.fields.Stage || '';
        return stage.includes('Nakamoto Stage');
    });
    
    const genesisEvents = events.filter(event => {
        const stage = event.fields['⚙️ Stage'] || event.fields.Stage || '';
        return stage.includes('Genesis Stage');
    });
    
    // Get event info for each stage - for "Up Next", find the next available event per stage
    let nakamotoEvent, genesisEvent;
    
    if (slideTitle === 'Up Next') {
        // For "Up Next" slide, find the next upcoming event for each stage specifically
        nakamotoEvent = findEventForStage(allProcessedEvents, 'Nakamoto Stage', 'Up Next');
        genesisEvent = findEventForStage(allProcessedEvents, 'Genesis Stage', 'Up Next');
    } else if (slideTitle === 'Now Playing') {
        // For "Now Playing" slide, find currently playing events for each stage
        nakamotoEvent = findEventForStage(allProcessedEvents, 'Nakamoto Stage', 'Now Playing');
        genesisEvent = findEventForStage(allProcessedEvents, 'Genesis Stage', 'Now Playing');
    } else {
        // Fallback for other slide types
        nakamotoEvent = nakamotoEvents[0] ? formatEventInfo(nakamotoEvents[0]) : { title: 'No session scheduled', speakers: '', timeDisplay: '' };
        genesisEvent = genesisEvents[0] ? formatEventInfo(genesisEvents[0]) : { title: 'No session scheduled', speakers: '', timeDisplay: '' };
    }
    
    slide.innerHTML = `
        <div class="slide-content">
            <div class="event-content">
                <h1 class="slide-header">${slideTitle}</h1>
                
                <div class="stages-container">
                    <div class="stage-section nakamoto-section">
                        <div class="event-info">
                            <h2 class="stage-title">Nakamoto Stage</h2>
                            ${nakamotoEvent.timeDisplay ? `<div class="session-time">${nakamotoEvent.timeDisplay}</div>` : ''}
                            ${getSessionTitleHtml(nakamotoEvent.title)}
                            ${nakamotoEvent.speakers ? `<div class="session-speakers">${nakamotoEvent.speakers}</div>` : ''}
                        </div>
                    </div>
                    
                    <div class="stage-section genesis-section">
                        <div class="event-info">
                            <h2 class="stage-title">Genesis Stage</h2>
                            ${genesisEvent.timeDisplay ? `<div class="session-time">${genesisEvent.timeDisplay}</div>` : ''}
                            ${getSessionTitleHtml(genesisEvent.title)}
                            ${genesisEvent.speakers ? `<div class="session-speakers">${genesisEvent.speakers}</div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    swiperWrapper.appendChild(slide);
}

// Function to create a price chart slide (chart only)
function createPriceChartSlide(slideNumber) {
    const swiperWrapper = document.getElementById('swiper-wrapper');
    const slide = document.createElement('div');
    slide.className = 'swiper-slide chart-slide';
    
    slide.innerHTML = `
        <div class="slide-content">
            <div class="chart-content">
                <div class="ytd-header">YTD</div>
                <div class="chart-section">
                    <div class="chart-container">
                        <canvas id="price-chart-slide"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    swiperWrapper.appendChild(slide);
}

// Function to create a video slide
function createVideoSlide(slideNumber) {
    const swiperWrapper = document.getElementById('swiper-wrapper');
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    
    slide.innerHTML = `
        <div class="slide-content">
            <div class="video-content">
                <video 
                    class="full-screen-video" 
                    ${VIDEO_CONFIG.autoplay ? 'autoplay' : ''} 
                    ${VIDEO_CONFIG.muted ? 'muted' : ''} 
                    ${VIDEO_CONFIG.loop ? 'loop' : ''}
                    playsinline
                    preload="auto"
                >
                    <source src="${VIDEO_CONFIG.videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    `;
    
    swiperWrapper.appendChild(slide);
    
    // Add event listeners for video control
    const video = slide.querySelector('.full-screen-video');
    if (video) {
        video.addEventListener('error', (e) => {
            console.error('❌ Video error:', e);
        });
    }
}

// Function to initialize swiper
function initializeSwiper() {
    console.log('📺 initializeSwiper called');
    
    if (swiper) {
        console.log('   🔄 Destroying existing swiper...');
        swiper.destroy();
    }
    
    console.log('   ⚙️ Creating new swiper instance...');
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
            delay: 15000, // 15 seconds per slide since we now have 3 slides
            disableOnInteraction: false,
        },
        on: {
            slideChangeTransitionEnd: function () {
                console.log('   📺 Slide transition ended, activeIndex:', this.activeIndex);
                animateSlide(this.slides[this.activeIndex]);
            },
            init: function () {
                console.log('   📺 Swiper initialized, activeIndex:', this.activeIndex);
                animateSlide(this.slides[this.activeIndex], true); // Pass true for initial load
            }
        }
    });
    
    console.log('   ✅ Swiper created successfully');

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

// Function to fetch Bitcoin price for header
async function fetchBitcoinPriceForHeader(forceChartUpdate = false) {
    fetchPriceCallCount++;
    const now = Date.now();
    
    // Prevent multiple simultaneous price fetches
    if (isFetchingPrice) {
        console.log(`⏳ Price fetch already in progress, skipping... (call #${fetchPriceCallCount})`);
        return;
    }
    
    // Throttle price updates (unless forced)
    if (!forceChartUpdate && (now - lastPriceUpdate) < PRICE_CONFIG.refreshInterval) {
        const timeLeft = Math.round((PRICE_CONFIG.refreshInterval - (now - lastPriceUpdate)) / 1000);
        console.log(`⏰ Price update throttled, ${timeLeft}s remaining (call #${fetchPriceCallCount})`);
        return;
    }
    
    isFetchingPrice = true;
    lastPriceUpdate = now;
    console.log(`💰 [CALL #${fetchPriceCallCount}] Fetching Bitcoin price... (force: ${forceChartUpdate}, chartActive: ${isChartSlideActive()})`);
    console.trace('📍 fetchBitcoinPriceForHeader called from:');
    
    const priceElement = document.getElementById('price-header');
    const errorElement = document.getElementById('error-message-header');
    
    // Hide error state (price stays visible)
    if (errorElement) errorElement.style.display = 'none';
    
    try {
        // Add timeout to fetch requests
        const fetchWithTimeout = async (url, timeout = 10000) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(url, { 
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                throw error;
            }
        };
        
        // Fetch latest price from mempool.space with timeout
        console.log('📡 Fetching latest price...');
        const latestResponse = await fetchWithTimeout(PRICE_CONFIG.latestApiUrl);
        const latestJson = await latestResponse.json();
        
        if (!latestJson.USD || typeof latestJson.USD !== 'number') {
            throw new Error('Invalid price data received');
        }
        
        const priceText = Number(latestJson.USD).toLocaleString();
        
        if (priceElement) {
            priceElement.textContent = priceText;
            currentPrice = latestJson.USD;
            
            // Ensure price is visible
            priceElement.style.display = 'inline';
        }

        // Fetch historical prices for chart
        console.log('📊 Fetching historical data...');
        const response = await fetchWithTimeout(PRICE_CONFIG.historicalApiUrl);
        const json = await response.json();
        
        if (json.prices && Array.isArray(json.prices) && json.prices.length > 0) {
            // Prepare data for chart (YTD)
            const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
            const pricesYTD = json.prices.filter(p => p.time >= startOfYear).slice().reverse(); // oldest to newest
            
            if (pricesYTD.length === 0) {
                console.warn('⚠️ No YTD price data available');
            } else {
                const labels = pricesYTD.map(p => {
                    const d = new Date(p.time * 1000);
                    return d.toLocaleDateString();
                });
                const data = pricesYTD.map(p => p.USD);

                // Update chart for slide (only if chart slide is not currently visible)
                console.log('📈 Updating price chart with', data.length, 'data points');
                updatePriceChart(labels, data, forceChartUpdate);
            }
        } else {
            console.warn('⚠️ No historical price data received');
        }

        updateLastUpdatedHeader();
        hideErrorHeader();
        
        console.log('✅ Price fetch completed successfully');
        
    } catch (e) {
        console.error('❌ Error fetching Bitcoin price for header:', e);
        
        // Check if this is a connectivity issue or other error
        const isConnectivityIssue = e.message.includes('timeout') || 
                                   e.message.includes('Failed to fetch') || 
                                   e.message.includes('Network') ||
                                   e.message.includes('AbortError') ||
                                   e.name === 'AbortError';
        
        if (isConnectivityIssue) {
            // Keep the original price value for connectivity issues
            console.log('📶 Connectivity issue detected, keeping original price value');
            if (priceElement && priceElement.textContent && priceElement.textContent !== 'Loading...') {
                // Keep existing price, don't change it
                console.log('💰 Preserving existing price:', priceElement.textContent);
            } else if (priceElement) {
                // If no previous price exists, show a neutral message
                priceElement.textContent = '--';
            }
                 } else {
             // For other errors (API errors, parsing errors, etc.), show error
             if (priceElement) {
                 priceElement.textContent = 'Error';
                 priceElement.style.display = 'inline';
             }
         }
         
         // Ensure price element is always visible
         if (priceElement) {
             priceElement.style.display = 'inline';
         }
        
        if (errorElement) {
            let errorMessage = 'Failed to fetch Bitcoin price';
            if (e.message.includes('timeout')) {
                errorMessage = 'Connection timeout - showing last known price';
            } else if (e.message.includes('Failed to fetch') || e.message.includes('Network')) {
                errorMessage = 'Network error - showing last known price';
            } else if (e.message.includes('HTTP')) {
                errorMessage = 'Server error';
            }
            
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
        }
        
        // Retry after a delay for network errors
        if (e.message.includes('fetch') || e.message.includes('timeout') || e.message.includes('Network')) {
            console.log('🔄 Scheduling retry in 30 seconds...');
            setTimeout(() => {
                console.log('🔄 Retrying price fetch after error...');
                fetchBitcoinPriceForHeader(forceChartUpdate);
            }, 30000);
        }
        
    } finally {
        // Reset the fetch flag
        isFetchingPrice = false;
    }
}

// Helper function to check if chart slide is currently active/visible
function isChartSlideActive() {
    const activeSlide = document.querySelector('.swiper-slide-active');
    const isActive = activeSlide && activeSlide.classList.contains('chart-slide');
    console.log('🔍 isChartSlideActive check:', {
        activeSlide: activeSlide ? activeSlide.className : 'none',
        hasChartSlideClass: activeSlide ? activeSlide.classList.contains('chart-slide') : false,
        result: isActive
    });
    return isActive;
}

// Function to update price chart for slide
function updatePriceChart(labels, data, forceUpdate = false) {
    updateChartCallCount++;
    const now = Date.now();
    
    console.log(`🔍 [CALL #${updateChartCallCount}] updatePriceChart called (force: ${forceUpdate}, chartActive: ${isChartSlideActive()}, isUpdating: ${isUpdatingChart})`);
    console.trace('📍 updatePriceChart called from:');
    
    // Prevent multiple simultaneous chart updates
    if (isUpdatingChart) {
        console.log('⏳ Chart update already in progress, skipping...');
        return;
    }
    
    // Throttle chart updates (unless forced) - charts update less frequently than price
    if (!forceUpdate && (now - lastChartUpdate) < PRICE_CONFIG.chartUpdateInterval) {
        const timeLeft = Math.round((PRICE_CONFIG.chartUpdateInterval - (now - lastChartUpdate)) / 1000);
        console.log(`📊 Chart update throttled, ${timeLeft}s remaining (call #${updateChartCallCount})`);
        return;
    }
    
    // Only update chart if the chart slide is not currently active/visible (unless forced)
    if (!forceUpdate && isChartSlideActive()) {
        console.log('👁️ Chart slide is currently active, skipping chart update to prevent glitches...');
        return;
    }
    
    isUpdatingChart = true;
    lastChartUpdate = now;
    console.log('📊 Updating price chart...');
    
    try {
        const ctxElem = document.getElementById('price-chart-slide');
        if (!ctxElem) {
            console.error('❌ Chart canvas element not found');
            isUpdatingChart = false;
            return;
        }
        
        // Ensure the element is a canvas
        if (ctxElem.tagName !== 'CANVAS') {
            console.error('❌ Chart element is not a canvas:', ctxElem.tagName);
            isUpdatingChart = false;
            return;
        }
        
        const ctx = ctxElem.getContext('2d');
        if (!ctx) {
            console.error('❌ Unable to get 2D context from canvas');
            isUpdatingChart = false;
            return;
        }
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js library not loaded');
            isUpdatingChart = false;
            return;
        }
        
        // Destroy existing chart if it exists
        if (priceChart) {
            console.log('🔄 Destroying existing chart...', priceChart.id);
            try {
                priceChart.destroy();
            } catch (e) {
                console.warn('⚠️ Error destroying existing chart:', e);
            }
            priceChart = null;
        } else {
            console.log('📊 No existing chart to destroy');
        }
        
        // Validate data
        if (!labels || !data || labels.length === 0 || data.length === 0) {
            console.error('❌ Invalid chart data provided', { labels: labels?.length, data: data?.length });
            isUpdatingChart = false;
            return;
        }
        
        const chartId = 'chart_' + Date.now();
        console.log('✨ Creating new chart...', chartId);
        
        // Create new chart with error handling
        priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'BTC/USD',
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
                animation: {
                    duration: forceUpdate ? 0 : 1000, // Faster animation when forcing update
                },
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
        
        // Add ID for tracking
        priceChart.id = chartId;
        console.log('✅ Chart created successfully with ID:', chartId);
        
    } catch (error) {
        console.error('❌ Error creating price chart:', error);
        console.error('Stack trace:', error.stack);
        
        // Try to show an error message on the chart canvas
        try {
            const ctxElem = document.getElementById('price-chart-slide');
            if (ctxElem && ctxElem.getContext) {
                const ctx = ctxElem.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.font = '24px Inter';
                ctx.textAlign = 'center';
                ctx.fillText('Chart Error', ctxElem.width / 2, ctxElem.height / 2);
            }
        } catch (e) {
            console.error('❌ Could not display error message on canvas:', e);
        }
    } finally {
        // Always reset the update flag
        isUpdatingChart = false;
    }
}

// Function to update last updated time for header
function updateLastUpdatedHeader() {
    const lastUpdatedElement = document.getElementById('last-updated-header');
    if (lastUpdatedElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        lastUpdatedElement.textContent = `Last updated: ${timeString}`;
    }
}

// Function to hide error for header
function hideErrorHeader() {
    const errorElement = document.getElementById('error-message-header');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Function to update content of the currently active slide
function updateActiveSlideContent(slide) {
    console.log('🎯 updateActiveSlideContent called for slide');
    
    // Get cached events
    const cachedEvents = JSON.parse(localStorage.getItem('airtable_events_cache') || '[]');
    if (cachedEvents.length === 0) {
        console.log('   ❌ No cached events available');
        return;
    }
    
    // Check if this is an event slide by looking for event content
    const eventContent = slide.querySelector('.event-content');
    if (!eventContent) {
        console.log('   ℹ️  Not an event slide, skipping content update');
        return;
    }
    
    // Check the slide header to determine if it's "Now Playing" or "Up Next"
    const slideHeader = eventContent.querySelector('.slide-header');
    if (!slideHeader) {
        console.log('   ❌ No slide header found');
        return;
    }
    
    const slideTitle = slideHeader.textContent.trim();
    console.log('   🎭 Updating content for:', slideTitle);
    
    // Only update "Now Playing" and "Up Next" slides
    if (slideTitle === 'Now Playing' || slideTitle === 'Up Next') {
        // Update all slides with the same title (to handle swiper duplicates)
        updateAllSlidesWithTitle(slideTitle, cachedEvents);
    } else {
        console.log('   ℹ️  Slide type not handled:', slideTitle);
    }
}

// Function to update all slides with a specific title (handles swiper duplicates)
function updateAllSlidesWithTitle(slideTitle, cachedEvents) {
    console.log(`   🔄 Updating all "${slideTitle}" slides...`);
    
    // Find all slides with this title
    const allSlides = document.querySelectorAll('.swiper-slide');
    let updatedCount = 0;
    
    allSlides.forEach(slide => {
        const slideHeader = slide.querySelector('.slide-header');
        if (slideHeader && slideHeader.textContent.trim() === slideTitle) {
            updateSingleEventSlide(slide, slideTitle, cachedEvents);
            updatedCount++;
        }
    });
    
    console.log(`   ✅ Updated ${updatedCount} slides with title "${slideTitle}"`);
}

// Function to update a single event slide
function updateSingleEventSlide(slide, slideTitle, cachedEvents) {
    // Find events for each stage
    const nakamotoEvent = findEventForStage(cachedEvents, 'Nakamoto Stage', slideTitle);
    const genesisEvent = findEventForStage(cachedEvents, 'Genesis Stage', slideTitle);
    
    // Update Nakamoto Stage content
    const nakamotoSection = slide.querySelector('.nakamoto-section .event-info');
    if (nakamotoSection) {
        nakamotoSection.innerHTML = `
            <h2 class="stage-title">Nakamoto Stage</h2>
            ${nakamotoEvent.timeDisplay ? `<div class="session-time">${nakamotoEvent.timeDisplay}</div>` : ''}
            ${getSessionTitleHtml(nakamotoEvent.title)}
            ${nakamotoEvent.speakers ? `<div class="session-speakers">${nakamotoEvent.speakers}</div>` : ''}
        `;
    }
    
    // Update Genesis Stage content
    const genesisSection = slide.querySelector('.genesis-section .event-info');
    if (genesisSection) {
        genesisSection.innerHTML = `
            <h2 class="stage-title">Genesis Stage</h2>
            ${genesisEvent.timeDisplay ? `<div class="session-time">${genesisEvent.timeDisplay}</div>` : ''}
            ${getSessionTitleHtml(genesisEvent.title)}
            ${genesisEvent.speakers ? `<div class="session-speakers">${genesisEvent.speakers}</div>` : ''}
        `;
    }
    
    console.log(`     ✅ Updated slide: Nakamoto="${nakamotoEvent.title}", Genesis="${genesisEvent.title}"`);
}

// Function to animate slide content when slide changes
function animateSlide(slide, isInitialLoad = false) {
    console.log('🎬 animateSlide called for slide:', slide, 'isInitialLoad:', isInitialLoad);
    
    // Reset all content in all slides (but not on initial load for the active slide)
    if (!isInitialLoad) {
        document.querySelectorAll('.swiper-slide .event-content, .swiper-slide .video-content, .swiper-slide .chart-content').forEach(el => {
            el.style.opacity = 0;
            el.style.transform = 'translateY(50px) scale(0.9)';
            el.style.transition = 'none';
        });
        
        // Reset all stage section animations
        document.querySelectorAll('.stage-section').forEach(section => {
            section.classList.remove('animate-in', 'delay-1', 'delay-2');
            section.style.transitionDelay = '';
            // Force reflow to ensure classes are removed
            section.offsetHeight;
        });
        
        // Reset chart element animations
        document.querySelectorAll('.chart-content .ytd-header').forEach(header => {
            header.style.opacity = '0';
            header.style.transform = 'translateY(-20px)';
            header.style.transition = 'none';
        });
        
        document.querySelectorAll('.chart-content .chart-container').forEach(container => {
            container.style.opacity = '0';
            container.style.transform = 'translateY(30px)';
            container.style.transition = 'none';
        });
    }

    // Animate content in the active slide
    const content = slide.querySelector('.event-content, .video-content, .chart-content');
    if (content) {
        console.log('🎯 Found content to animate:', content.className);
        
        // For initial load, ensure the content starts visible
        if (isInitialLoad) {
            content.style.opacity = 1;
            content.style.transform = 'translateY(0) scale(1)';
            content.style.transition = 'opacity 1s ease-out, transform 1s cubic-bezier(0.23, 1, 0.32, 1)';
        }
        
        setTimeout(() => {
            if (!isInitialLoad) {
                content.style.transition = 'opacity 1s ease-out, transform 1s cubic-bezier(0.23, 1, 0.32, 1)';
                content.style.opacity = 1;
                content.style.transform = 'translateY(0) scale(1)';
            }
            
            // Handle video playback
            const video = content.querySelector('.full-screen-video');
            if (video) {
                video.currentTime = 0; // Reset video to start
                if (VIDEO_CONFIG.autoplay) {
                    video.play().catch(e => {
                        // Video autoplay blocked, user interaction required
                    });
                }
            }
            
            // Only refresh chart when chart slide becomes active if it's been a while since last update
            if (slide.classList.contains('chart-slide') && !isUpdatingChart) {
                const timeSinceLastUpdate = Date.now() - lastChartUpdate;
                if (isInitialLoad || timeSinceLastUpdate > PRICE_CONFIG.chartUpdateInterval * 0.5) { // Always update on initial load
                    console.log('📈 Chart slide became active and chart is stale, refreshing...');
                    // For initial load, add a small delay to ensure chart elements are visible
                    const chartUpdateDelay = isInitialLoad ? 1000 : 0;
                    setTimeout(() => {
                        fetchBitcoinPriceForHeader(true); // Force update even if slide is active
                    }, chartUpdateDelay);
                } else {
                    console.log('📈 Chart slide became active but chart is recent, skipping update');
                }
            }
            
            // Update event content when event slides become active
            updateActiveSlideContent(slide);
            
            // Trigger stage section animations for event slides
            if (content.classList.contains('event-content')) {
                console.log('🎭 Detected event slide, triggering stage animations...');
                animateStageSection(slide);
            }
            
            // Trigger chart animation for chart slides
            if (slide.classList.contains('chart-slide')) {
                console.log('📈 Detected chart slide, triggering chart animation...');
                animateChartSlide(slide, isInitialLoad);
            }
        }, isInitialLoad ? 500 : 100); // Longer delay on initial load to ensure everything is ready
    } else {
        console.log('⚠️ No content found in slide to animate');
    }
    
    // Pause videos in non-active slides
    document.querySelectorAll('.swiper-slide:not(.swiper-slide-active) .full-screen-video').forEach(video => {
        video.pause();
    });
}

// Function to animate stage sections with staggered timing
function animateStageSection(slide) {
    console.log('🎭 animateStageSection called for slide:', slide);
    const stageSections = slide.querySelectorAll('.stage-section');
    
    console.log('🔍 Found', stageSections.length, 'stage sections in slide');
    
    if (stageSections.length === 0) {
        console.log('⚠️ No stage sections found, skipping animation');
        return;
    }
    
    // Check if both stages have placeholder content
    const hasPlaceholderContent = stageSections.length >= 2 && 
        Array.from(stageSections).every(section => {
            const sessionTitle = section.querySelector('.session-title');
            if (!sessionTitle) return true; // Treat missing titles as placeholder
            
            const titleText = sessionTitle.textContent.toLowerCase().trim();
            const placeholderKeywords = [
                'coming soon',
                'no session scheduled',
                'starting soon',
                'closed',
                'tba',
                'to be announced'
            ];
            
            return placeholderKeywords.some(keyword => titleText.includes(keyword));
        });
    
    // Use shorter delay for placeholder content, longer for actual events
    const animationDelay = hasPlaceholderContent ? 100 : 800;
    
    console.log('🎭 Animating', stageSections.length, 'stage sections with staggered timing');
    console.log(`⏱️ Using ${animationDelay}ms delay (placeholder content: ${hasPlaceholderContent})`);
    
    // Wait for the main slide animation to mostly complete before starting stage animations
    setTimeout(() => {
        stageSections.forEach((section, index) => {
            console.log(`🎨 Processing stage section ${index + 1}:`, section);
            
            // Add delay classes for staggered animation
            if (index === 0) {
                section.classList.add('animate-in', 'delay-1');
                console.log('✨ Added animate-in delay-1 to first section');
            } else if (index === 1) {
                section.classList.add('animate-in', 'delay-2');
                console.log('✨ Added animate-in delay-2 to second section');
            } else {
                // For any additional sections (unlikely but safe)
                section.classList.add('animate-in');
                section.style.transitionDelay = `${0.2 + (index * 0.1)}s`;
                console.log(`✨ Added animate-in with custom delay to section ${index + 1}`);
            }
        });
    }, animationDelay);
}

// Function to animate chart slide elements
function animateChartSlide(slide, isInitialLoad = false) {
    console.log('📈 animateChartSlide called for slide:', slide, 'isInitialLoad:', isInitialLoad);
    
    const chartContent = slide.querySelector('.chart-content');
    if (!chartContent) {
        console.log('⚠️ No chart content found in slide');
        return;
    }
    
    console.log('📊 Animating chart content elements...');
    
    const ytdHeader = chartContent.querySelector('.ytd-header');
    const chartContainer = chartContent.querySelector('.chart-container');
    
    if (isInitialLoad) {
        // For initial load, show elements immediately and then animate them in
        console.log('🚀 Initial load: showing chart elements immediately');
        
        if (ytdHeader) {
            ytdHeader.style.opacity = '1';
            ytdHeader.style.transform = 'translateY(0)';
            ytdHeader.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        }
        
        if (chartContainer) {
            chartContainer.style.opacity = '1';
            chartContainer.style.transform = 'translateY(0)';
            chartContainer.style.transition = 'opacity 0.8s ease-out, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }
        
        console.log('✅ Initial chart display set');
        return;
    }
    
    // Wait for the main slide animation to mostly complete
    setTimeout(() => {
        if (ytdHeader) {
            ytdHeader.style.opacity = '0';
            ytdHeader.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                ytdHeader.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                ytdHeader.style.opacity = '1';
                ytdHeader.style.transform = 'translateY(0)';
            }, 100);
        }
        
        if (chartContainer) {
            chartContainer.style.opacity = '0';
            chartContainer.style.transform = 'translateY(30px)';
            setTimeout(() => {
                chartContainer.style.transition = 'opacity 0.8s ease-out, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                chartContainer.style.opacity = '1';
                chartContainer.style.transform = 'translateY(0)';
            }, 300);
        }
        
        console.log('✅ Chart animation triggered');
    }, 600);
}


// Function to reload events when date/time changes
async function reloadEventsForDateTime() {
    try {
        console.log('🔄 reloadEventsForDateTime called');
        console.log('   📅 Current selectedDate:', selectedDate);
        console.log('   🕐 Current selectedTime:', selectedTime);
        
        // Get the cached events or fetch fresh ones
        const cachedEvents = JSON.parse(localStorage.getItem('airtable_events_cache') || '[]');
        console.log('   📦 Cached events count:', cachedEvents.length);
        
        if (cachedEvents.length > 0) {
            console.log('   🔄 Date/time changed - content will update on next slide animations');
            console.log('   ✅ Ready for dynamic content updates');
        } else {
            console.log('   🔄 No cached events, triggering full reload...');
            // If no cached events, trigger a full reload
            initializeLEDC();
        }
    } catch (error) {
        console.error('❌ Error reloading events:', error);
        console.error('   Stack trace:', error.stack);
    }
}

// Function to create date picker
function createDatePicker() {
    const datePicker = document.createElement('div');
    datePicker.className = 'date-picker-container';
    datePicker.id = 'date-picker';
    
    // Format date and time for inputs
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    datePicker.innerHTML = `
        <label class="date-picker-label" for="test-date">Test Date & Time:</label>
        <input type="date" id="test-date" class="date-picker-input" value="${formattedDate}">
        <input type="time" id="test-time" class="time-picker-input" value="${formattedTime}">
        <div class="current-time-display" id="current-time">
            Testing: ${now.toLocaleString()}
        </div>
        <div class="last-updated" id="last-updated-header"></div>
    `;
    
    document.body.appendChild(datePicker);
    
    // Add event listeners for date and time changes
    const dateInput = document.getElementById('test-date');
    const timeInput = document.getElementById('test-time');
    const timeDisplay = document.getElementById('current-time');
    
    function updateDateTime() {
        console.log('🔄 updateDateTime called');
        const dateValue = dateInput.value;
        const timeValue = timeInput.value;
        
        console.log('   📅 dateValue:', dateValue);
        console.log('   🕐 timeValue:', timeValue);
        
        if (dateValue && timeValue) {
            const dateTimeString = `${dateValue}T${timeValue}:00`;
            console.log('   🔗 dateTimeString:', dateTimeString);
            
            selectedDate = new Date(dateTimeString);
            selectedTime = new Date(selectedDate);
            
            console.log('   📅 selectedDate:', selectedDate);
            console.log('   🕐 selectedTime:', selectedTime);
            console.log('   ✅ selectedDate valid:', !isNaN(selectedDate.getTime()));
            console.log('   ✅ selectedTime valid:', !isNaN(selectedTime.getTime()));
            console.log('   📊 selectedDate toISOString:', selectedDate.toISOString());
            
            timeDisplay.textContent = `Testing: ${selectedDate.toLocaleString()}`;
            
            // Reload events with new date/time
            console.log('🔄 Calling reloadEventsForDateTime...');
            reloadEventsForDateTime();
        } else {
            console.log('   ❌ Missing date or time input values');
            console.log('   📅 dateValue present:', !!dateValue);
            console.log('   🕐 timeValue present:', !!timeValue);
        }
    }
    
    dateInput.addEventListener('change', updateDateTime);
    timeInput.addEventListener('change', updateDateTime);
}



// Function to initialize background video
function initializeBackgroundVideo() {
    console.log('🎬 Initializing background video...');
    
    return new Promise((resolve, reject) => {
        const video = document.getElementById('background-video');
        const imageOverlay = document.getElementById('image-overlay');
        
        if (!video) {
            console.log('⚠️ Background video element not found');
            resolve();
            return;
        }
        
        let hasResolved = false;
        const resolveOnce = (success = true) => {
            if (!hasResolved) {
                hasResolved = true;
                success ? resolve() : reject();
            }
        };
        
        // Set a timeout to ensure we don't hang indefinitely
        const timeout = setTimeout(() => {
            console.log('⏰ Background video initialization timeout, proceeding...');
            resolveOnce();
        }, 5000);
        
        // Handle video load success
        video.addEventListener('loadeddata', () => {
            console.log('✅ Background video loaded successfully');
            video.style.display = 'block';
            clearTimeout(timeout);
            resolveOnce();
        });
        
        // Handle video load error - fallback to image
        video.addEventListener('error', (e) => {
            console.log('⚠️ Background video failed to load, using image fallback');
            console.error('Video error details:', e);
            video.style.display = 'none';
            
            // Ensure image overlay is visible as fallback
            if (imageOverlay) {
                imageOverlay.style.opacity = '1';
                imageOverlay.style.display = 'block';
            }
            
            clearTimeout(timeout);
            resolveOnce();
        });
        
        // Handle metadata loaded
        video.addEventListener('loadedmetadata', () => {
            console.log('📊 Background video metadata loaded');
        });
        
        // Handle can play
        video.addEventListener('canplay', () => {
            console.log('▶️ Background video can start playing');
            
            // Ensure video plays
            video.play().catch(e => {
                console.log('⚠️ Video autoplay blocked or failed:', e);
                // Not a critical failure - video is still loaded
            });
        });
        
        // Force load if not already loading
        if (video.readyState === 0) {
            video.load();
        } else if (video.readyState >= 2) {
            // Video is already loaded enough to play
            console.log('✅ Background video already loaded');
            video.style.display = 'block';
            clearTimeout(timeout);
            resolveOnce();
        }
    });
}

// Main function to initialize the LED C display with Airtable data
async function initializeLEDC() {
    console.log('🚀 Initializing LED C display...');
    
    try {
        // Show loading immediately
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');
        const swiperContainer = document.getElementById('swiper-container');
        
        if (loadingEl) {
            loadingEl.style.display = 'block';
            loadingEl.innerHTML = '<div class="spinner"></div><p>Initializing display...</p>';
        }
        if (errorEl) errorEl.style.display = 'none';
        if (swiperContainer) swiperContainer.style.display = 'none';
        
        // Wait for DOM to be fully ready
        if (document.readyState === 'loading') {
            console.log('⏳ Waiting for DOM to be ready...');
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // Ensure external dependencies are loaded
        console.log('📚 Checking dependencies...');
        await ensureDependenciesLoaded();
        
        // Initialize background video with timeout
        console.log('🎬 Initializing background video...');
        if (loadingEl) {
            loadingEl.innerHTML = '<div class="spinner"></div><p>Loading background video...</p>';
        }
        
        try {
            await Promise.race([
                initializeBackgroundVideo(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Video timeout')), 10000))
            ]);
        } catch (e) {
            console.warn('⚠️ Background video initialization failed or timed out:', e);
            // Continue anyway - this is not critical
        }
        
        // Fetch events from Airtable
        if (loadingEl) {
            loadingEl.innerHTML = '<div class="spinner"></div><p>Fetching events from Airtable...</p>';
        }
        
        const events = await fetchAirtableEvents();
        
        // Cache events for dynamic content updates and date picker functionality
        localStorage.setItem('airtable_events_cache', JSON.stringify(events));
        console.log('💾 Cached', events.length, 'events for dynamic content updates');
        
        // Hide loading
        if (loadingEl) loadingEl.style.display = 'none';
        
        // Show and initialize fixed header
        const fixedHeader = document.getElementById('fixed-header');
        if (fixedHeader) {
            fixedHeader.style.display = 'flex';
            // Initialize price fetching for header
            console.log('💰 Starting price fetching...');
            setTimeout(() => fetchBitcoinPriceForHeader(), 100);
        }
        
        // Create slides from events data
        console.log('🎨 Creating slides...');
        createSlidesFromEvents(events);
        
        // Show swiper container
        if (swiperContainer) swiperContainer.style.display = 'block';
        
        // Create date picker
        console.log('📅 Creating date picker...');
        createDatePicker();
        
        // Initialize selected time to current time
        selectedTime = new Date();
        
        // Initialize swiper with a small delay to ensure DOM is ready
        console.log('📺 Initializing swiper...');
        await new Promise(resolve => setTimeout(resolve, 200));
        initializeSwiper();
        
        // Set up periodic price updates (delay initial start to avoid conflicts)
        setTimeout(() => {
            console.log('⏰ Starting periodic price updates every', PRICE_CONFIG.refreshInterval / 1000, 'seconds...');
            setInterval(() => {
                console.log('⏰ Periodic price update triggered...');
                fetchBitcoinPriceForHeader();
            }, PRICE_CONFIG.refreshInterval);
        }, 10000); // Wait 10 seconds before starting periodic updates
        
        console.log('✅ LED C initialization completed successfully');
        
    } catch (error) {
        console.error('❌ Error initializing LED C with Airtable:', error);
        console.error('Stack trace:', error.stack);
        
        // Hide loading and show error
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) {
            errorEl.innerHTML = `
                <div style="color: #ff4757; padding: 20px; text-align: center; font-family: Inter;">
                    <h3>Initialization Error</h3>
                    <p>Error connecting to Airtable: ${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #ff6600; color: white; border: none; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
            errorEl.style.display = 'block';
        }
    }
}

// Helper function to ensure external dependencies are loaded
async function ensureDependenciesLoaded() {
    const dependencies = [
        { name: 'Swiper', check: () => typeof Swiper !== 'undefined' },
        { name: 'Chart.js', check: () => typeof Chart !== 'undefined' }
    ];
    
    for (const dep of dependencies) {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!dep.check() && attempts < maxAttempts) {
            console.log(`⏳ Waiting for ${dep.name} to load... (attempt ${attempts + 1})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!dep.check()) {
            throw new Error(`${dep.name} failed to load after ${maxAttempts * 100}ms`);
        }
        
        console.log(`✅ ${dep.name} loaded successfully`);
    }
}

// Load content when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded');
    // Small delay to ensure all elements are properly rendered
    setTimeout(initializeLEDC, 100);
});

// Fallback for cases where DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // Document is still loading, wait for DOMContentLoaded
    console.log('📄 Document still loading, waiting for DOMContentLoaded...');
} else {
    // Document is already loaded
    console.log('📄 Document already loaded, initializing immediately...');
    setTimeout(initializeLEDC, 100);
}

// Additional fallback for window load event
window.addEventListener('load', function() {
    console.log('🪟 Window fully loaded');
    // Only initialize if not already done
    if (!document.querySelector('.swiper-slide')) {
        console.log('🔄 No slides found, triggering fallback initialization...');
        setTimeout(initializeLEDC, 100);
    }
}); 