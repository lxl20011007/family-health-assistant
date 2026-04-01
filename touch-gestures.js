/**
 * 触摸手势支持模块
 * 为移动端提供手势操作支持
 */

class TouchGestures {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.swipeThreshold = 50; // 滑动阈值
        this.tapThreshold = 10; // 点击阈值
        this.longPressTimer = null;
        this.longPressDuration = 500; // 长按时间
        this.init();
    }

    init() {
        this.bindGlobalEvents();
        this.enablePullToRefresh();
    }

    // 绑定全局触摸事件
    bindGlobalEvents() {
        document.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e);
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e);
        }, { passive: true });
    }

    // 触摸开始
    handleTouchStart(e) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;

        // 长按检测
        this.longPressTimer = setTimeout(() => {
            this.handleLongPress(e);
        }, this.longPressDuration);
    }

    // 触摸移动
    handleTouchMove(e) {
        if (!this.touchStartX || !this.touchStartY) return;

        const touch = e.touches[0];
        this.touchEndX = touch.clientX;
        this.touchEndY = touch.clientY;

        // 下拉刷新检测
        if (this.touchStartY < this.touchEndY && window.scrollY === 0) {
            const pullDistance = this.touchEndY - this.touchStartY;
            if (pullDistance > 60) {
                this.showPullToRefresh(pullDistance);
                e.preventDefault();
            }
        }

        // 清除长按定时器（如果有移动）
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    // 触摸结束
    handleTouchEnd(e) {
        if (!this.touchStartX || !this.touchStartY) return;

        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;

        // 清除长按定时器
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        // 判断手势类型
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // 水平滑动
            if (Math.abs(deltaX) > this.swipeThreshold) {
                if (deltaX > 0) {
                    this.handleSwipeRight(e);
                } else {
                    this.handleSwipeLeft(e);
                }
            } else if (Math.abs(deltaX) < this.tapThreshold && Math.abs(deltaY) < this.tapThreshold) {
                // 点击
                this.handleTap(e);
            }
        } else {
            // 垂直滑动
            if (Math.abs(deltaY) > this.swipeThreshold) {
                if (deltaY > 0) {
                    this.handleSwipeDown(e);
                } else {
                    this.handleSwipeUp(e);
                }
            }
        }

        // 重置触摸状态
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
    }

    // 左滑处理（删除操作）
    handleSwipeLeft(e) {
        const target = e.target.closest('[data-swipe-delete]');
        if (target) {
            this.showSwipeDelete(target);
        }
    }

    // 右滑处理（恢复操作）
    handleSwipeRight(e) {
        const target = e.target.closest('.swipe-item.swipe-left');
        if (target) {
            this.hideSwipeDelete(target);
        }
    }

    // 上滑处理
    handleSwipeUp(e) {
        // 可以用于显示更多选项或滚动
    }

    // 下滑处理
    handleSwipeDown(e) {
        // 可以用于隐藏元素或滚动
    }

    // 点击处理
    handleTap(e) {
        // 处理快速双击
        const now = Date.now();
        const lastTap = parseInt(document.body.getAttribute('data-last-tap') || '0');

        if (now - lastTap < 300) {
            this.handleDoubleTap(e);
        }

        document.body.setAttribute('data-last-tap', now.toString());
    }

    // 双击处理
    handleDoubleTap(e) {
        // 可以用于快速编辑或放大
    }

    // 长按处理
    handleLongPress(e) {
        this.longPressTimer = null;

        // 触发长按事件
        const event = new CustomEvent('longpress', {
            detail: {
                target: e.target,
                touch: e.touches[0]
            }
        });
        document.dispatchEvent(event);

        // 震动反馈（如果支持）
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }

    // 显示滑动删除
    showSwipeDelete(element) {
        element.classList.add('swipe-left');

        // 添加删除按钮（如果不存在）
        if (!element.querySelector('.swipe-actions')) {
            const swipeActions = document.createElement('div');
            swipeActions.className = 'swipe-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'swipe-delete';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.onclick = () => this.confirmDelete(element);

            swipeActions.appendChild(deleteBtn);
            element.appendChild(swipeActions);
        }
    }

    // 隐藏滑动删除
    hideSwipeDelete(element) {
        element.classList.remove('swipe-left');
    }

    // 确认删除
    confirmDelete(element) {
        const itemId = element.getAttribute('data-item-id');
        const itemType = element.getAttribute('data-item-type');

        if (confirm('确定要删除这个项目吗？')) {
            // 触发删除事件
            const event = new CustomEvent('itemdelete', {
                detail: {
                    id: itemId,
                    type: itemType,
                    element: element
                }
            });
            document.dispatchEvent(event);

            // 移除元素
            element.remove();
        } else {
            // 取消删除，恢复原位
            this.hideSwipeDelete(element);
        }
    }

    // 下拉刷新
    enablePullToRefresh() {
        const container = document.querySelector('.container');
        if (!container) return;

        container.classList.add('pull-to-refresh');

        // 创建刷新指示器
        const refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'refresh-indicator';
        refreshIndicator.id = 'refreshIndicator';
        refreshIndicator.innerHTML = `
            <div class="refresh-spinner"></div>
            <span>下拉刷新</span>
        `;
        container.insertBefore(refreshIndicator, container.firstChild);
    }

    // 显示下拉刷新指示器
    showPullToRefresh(distance) {
        const indicator = document.getElementById('refreshIndicator');
        if (indicator) {
            const progress = Math.min(distance / 60, 1);
            indicator.style.transform = `translateY(${progress * 100}%)`;
            indicator.classList.add('active');

            if (distance > 80) {
                indicator.querySelector('span').textContent = '释放刷新';
            }
        }
    }

    // 触发下拉刷新
    triggerPullToRefresh() {
        const indicator = document.getElementById('refreshIndicator');
        if (indicator) {
            indicator.querySelector('span').textContent = '刷新中...';

            // 触发刷新事件
            const event = new CustomEvent('pulltorefresh');
            document.dispatchEvent(event);

            // 模拟刷新延迟
            setTimeout(() => {
                this.completePullToRefresh();
            }, 1000);
        }
    }

    // 完成下拉刷新
    completePullToRefresh() {
        const indicator = document.getElementById('refreshIndicator');
        if (indicator) {
            indicator.style.transform = 'translateY(-100%)';
            indicator.classList.remove('active');
            setTimeout(() => {
                indicator.querySelector('span').textContent = '下拉刷新';
            }, 300);
        }

        // 显示成功提示
        if (window.notificationManager) {
            window.notificationManager.send('✅ 刷新完成', {
                body: '数据已更新'
            });
        }
    }

    // 为元素添加手势支持
    addSwipeSupport(element, options = {}) {
        const defaultOptions = {
            enableDelete: true,
            enableActions: false
        };

        const config = { ...defaultOptions, ...options };

        if (config.enableDelete) {
            element.setAttribute('data-swipe-delete', 'true');
        }

        element.classList.add('swipe-container');
    }

    // 移除元素手势支持
    removeSwipeSupport(element) {
        element.removeAttribute('data-swipe-delete');
        element.classList.remove('swipe-container', 'swipe-item');

        const actions = element.querySelector('.swipe-actions');
        if (actions) {
            actions.remove();
        }
    }

    // 启用双击缩放
    enableDoubleTapZoom(element) {
        let lastTap = 0;
        element.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;

            if (tapLength < 300 && tapLength > 0) {
                // 双击事件
                e.preventDefault();
                const event = new CustomEvent('doubletap', {
                    detail: { target: e.target }
                });
                element.dispatchEvent(event);
            }
            lastTap = currentTime;
        });
    }
}

// 导出全局变量
window.TouchGestures = TouchGestures;

// 初始化触摸手势
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.touchGestures = new TouchGestures();
    });
} else {
    window.touchGestures = new TouchGestures();
}