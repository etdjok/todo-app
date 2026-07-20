const CACHE_NAME = 'todo-app-v2'
const STATIC_CACHE = 'static-v2'
const DATA_CACHE = 'data-v2'
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/sw.js'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(CACHE_ASSETS)
    }).then(() => {
      self.skipWaiting()
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== STATIC_CACHE && name !== DATA_CACHE) {
            return caches.delete(name)
          }
        })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  
  if (request.method !== 'GET') {
    return
  }
  
  // 静态资源缓存优先
  if (request.url.includes('/assets/') || 
      request.url.includes('/favicon.svg') ||
      request.url.includes('/manifest.json') ||
      request.url.includes('/sw.js')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((response) => {
          const responseClone = response.clone()
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
      }).catch(() => {
        return caches.match('/index.html')
      })
    )
    return
  }
  
  // 导航请求：先网络后缓存
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, networkResponse.clone())
        })
        return networkResponse
      }).catch(() => {
        return caches.match('/index.html')
      })
    )
    return
  }
  
  // 其他请求：缓存优先
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }
      return fetch(request).then((response) => {
        const responseClone = response.clone()
        caches.open(DATA_CACHE).then((cache) => {
          cache.put(request, responseClone)
        })
        return response
      }).catch(() => {
        return null
      })
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (event.data && event.data.type === 'CACHE_DATA') {
    caches.open(DATA_CACHE).then((cache) => {
      cache.put(event.data.url, event.data.response)
    })
  }
})