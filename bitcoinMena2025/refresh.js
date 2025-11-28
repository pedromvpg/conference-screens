/**
 * Gets the screen ID from the script's URL parameter
 * @returns {string|null} The screen ID or null if not found
 */
function getScreenIdFromUrl() {
    const scripts = document.getElementsByTagName('script');
    for (const script of scripts) {
        if (script.src.includes('refresh.js')) {
            const url = new URL(script.src);
            return url.searchParams.get('screen');
        }
    }
    return null;
}

/**
 * Adds a cache-busting timestamp to a URL
 * @param {string} url - The URL to add the timestamp to
 * @returns {string} The URL with a timestamp parameter
 */
function addCacheBuster(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_=${Date.now()}`;
}

/**
 * Checks the screen status and refreshes if needed
 */
async function checkScreenStatus() {
    try {
        const screenId = getScreenIdFromUrl();
        if (!screenId) {
            console.error('No screen ID found in script URL');
            return;
        }

        // Simple fetch with just the cache-busting URL parameter
        const response = await fetch(addCacheBuster('https://pvxg.net/bitcoinConference/screens-common/screens.json'));
        const data = await response.json();
        
        if (data[screenId] === 201) {
            window.location.reload();
        }else if (data[screenId] === 200) {
            console.log('Screen is up to date');
        }else if (data[screenId] === 202) {
            localStorage.clear();
            window.location.reload();
        }else {
            console.log('Screen is not found');
        }
    } catch (error) {
        console.error('Error checking screen status:', error);
    }
}

// Then check every 5 seconds
setInterval(checkScreenStatus, 5000);
