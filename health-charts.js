/**
 * 健康数据图表模块
 * 使用 Chart.js 提供数据可视化功能
 */

class HealthCharts {
    constructor() {
        this.charts = new Map();
        this.init();
    }

    init() {
        this.loadChartJS();
    }

    // 动态加载 Chart.js
    async loadChartJS() {
        if (window.Chart) return;

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => console.log('Chart.js loaded');
        document.head.appendChild(script);
    }

    // 创建健康指标趋势图
    createHealthTrendChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx || !window.Chart) return null;

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: '健康指标趋势'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        };

        const config = {
            type: 'line',
            data: data,
            options: { ...defaultOptions, ...options }
        };

        this.charts.set(canvasId, new Chart(ctx, config));
        return this.charts.get(canvasId);
    }

    // 创建营养摄入饼图
    createNutritionPieChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx || !window.Chart) return null;

        const config = {
            type: 'doughnut',
            data: {
                labels: ['碳水化合物', '蛋白质', '脂肪', '膳食纤维'],
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        };

        this.charts.set(canvasId, new Chart(ctx, config));
        return this.charts.get(canvasId);
    }

    // 更新图表数据
    updateChart(canvasId, newData) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.data = newData;
            chart.update();
        }
    }

    // 销毁图表
    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
        }
    }
}

// 导出全局变量
window.HealthCharts = HealthCharts;