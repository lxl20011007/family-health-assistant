/**
 * 性能优化模块
 * 提供性能监控和优化功能
 */

class PerformanceOptimizer {
    constructor() {
        this.metrics = {
            loadTime: 0,
            domReadyTime: 0,
            firstPaint: 0,
            interactions: []
        };
        this.observer = null;
        this.init();
    }

    init() {
        this.measurePageLoad();
        this.setupPerformanceObserver();
        this.optimizeScrollPerformance();
        this.setupNetworkStatusIndicator();
        this.optimizeSync();
    }

    // 测量页面加载性能
    measurePageLoad() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                const perfData = performance.getEntriesByType('navigation')[0];
                this.metrics.loadTime = perfData.loadEventEnd - perfData.fetchStart;
                this.metrics.domReadyTime = perfData.domContentLoadedEventEnd - perfData.fetchStart;

                console.log('页面加载时间:', this.metrics.loadTime + 'ms');
                console.log('DOM准备时间:', this.metrics.domReadyTime + 'ms');

                // 如果加载时间过长，提示用户
                if (this.metrics.loadTime > 3000) {
                    console.warn('页面加载较慢，建议优化');
                }
            });

            // 首次绘制时间
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name === 'first-paint') {
                        this.metrics.firstPaint = entry.startTime;
                        console.log('首次绘制时间:', entry.startTime + 'ms');
                    }
                }
            });
            observer.observe({ entryTypes: ['paint'] });
        }
    }

    // 性能监控
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            // 监控长任务
            const longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 50) {
                        console.warn('检测到长任务:', entry.duration + 'ms', entry);
                    }
                }
            });
            longTaskObserver.observe({ entryTypes: ['longtask'] });

            // 监控资源加载
            const resourceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 1000) {
                        console.warn('资源加载缓慢:', entry.name, entry.duration + 'ms');
                    }
                }
            });
            resourceObserver.observe({ entryTypes: ['resource'] });
        }
    }

    // 优化滚动性能
    optimizeScrollPerformance() {
        let ticking = false;

        const optimizedScrollHandler = (callback) => {
            return function() {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        callback();
                        ticking = false;
                    });
                    ticking = true;
                }
            };
        };

        // 包装滚动事件
        document.addEventListener('scroll', optimizedScrollHandler(() => {
            // 滚动相关操作
        }), { passive: true });

        // 触摸事件优化
        document.addEventListener('touchmove', optimizedScrollHandler(() => {
            // 触摸相关操作
        }), { passive: true });
    }

    // 网络状态指示器
    setupNetworkStatusIndicator() {
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'network-status';
        statusIndicator.id = 'networkStatus';
        statusIndicator.style.display = 'none';
        document.body.appendChild(statusIndicator);

        const updateStatus = (status, message) => {
            const indicator = document.getElementById('networkStatus');
            if (indicator) {
                indicator.className = `network-status ${status}`;
                indicator.textContent = message;
                indicator.style.display = 'block';

                // 3秒后隐藏（在线状态）
                if (status === 'online') {
                    setTimeout(() => {
                        indicator.style.display = 'none';
                    }, 3000);
                }
            }
        };

        // 监听网络状态
        window.addEventListener('online', () => {
            updateStatus('online', '网络已连接');
        });

        window.addEventListener('offline', () => {
            updateStatus('offline', '网络已断开');
        });

        // 初始状态
        if (!navigator.onLine) {
            updateStatus('offline', '网络已断开');
        }
    }

    // 优化同步机制
    optimizeSync() {
        let syncTimeout = null;
        let isUserActive = true;
        let lastActivity = Date.now();

        // 用户活动检测
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
                isUserActive = true;
            }, true);
        });

        // 智能同步间隔
        const getSyncInterval = () => {
            const timeSinceLastActivity = Date.now() - lastActivity;

            if (timeSinceLastActivity < 30000) {
                // 用户活跃：60秒间隔
                return 60000;
            } else if (timeSinceLastActivity < 300000) {
                // 用户不活跃但近期活跃：2分钟间隔
                return 120000;
            } else {
                // 用户长时间不活跃：5分钟间隔
                return 300000;
            }
        };

        // 网络质量检测
        const getNetworkQuality = () => {
            if ('connection' in navigator) {
                const connection = navigator.connection;
                return {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt
                };
            }
            return null;
        };

        // 根据网络质量调整同步
        const adjustSyncForNetwork = () => {
            const networkInfo = getNetworkQuality();
            if (networkInfo) {
                if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
                    return getSyncInterval() * 2; // 慢网络加倍间隔
                }
            }
            return getSyncInterval();
        };

        // 优化的自动同步
        const startOptimizedSync = (syncFunction) => {
            const performSync = () => {
                const networkInfo = getNetworkQuality();

                // 离线时不同步
                if (!navigator.onLine) {
                    console.log('离线状态，跳过同步');
                    return;
                }

                // 慢网络时减少同步频率
                if (networkInfo && networkInfo.effectiveType === 'slow-2g') {
                    console.log('网络较慢，跳过此次同步');
                    return;
                }

                // 显示同步状态
                const indicator = document.getElementById('networkStatus');
                if (indicator) {
                    indicator.className = 'network-status syncing';
                    indicator.textContent = '同步中...';
                    indicator.style.display = 'block';
                }

                syncFunction().then(() => {
                    if (indicator) {
                        indicator.style.display = 'none';
                    }
                }).catch((error) => {
                    console.error('同步失败:', error);
                    if (indicator) {
                        indicator.className = 'network-status offline';
                        indicator.textContent = '同步失败';
                        setTimeout(() => {
                            indicator.style.display = 'none';
                        }, 3000);
                    }
                });

                // 设置下一次同步
                const nextInterval = adjustSyncForNetwork();
                syncTimeout = setTimeout(performSync, nextInterval);
            };

            // 初始同步
            performSync();
        };

        // 暴露给外部使用
        window.startOptimizedSync = startOptimizedSync;
    }

    // 内存使用监控
    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                console.log(`内存使用: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB / ${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`);

                // 内存使用过高警告
                if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
                    console.warn('内存使用过高，建议清理');
                    this.cleanupMemory();
                }
            }, 30000); // 每30秒检查一次
        }
    }

    // 内存清理
    cleanupMemory() {
        // 清理图表实例
        if (window.healthCharts) {
            window.healthCharts.charts.forEach((chart, id) => {
                chart.destroy();
            });
            window.healthCharts.charts.clear();
        }

        // 清理通知
        if (window.notificationManager) {
            window.notificationManager.clearAll();
        }

        // 清理未使用的 DOM 元素
        const unusedElements = document.querySelectorAll('[data-cleanup="true"]');
        unusedElements.forEach(el => el.remove());

        console.log('内存清理完成');
    }

    // 虚拟滚动优化（用于大数据列表）
    createVirtualScroll(container, items, renderItem, itemHeight = 50) {
        let visibleStart = 0;
        let visibleEnd = 0;
        let scrollTop = 0;

        const updateVisibleItems = () => {
            const containerHeight = container.clientHeight;
            scrollTop = container.scrollTop;

            visibleStart = Math.floor(scrollTop / itemHeight);
            visibleEnd = Math.min(
                visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
                items.length
            );

            // 渲染可见项目
            this.renderVisibleItems(container, items, renderItem, visibleStart, visibleEnd, itemHeight);
        };

        container.addEventListener('scroll', () => {
            requestAnimationFrame(updateVisibleItems);
        });

        // 初始渲染
        updateVisibleItems();
    }

    renderVisibleItems(container, items, renderItem, start, end, itemHeight) {
        const fragment = document.createDocumentFragment();

        // 清空容器
        container.innerHTML = '';

        // 添加padding-top模拟滚动
        const paddingTop = start * itemHeight;
        if (paddingTop > 0) {
            const spacer = document.createElement('div');
            spacer.style.height = paddingTop + 'px';
            fragment.appendChild(spacer);
        }

        // 渲染可见项目
        for (let i = start; i < end; i++) {
            const item = renderItem(items[i], i);
            item.style.height = itemHeight + 'px';
            fragment.appendChild(item);
        }

        // 添加padding-bottom
        const paddingBottom = (items.length - end) * itemHeight;
        if (paddingBottom > 0) {
            const spacer = document.createElement('div');
            spacer.style.height = paddingBottom + 'px';
            fragment.appendChild(spacer);
        }

        container.appendChild(fragment);
    }
}

// 导出全局变量
window.PerformanceOptimizer = PerformanceOptimizer;

// 初始化性能优化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.performanceOptimizer = new PerformanceOptimizer();
    });
} else {
    window.performanceOptimizer = new PerformanceOptimizer();
}