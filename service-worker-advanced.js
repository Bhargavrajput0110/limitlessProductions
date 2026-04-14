// ============================================================================
// ADVANCED SERVICE WORKER - Workbox-Style Caching Strategies
// Implements Cache First, Network First, and Stale While Revalidate
// ============================================================================

const CACHE_VERSION = 'limitless-v2.0.0';
const CACHE_NAMES = {
  static: `${CACHE_VERSION}-static`,
  images: `${CACHE_VERSION}-images`,
  videos: `${CACHE_VERSION}-videos`,
  fonts: `${CACHE_VERSION}-fonts`,
  scripts: `${CACHE_VERSION}-scripts`,
  styles: `${CACHE_VERSION}-styles`,
  api: `${CACHE_VERSION}-api`
};

// Maximum cache sizes
const MAX_CACHE_SIZE = {
  images: 50,
  videos: 10,
  api: 30
};

// Cache durations (in seconds)
const CACHE_DURATION = {
  api: 60,
  staleWhileRevalidate: 300
};

// ============================================================================
// INSTALL EVENT
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing advanced service worker...');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating advanced service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('limitless-') && 
                     !Object.values(CACHE_NAMES).includes(name);
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// ============================================================================
// FETCH EVENT - Route to appropriate strategy
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

  // Route to appropriate strategy
  if (isHTML(url)) {
    event.respondWith(networkFirst(request, CACHE_NAMES.static));
  } else if (isScript(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.scripts));
  } else if (isStyle(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.styles));
  } else if (isImage(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.images));
  } else if (isVideo(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.videos));
  } else if (isFont(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.fonts));
  } else if (isAPI(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.api));
  } else {
    event.respondWith(networkFirst(request, CACHE_NAMES.static));
  }
});

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

// 1. CACHE FIRST - Best for static assets (JS, CSS, Images, Fonts)
async function cacheFirst(request, cacheName) {
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
      cache.put(request, networkResponse.clone());
      
      // Limit cache size
      limitCacheSize(cacheName, getMaxCacheSize(cacheName));
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return createOfflineResponse();
  }
}

// 2. NETWORK FIRST - Best for HTML (always get latest)
async function networkFirst(request, cacheName) {
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
    console.error('[SW] Network first failed:', error);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return createOfflineResponse();
  }
}

// 3. STALE WHILE REVALIDATE - Best for API (show old, fetch new in background)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  // Get cached response
  const cachedResponse = await cache.match(request);
  
  // Check if cache is still fresh
  const isFresh = cachedResponse && isCacheFresh(cachedResponse, CACHE_DURATION.api);
  
  // Fetch from network in background
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      // Clone and add timestamp header
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      
      const cachedResponseWithTimestamp = new Response(
        await responseToCache.blob(),
        {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: headers
        }
      );
      
      cache.put(request, cachedResponseWithTimestamp);
      
      // Limit cache size
      limitCacheSize(cacheName, getMaxCacheSize(cacheName));
    }
    return networkResponse;
  }).catch(error => {
    console.error('[SW] Stale while revalidate fetch failed:', error);
    return null;
  });

  // Return cached response immediately if available and fresh
  if (cachedResponse && isFresh) {
    return cachedResponse;
  }

  // If cache is stale, return it but also wait for network
  if (cachedResponse) {
    // Return stale cache immediately
    fetchPromise.catch(() => {}); // Fetch in background, ignore errors
    return cachedResponse;
  }

  // No cache, wait for network
  return fetchPromise.then(response => {
    return response || createOfflineResponse();
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isHTML(url) {
  return url.pathname.endsWith('.html') || 
         url.pathname === '/' ||
         (!url.pathname.includes('.') && !url.pathname.startsWith('/api'));
}

function isScript(url) {
  return /\.js$/i.test(url.pathname) || 
         url.pathname.includes('/dist/') && url.pathname.includes('.js');
}

function isStyle(url) {
  return /\.css$/i.test(url.pathname) || 
         url.pathname.includes('/dist/') && url.pathname.includes('.css');
}

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

function isAPI(url) {
  return url.pathname.startsWith('/api/');
}

function getMaxCacheSize(cacheName) {
  if (cacheName.includes('images')) return MAX_CACHE_SIZE.images;
  if (cacheName.includes('videos')) return MAX_CACHE_SIZE.videos;
  if (cacheName.includes('api')) return MAX_CACHE_SIZE.api;
  return 100;
}

// Check if cached response is still fresh
function isCacheFresh(response, maxAge) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return false;
  
  const age = (Date.now() - parseInt(cachedAt)) / 1000;
  return age < maxAge;
}

// Limit cache size by removing oldest entries
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(keysToDelete.map((key) => cache.delete(key)));
  }
}

// Create offline fallback response
function createOfflineResponse() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Limitless Productions</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0A0A0F;
          color: #F4F0E8;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          text-align: center;
        }
        .container {
          max-width: 500px;
          padding: 40px;
        }
        h1 {
          font-size: 3rem;
          margin: 0 0 20px;
          color: #E8A832;
        }
        p {
          font-size: 1.2rem;
          line-height: 1.6;
          opacity: 0.8;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>It looks like you've lost your internet connection. Please check your network and try again.</p>
      </div>
    </body>
    </html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store'
      })
    }
  );
}

// ============================================================================
// MESSAGE EVENT
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
  
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    event.waitUntil(
      getCacheStats().then((stats) => {
        event.ports[0].postMessage(stats);
      })
    );
  }
});

// Get cache statistics
async function getCacheStats() {
  const stats = {};
  
  for (const [name, cacheName] of Object.entries(CACHE_NAMES)) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    let totalSize = 0;
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    stats[name] = {
      count: keys.length,
      size: totalSize,
      sizeKB: (totalSize / 1024).toFixed(2),
      sizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
  }
  
  return stats;
}

console.log('[SW] Advanced service worker loaded with strategies:');
console.log('  - HTML: Network First');
console.log('  - JS/CSS: Cache First (immutable)');
console.log('  - Images/Videos: Cache First (immutable)');
console.log('  - Fonts: Cache First (immutable)');
console.log('  - API: Stale While Revalidate');
