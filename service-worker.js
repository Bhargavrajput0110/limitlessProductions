// ============================================================================
// SERVICE WORKER - CACHING STRATEGY
// Implements caching for improved performance and offline support
// ============================================================================

const CACHE_VERSION = 'limitless-v1.0.0';
const CACHE_NAMES = {
    static: `${CACHE_VERSION}-static`,
    images: `${CACHE_VERSION}-images`,
    videos: `${CACHE_VERSION}-videos`,
    fonts: `${CACHE_VERSION}-fonts`,
    scripts: `${CACHE_VERSION}-scripts`,
    styles: `${CACHE_VERSION}-styles`
};

// Assets to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/main.js',
    '/public/images/logo.png'
];

// Maximum cache sizes (in items)
const MAX_CACHE_SIZE = {
    images: 50,
    videos: 10
};

// ============================================================================
// INSTALL EVENT - Cache static assets
// ============================================================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAMES.static)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Delete caches that don't match current version
                            return name.startsWith('limitless-') && 
                                   !Object.values(CACHE_NAMES).includes(name);
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ============================================================================
// FETCH EVENT - Implement caching strategies
// ============================================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome extensions and other protocols
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Determine caching strategy based on resource type
    if (isImage(url)) {
        event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.images));
    } else if (isVideo(url)) {
        event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.videos));
    } else if (isFont(url)) {
        event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.fonts));
    } else if (isScript(url)) {
        event.respondWith(networkFirstStrategy(request, CACHE_NAMES.scripts));
    } else if (isStyle(url)) {
        event.respondWith(networkFirstStrategy(request, CACHE_NAMES.styles));
    } else if (isHTML(url)) {
        event.respondWith(networkFirstStrategy(request, CACHE_NAMES.static));
    } else {
        event.respondWith(networkFirstStrategy(request, CACHE_NAMES.static));
    }
});

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

// Cache First - Good for images, fonts, videos
async function cacheFirstStrategy(request, cacheName) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // If not in cache, fetch from network
        const networkResponse = await fetch(request);
        
        // Cache the response if successful
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            
            // Clone the response before caching
            cache.put(request, networkResponse.clone());
            
            // Limit cache size
            limitCacheSize(cacheName, getMaxCacheSize(cacheName));
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache first strategy failed:', error);
        
        // Return cached version if available
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback
        return createOfflineResponse();
    }
}

// Network First - Good for HTML, CSS, JS
async function networkFirstStrategy(request, cacheName) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        // Cache the response if successful
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Network first strategy failed:', error);
        
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback
        return createOfflineResponse();
    }
}

// Stale While Revalidate - Good for API calls
async function staleWhileRevalidateStrategy(request, cacheName) {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
            const cache = caches.open(cacheName);
            cache.then((c) => c.put(request, networkResponse.clone()));
        }
        return networkResponse;
    });

    return cachedResponse || fetchPromise;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isImage(url) {
    return /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(url.pathname);
}

function isVideo(url) {
    return /\.(mp4|webm|ogg)$/i.test(url.pathname);
}

function isFont(url) {
    return /\.(woff|woff2|ttf|otf|eot)$/i.test(url.pathname) ||
           url.hostname.includes('fonts.googleapis.com') ||
           url.hostname.includes('fonts.gstatic.com');
}

function isScript(url) {
    return /\.js$/i.test(url.pathname) || url.pathname.includes('main.js');
}

function isStyle(url) {
    return /\.css$/i.test(url.pathname) || url.pathname.includes('styles.css');
}

function isHTML(url) {
    return url.pathname.endsWith('.html') || 
           url.pathname === '/' ||
           !url.pathname.includes('.');
}

function getMaxCacheSize(cacheName) {
    if (cacheName.includes('images')) return MAX_CACHE_SIZE.images;
    if (cacheName.includes('videos')) return MAX_CACHE_SIZE.videos;
    return 100; // Default
}

// Limit cache size by removing oldest entries
async function limitCacheSize(cacheName, maxSize) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxSize) {
        // Remove oldest entries (FIFO)
        const keysToDelete = keys.slice(0, keys.length - maxSize);
        await Promise.all(keysToDelete.map((key) => cache.delete(key)));
    }
}

// Create offline fallback response
function createOfflineResponse() {
    return new Response(
        '<html><body><h1>Offline</h1><p>You are currently offline. Please check your connection.</p></body></html>',
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/html'
            })
        }
    );
}

// ============================================================================
// MESSAGE EVENT - Handle messages from clients
// ============================================================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((name) => caches.delete(name))
                );
            })
        );
    }
});
