/**
 * Service Worker for Family Health Assistant
 * 提供离线支持和性能优化
 */

const CACHE_NAME = 'family-health-assistant-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/mobile-optimized.css',
    '/app.js',
    '/supabase-client.js',
    '/diet-manager.js',
    '/ai-consultation.js',
    '/app-auth.js',
    '/family-manager.js',
    '/performance-optimizer.js',
    '/notification-manager.js',
    '/health-charts.js',
    '/touch-gestures.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: 安装中...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: 缓存已打开');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: 缓存完成');
                return self.skipWaiting();
            })
    );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker: 激活中...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: 删除旧缓存', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: 激活完成');
            return self.clients.claim();
        })
    );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
    // 跳过非 GET 请求
    if (event.request.method !== 'GET') {
        return;
    }

    // 跳过 Supabase API 请求（这些应该实时获取）
    if (event.request.url.includes('supabase.co')) {
        return;
    }

    // 跳过 AI API 请求
    if (event.request.url.includes('open.bigmodel.cn')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 如果在缓存中找到响应，则返回缓存的响应
                if (response) {
                    return response;
                }

                // 否则从网络获取
                return fetch(event.request)
                    .then((response) => {
                        // 检查响应是否有效
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 克隆响应，因为响应只能使用一次
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // 不缓存 API 请求
                                if (!event.request.url.includes('/api/') &&
                                    !event.request.url.includes('supabase') &&
                                    !event.request.url.includes('zhipu')) {
                                    cache.put(event.request, responseToCache);
                                }
                            });

                        return response;
                    })
                    .catch((error) => {
                        console.log('Service Worker: 网络请求失败', error);

                        // 如果是 HTML 请求，返回离线页面
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }

                        return new Response('网络连接失败', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// 处理推送通知
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();

        const title = data.title || '家庭健康助手';
        const options = {
            body: data.body || '您有新的健康提醒',
            icon: data.icon || '/favicon.ico',
            badge: data.badge || '/favicon.ico',
            tag: data.tag || 'health-reminder',
            data: data.data || {},
            actions: data.actions || [
                {
                    action: 'view',
                    title: '查看详情'
                },
                {
                    action: 'dismiss',
                    title: '忽略'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const action = event.action;
    const notificationData = event.notification.data;

    if (action === 'view') {
        // 打开应用或特定页面
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (action === 'dismiss') {
        // 忽略通知
        console.log('通知被忽略');
    } else {
        // 默认行为：打开应用
        event.waitUntil(
            clients.matchAll({
                type: 'window'
            }).then((clientList) => {
                for (let client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

// 处理通知关闭
self.addEventListener('notificationclose', (event) => {
    console.log('通知被关闭:', event.notification.tag);
});

// 后台同步
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-health-data') {
        console.log('Service Worker: 执行后台同步');
        event.waitUntil(
            syncHealthData()
        );
    }
});

// 同步健康数据到服务器
async function syncHealthData() {
    try {
        // 获取本地存储的健康数据
        const localData = localStorage.getItem('healthData');
        if (!localData) {
            console.log('Service Worker: 没有需要同步的数据');
            return;
        }

        // 这里应该实现实际的同步逻辑
        // 例如：发送到 Supabase
        console.log('Service Worker: 同步健康数据到服务器');

        // 模拟同步延迟
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Service Worker: 数据同步完成');
    } catch (error) {
        console.error('Service Worker: 数据同步失败', error);
    }
}

// 消息处理
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CACHE_URLS':
            event.waitUntil(
                caches.open(CACHE_NAME).then((cache) => {
                    return cache.addAll(data.urls);
                })
            );
            break;

        case 'CLEAR_CACHE':
            event.waitUntil(
                caches.delete(CACHE_NAME)
            );
            break;

        case 'SYNC_NOW':
            event.waitUntil(
                syncHealthData()
            );
            break;

        default:
            console.log('Service Worker: 未知消息类型', type);
    }
});

// 定期清理旧缓存
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'cleanup-cache') {
        event.waitUntil(
            cleanupOldCache()
        );
    }
});

// 清理旧缓存
async function cleanupOldCache() {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    // 保留最近 30 天的缓存
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
            const date = new Date(response.headers.get('date'));
            if (date.getTime() < thirtyDaysAgo) {
                await cache.delete(request);
                console.log('Service Worker: 删除旧缓存', request.url);
            }
        }
    }
}

// 健康检查
self.addEventListener('message', (event) => {
    if (event.data.type === 'HEALTH_CHECK') {
        event.source.postMessage({
            type: 'HEALTH_CHECK_RESPONSE',
            data: {
                status: 'healthy',
                cacheSize: caches.has(CACHE_NAME),
                timestamp: Date.now()
            }
        });
    }
});

// 错误处理
self.addEventListener('error', (event) => {
    console.error('Service Worker 错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker 未处理的 Promise 拒绝:', event.reason);
});

console.log('Service Worker 已加载');