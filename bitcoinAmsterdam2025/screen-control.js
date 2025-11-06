/**
 * Airtable Remote Screen Control
 * Polls Airtable to check for refresh commands via checkboxes
 */

(function() {
    'use strict';
    
    // Airtable configuration (hardcoded)
    const AIRTABLE_CONFIG = {
        BASE_ID: 'appjW5y1eLS1obdKY',
        TABLE_ID: 'tblLDRiARsdXqbDSP',
        API_URL: 'https://api.airtable.com/v0'
    };

    // Storage key for access token
    const STORAGE_KEY = 'airtable_screen_accessToken';

    // Polling interval (5 seconds)
    const POLL_INTERVAL = 5000;

    /**
     * Gets the current page filename
     * @returns {string} The filename (e.g., "treasury_stage_sponsors.html")
     */
    function getCurrentFilename() {
        const path = window.location.pathname;
        return path.split('/').pop() || path;
    }

    /**
     * Captures access token from URL and stores it in localStorage
     */
    function captureAccessToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('screenAccessToken');
        
        if (token) {
            localStorage.setItem(STORAGE_KEY, token);
            console.log('✅ Screen control access token stored');
            return token;
        }
        
        return localStorage.getItem(STORAGE_KEY);
    }

    /**
     * Gets the access token from localStorage
     * @returns {string|null} The access token or null if not found
     */
    function getAccessToken() {
        return localStorage.getItem(STORAGE_KEY);
    }

    /**
     * Polls Airtable to check for refresh commands
     */
    async function checkForRefreshCommand() {
        const accessToken = getAccessToken();
        
        if (!accessToken) {
            console.log('⚠️ No screen control access token found. Add ?screenAccessToken=TOKEN to URL.');
            return;
        }
        
        try {
            const filename = getCurrentFilename();
            const url = `${AIRTABLE_CONFIG.API_URL}/${AIRTABLE_CONFIG.BASE_ID}/${AIRTABLE_CONFIG.TABLE_ID}`;
            
            console.log(`🔍 [Screen Control] Polling Airtable for: ${filename}`);
            
            // Fetch all records and filter client-side for the current screen
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('❌ Invalid access token. Please check your screenAccessToken parameter.');
                } else {
                    console.error(`❌ Airtable API error: ${response.status} ${response.statusText}`);
                }
                return;
            }
            
            const data = await response.json();
            console.log(`📊 [Screen Control] Retrieved ${data.records.length} records from Airtable`);
            
            // Log all available screens
            const allScreens = data.records.map(r => r.fields.Screen).filter(Boolean);
            console.log(`📋 [Screen Control] Available screens in table:`, allScreens);
            
            // Find the record matching this screen's filename
            const record = data.records.find(r => r.fields.Screen === filename);
            
            if (!record) {
                console.log(`⚠️ [Screen Control] No control record found for "${filename}" in Airtable`);
                console.log(`   💡 Make sure the Screen field in Airtable matches exactly: "${filename}"`);
                return;
            }
            
            const refresh = record.fields.Refresh || false;
            const clearCache = record.fields.ClearCache || false;
            
            // Log current state
            console.log(`✅ [Screen Control] Found record for "${filename}":`);
            console.log(`   📝 Record ID: ${record.id}`);
            console.log(`   🔄 Refresh: ${refresh ? '✓ CHECKED' : '✗ not checked'}`);
            console.log(`   🗑️  ClearCache: ${clearCache ? '✓ CHECKED' : '✗ not checked'}`);
            
            // Execute commands
            if (clearCache) {
                console.log('🗑️ [Screen Control] ClearCache command received - clearing localStorage and reloading...');
                localStorage.clear();
                window.location.reload();
            } else if (refresh) {
                console.log('🔄 [Screen Control] Refresh command received - reloading page...');
                window.location.reload();
            } else {
                console.log('✓ [Screen Control] No action needed - both checkboxes are unchecked');
            }
            
        } catch (error) {
            console.error('❌ [Screen Control] Error checking Airtable for refresh commands:', error);
        }
    }

    /**
     * Initializes the screen control system
     */
    function initScreenControl() {
        // Capture token from URL if present
        captureAccessToken();
        
        const accessToken = getAccessToken();
        
        if (accessToken) {
            console.log('✅ Screen control initialized for:', getCurrentFilename());
            console.log('   Polling Airtable every 5 seconds...');
            
            // Start polling
            setInterval(checkForRefreshCommand, POLL_INTERVAL);
            
            // Also check immediately on load
            checkForRefreshCommand();
        } else {
            console.log('ℹ️ Screen control not active (no access token)');
            console.log('   Add ?screenAccessToken=TOKEN to URL to enable remote control');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScreenControl);
    } else {
        initScreenControl();
    }
})(); // End of IIFE

