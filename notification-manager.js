/**
 * 通知管理模块
 * 处理浏览器通知和本地提醒
 */

class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.init();
    }

    async init() {
        await this.requestPermission();
        this.setupServiceWorker();
    }

    // 请求通知权限
    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('此浏览器不支持通知');
            return;
        }

        this.permission = await Notification.requestPermission();
        console.log('通知权限:', this.permission);
    }

    // 发送通知
    send(title, options = {}) {
        if (this.permission !== 'granted') {
            console.log('通知权限未授予');
            return;
        }

        const defaultOptions = {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'health-reminder',
            renotify: true
        };

        const notification = new Notification(title, {
            ...defaultOptions,
            ...options
        });

        // 5秒后自动关闭
        setTimeout(() => {
            notification.close();
        }, 5000);

        return notification;
    }

    // 用药提醒
    medicationReminder(medicationName, time) {
        this.send('💊 用药提醒', {
            body: `${medicationName} - 该吃药了！\n提醒时间: ${time}`,
            tag: `medication-${medicationName}`,
            data: { type: 'medication', name: medicationName }
        });
    }

    // 运动提醒
    exerciseReminder(exerciseType) {
        this.send('🏃‍♂️ 运动提醒', {
            body: `该进行${exerciseType}了！保持健康的生活方式。`,
            tag: `exercise-${exerciseType}`,
            data: { type: 'exercise' }
        });
    }

    // 健康检查提醒
    healthCheckReminder() {
        this.send('🏥 健康检查提醒', {
            body: '定期体检很重要，建议安排一次健康检查。',
            tag: 'health-check',
            data: { type: 'health-check' }
        });
    }

    // 设置定时提醒
    scheduleReminder(title, body, triggerTime) {
        const now = Date.now();
        const trigger = new Date(triggerTime).getTime();

        if (trigger <= now) {
            console.log('提醒时间已过');
            return;
        }

        const timeoutId = setTimeout(() => {
            this.send(title, { body });
        }, trigger - now);

        return timeoutId;
    }

    // 设置 Service Worker（为 PWA 准备）
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker 注册成功:', registration);
            } catch (error) {
                console.log('Service Worker 注册失败:', error);
            }
        }
    }

    // 清除所有通知
    clearAll() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                    registration.pushManager.getNotifications().then(notifications => {
                        notifications.forEach(notification => notification.close());
                    });
                }
            });
        }
    }
}

// 导出全局变量
window.NotificationManager = NotificationManager;