/**
 * PWA 安装提示模块
 * 处理添加到主屏幕功能
 */

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = null;
        this.isInstalled = false;
        this.init();
    }

    init() {
        this.setupInstallPrompt();
        this.checkIfInstalled();
        this.setupInstallButton();
        this.setupPWAEvents();
    }

    // 设置安装提示事件
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // 阻止默认提示
            e.preventDefault();
            // 保存事件以备后用
            this.deferredPrompt = e;
            // 显示自定义安装按钮
            this.showInstallButton();
            console.log('PWA: 安装提示已捕获');
        });
    }

    // 检查是否已安装
    checkIfInstalled() {
        window.addEventListener('appinstalled', (evt) => {
            this.isInstalled = true;
            this.hideInstallButton();
            console.log('PWA: 应用已成功安装');

            // 发送安装成功通知
            if (window.notificationManager) {
                window.notificationManager.send('🎉 安装成功', {
                    body: '家庭健康助手已成功安装到您的设备！'
                });
            }
        });

        // 检查当前是否在 PWA 模式下运行
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            console.log('PWA: 当前在独立应用模式下运行');
        }
    }

    // 设置安装按钮
    setupInstallButton() {
        // 创建安装按钮
        this.installButton = document.createElement('div');
        this.installButton.className = 'pwa-install-button';
        this.installButton.innerHTML = `
            <div class="pwa-install-content">
                <i class="fas fa-download"></i>
                <span>安装应用</span>
            </div>
            <button class="pwa-install-close">&times;</button>
        `;

        // 添加到页面
        document.body.appendChild(this.installButton);

        // 绑定事件
        const installBtn = this.installButton.querySelector('.pwa-install-content');
        const closeBtn = this.installButton.querySelector('.pwa-install-close');

        installBtn.addEventListener('click', () => {
            this.installPWA();
        });

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideInstallButton();
        });

        // 初始隐藏
        this.hideInstallButton();
    }

    // 显示安装按钮
    showInstallButton() {
        if (this.installButton && !this.isInstalled) {
            this.installButton.classList.add('show');

            // 3秒后自动隐藏（可选）
            setTimeout(() => {
                this.installButton.classList.add('visible');
            }, 100);
        }
    }

    // 隐藏安装按钮
    hideInstallButton() {
        if (this.installButton) {
            this.installButton.classList.remove('show', 'visible');
        }
    }

    // 安装 PWA
    async installPWA() {
        if (!this.deferredPrompt) {
            console.log('PWA: 无可用的安装提示');
            return;
        }

        try {
            // 显示安装提示
            this.deferredPrompt.prompt();

            // 等待用户选择
            const { outcome } = await this.deferredPrompt.userChoice;

            console.log(`PWA: 用户选择结果: ${outcome}`);

            if (outcome === 'accepted') {
                console.log('PWA: 用户接受了安装');
                if (window.notificationManager) {
                    window.notificationManager.send('📱 正在安装', {
                        body: '请按照提示完成安装'
                    });
                }
            } else {
                console.log('PWA: 用户拒绝了安装');
            }

            // 清除提示
            this.deferredPrompt = null;
            this.hideInstallButton();

        } catch (error) {
            console.error('PWA: 安装失败', error);
            if (window.notificationManager) {
                window.notificationManager.send('❌ 安装失败', {
                    body: '安装过程中出现错误，请稍后重试'
                });
            }
        }
    }

    // 设置 PWA 相关事件
    setupPWAEvents() {
        // 监听显示模式变化
        window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
            if (e.matches) {
                console.log('PWA: 切换到独立应用模式');
                this.isInstalled = true;
                this.hideInstallButton();
            } else {
                console.log('PWA: 切换到浏览器模式');
                this.isInstalled = false;
            }
        });

        // 监听 Service Worker 更新
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('PWA: Service Worker 已更新');
                // 显示更新提示
                if (window.notificationManager) {
                    window.notificationManager.send('🔄 应用已更新', {
                        body: '新版本已准备就绪，刷新页面即可使用'
                    });
                }
            });
        }

        // 监听离线状态
        window.addEventListener('online', () => {
            console.log('PWA: 网络已连接');
            if (window.performanceOptimizer) {
                // 触发后台同步
                window.performanceOptimizer.startOptimizedSync(() => {
                    return Promise.resolve(); // 这里可以添加实际的同步逻辑
                });
            }
        });

        window.addEventListener('offline', () => {
            console.log('PWA: 网络已断开');
            if (window.notificationManager) {
                window.notificationManager.send('📡 离线模式', {
                    body: '您当前处于离线状态，数据将保存在本地'
                });
            }
        });
    }

    // 检查 PWA 支持
    checkPWASupport() {
        const supports = {
            serviceWorker: 'serviceWorker' in navigator,
            webManifest: 'manifest' in document.createElement('link'),
            beforeInstallPrompt: 'beforeinstallprompt' in window,
            appInstalled: 'appinstalled' in window,
            displayMode: window.matchMedia('(display-mode: standalone)').media !== 'not all'
        };

        console.log('PWA 支持检测:', supports);
        return supports;
    }

    // 获取安装统计
    getInstallStats() {
        return {
            isInstalled: this.isInstalled,
            hasPrompt: !!this.deferredPrompt,
            displayMode: this.getDisplayMode(),
            serviceWorker: this.getServiceWorkerStatus(),
            support: this.checkPWASupport()
        };
    }

    // 获取显示模式
    getDisplayMode() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return 'standalone';
        } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
            return 'minimal-ui';
        } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
            return 'fullscreen';
        } else {
            return 'browser';
        }
    }

    // 获取 Service Worker 状态
    getServiceWorkerStatus() {
        if ('serviceWorker' in navigator) {
            return navigator.serviceWorker.controller ? 'controlled' : 'uncontrolled';
        }
        return 'unsupported';
    }

    // 手动触发安装（用于测试）
    triggerInstallPrompt() {
        if (this.deferredPrompt) {
            this.installPWA();
        } else {
            console.log('PWA: 无可用的安装提示，请确保满足安装条件');
            // 显示手动安装说明
            this.showManualInstallInstructions();
        }
    }

    // 显示手动安装说明
    showManualInstallInstructions() {
        const instructions = {
            chrome: [
                '1. 点击浏览器地址栏右侧的分享按钮',
                '2. 选择"安装应用"或"添加到主屏幕"',
                '3. 确认安装即可'
            ],
            safari: [
                '1. 点击浏览器底部的分享按钮',
                '2. 选择"添加到主屏幕"',
                '3. 点击"添加"即可'
            ],
            edge: [
                '1. 点击浏览器右上角的菜单按钮',
                '2. 选择"应用" -> "安装此站点作为应用"',
                '3. 确认安装即可'
            ]
        };

        // 简单的浏览器检测
        let browser = 'chrome';
        if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
            browser = 'safari';
        } else if (navigator.userAgent.includes('Edg')) {
            browser = 'edge';
        }

        const steps = instructions[browser] || instructions.chrome;

        if (window.notificationManager) {
            window.notificationManager.send('📱 手动安装指南', {
                body: steps.join('\n'),
                tag: 'install-guide'
            });
        }
    }
}

// 导出全局变量
window.PWAInstaller = PWAInstaller;

// 初始化 PWA 安装器
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pwaInstaller = new PWAInstaller();
    });
} else {
    window.pwaInstaller = new PWAInstaller();
}