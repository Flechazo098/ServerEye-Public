// 全局变量
let allEvents = [];
let filteredEvents = [];
let activeFilter = 'all';
let playerFilter = '';
let cleanupStatus = null;
let connectionOnline = true;
let animationFrameId = null;

// DOM元素
const refreshBtn = document.getElementById('refreshBtn');
const cleanupBtn = document.getElementById('cleanupBtn');
const eventFilter = document.getElementById('eventFilter');
const playerFilterInput = document.getElementById('playerFilter');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const exportBtn = document.getElementById('exportBtn');
const eventsList = document.getElementById('eventsList');
const totalEventsEl = document.getElementById('totalEvents');
const activePlayersEl = document.getElementById('activePlayers');
const blocksBrokenEl = document.getElementById('blocksBroken');
const chatMessagesEl = document.getElementById('chatMessages');
const cacheStatusEl = document.getElementById('cacheStatus');
const cacheDetailsEl = document.getElementById('cacheDetails');
const connectionStatusEl = document.getElementById('connectionStatus');
const connectionIndicator = document.getElementById('connectionIndicator');
const lastUpdateEl = document.getElementById('lastUpdate');
const cleanupModal = document.getElementById('cleanupModal');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    startPeriodicUpdates();
    addScrollAnimations();
});

// 应用初始化
function initializeApp() {
    fetchEvents();
    fetchCleanupStatus();
    animateStatsCards();
}

// 事件监听器设置
function setupEventListeners() {
    refreshBtn.addEventListener('click', handleRefresh);
    cleanupBtn.addEventListener('click', performManualCleanup);
    eventFilter.addEventListener('change', filterEvents);
    playerFilterInput.addEventListener('input', debounce(filterEvents, 300));
    clearFilterBtn.addEventListener('click', clearFilters);
    exportBtn.addEventListener('click', exportData);
    
    // 模态框事件
    const modalClose = document.querySelector('.modal-close');
    const modalBackdrop = document.querySelector('.modal-backdrop');
    
    modalClose?.addEventListener('click', closeModal);
    modalBackdrop?.addEventListener('click', closeModal);
    
    // 键盘事件
    document.addEventListener('keydown', handleKeyboard);
    
    // 统计卡片点击事件
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', () => {
            const statType = card.dataset.stat;
            if (statType && statType !== 'cache') {
                filterByStatType(statType);
            }
        });
    });
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 键盘事件处理
function handleKeyboard(e) {
    if (e.key === 'Escape' && cleanupModal.classList.contains('show')) {
        closeModal();
    }
    if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleRefresh();
    }
}

// 刷新处理
function handleRefresh() {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `
        <svg class="btn-icon animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.64A9 9 0 0 1 3.51 15"/>
        </svg>
        刷新中...
    `;
    
    Promise.all([fetchEvents(), fetchCleanupStatus()])
        .finally(() => {
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = `
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.64A9 9 0 0 1 3.51 15"/>
                    </svg>
                    刷新数据
                `;
            }, 500);
        });
}

// 获取事件数据
async function fetchEvents() {
    try {
        const response = await fetch('/api/events');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allEvents = await response.json();
        allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        updateStats();
        filterEvents();
        updateConnectionStatus(true);
        updateLastUpdateTime();
        
        // 添加新事件动画
        animateNewEvents();
    } catch (error) {
        console.error('获取事件数据失败:', error);
        updateConnectionStatus(false);
        showNotification('获取数据失败', 'error');
    }
}

// 获取清理状态
async function fetchCleanupStatus() {
    try {
        const response = await fetch('/api/cleanup');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        cleanupStatus = await response.json();
        updateCleanupDisplay();
    } catch (error) {
        console.error('获取清理状态失败:', error);
        cacheStatusEl.textContent = '获取失败';
        cacheDetailsEl.textContent = '';
    }
}

// 更新统计数据
function updateStats() {
    const stats = calculateStats(allEvents);
    
    animateNumber(totalEventsEl, stats.totalEvents);
    animateNumber(activePlayersEl, stats.activePlayers);
    animateNumber(blocksBrokenEl, stats.blocksBroken);
    animateNumber(chatMessagesEl, stats.chatMessages);
}

// 计算统计数据
function calculateStats(events) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = events.filter(event => new Date(event.timestamp) > oneDayAgo);
    const uniquePlayers = new Set(events.map(event => event.player).filter(Boolean));
    
    return {
        totalEvents: events.length,
        activePlayers: uniquePlayers.size,
        blocksBroken: events.filter(event => event.type === 'block_break').length,
        chatMessages: events.filter(event => event.type === 'chat_message').length
    };
}

// 数字动画
function animateNumber(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const increment = Math.ceil((targetValue - currentValue) / 20);
    
    if (currentValue !== targetValue) {
        const timer = setInterval(() => {
            const newValue = parseInt(element.textContent) + increment;
            if ((increment > 0 && newValue >= targetValue) || (increment < 0 && newValue <= targetValue)) {
                element.textContent = targetValue;
                clearInterval(timer);
            } else {
                element.textContent = newValue;
            }
        }, 50);
    }
}

// 统计卡片动画
function animateStatsCards() {
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// 新事件动画
function animateNewEvents() {
    const eventCards = document.querySelectorAll('.event-card');
    eventCards.forEach((card, index) => {
        if (index < 3) { // 只对前3个新事件添加动画
            card.style.animation = `slideIn 0.5s ease ${index * 0.1}s both`;
        }
    });
}

// 过滤事件
function filterEvents() {
    filteredEvents = allEvents.filter(event => {
        const typeMatch = activeFilter === 'all' || event.type === activeFilter;
        const playerMatch = !playerFilter || 
            (event.player && event.player.toLowerCase().includes(playerFilter.toLowerCase()));
        return typeMatch && playerMatch;
    });
    
    renderEvents();
}

// 根据统计类型过滤
function filterByStatType(statType) {
    const filterMap = {
        'events': 'all',
        'players': 'player_join',
        'blocks': 'block_break',
        'chat': 'chat_message'
    };
    
    const filterValue = filterMap[statType];
    if (filterValue) {
        eventFilter.value = filterValue;
        activeFilter = filterValue;
        filterEvents();
        
        // 滚动到事件列表
        document.querySelector('.events-section').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }
}

// 渲染事件列表
function renderEvents() {
    if (filteredEvents.length === 0) {
        eventsList.innerHTML = '<div class="no-events">暂无符合条件的事件</div>';
        return;
    }

    eventsList.innerHTML = filteredEvents.map((event, index) => {
        const eventTime = new Date(event.timestamp);
        const relativeTime = getRelativeTime(eventTime);

        return `
            <div class="event-card ${event.event}" data-index="${index}">
                <div class="event-header">
                    <div class="event-type">${getEventTypeName(event.event)}</div>
                    <div class="event-time-info">
                        <span class="event-time">${eventTime.toLocaleString()}</span>
                        <span class="event-relative-time">${relativeTime}</span>
                    </div>
                </div>
                ${event.player ? `<div class="event-player">玩家: ${event.player}</div>` : ''}
                <div class="event-details">${formatEventDetails(event)}</div>
            </div>
        `;
    }).join('');
}

// 获取事件类型名称
function getEventTypeName(type) {
    const typeNames = {
        'player_join': '玩家加入',
        'player_leave': '玩家离开',
        'block_break': '破坏方块',
        'block_place': '放置方块',
        'chat_message': '聊天消息',
        'gamemode_change': '游戏模式变更',
        'command_execution': '执行命令'
    };
    return typeNames[type] || type;
}

// 格式化事件详情
function formatEventDetails(event) {
    if (typeof event.details === 'object') {
        return JSON.stringify(event.details, null, 2);
    }
    return event.details || '无详细信息';
}

// 获取相对时间
function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return `${seconds}秒前`;
}

// 清除过滤器
function clearFilters() {
    eventFilter.value = 'all';
    playerFilterInput.value = '';
    activeFilter = 'all';
    playerFilter = '';
    filterEvents();
}

// 执行手动清理
async function performManualCleanup() {
    showModal();
    
    try {
        const response = await fetch('/api/cleanup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        document.getElementById('cleanupStatus').innerHTML = `
            <div class="success-message">
                <h4>清理完成</h4>
                <p>已清理 ${result.deletedCount || 0} 条记录</p>
            </div>
        `;
        
        setTimeout(() => {
            closeModal();
            fetchEvents();
            fetchCleanupStatus();
        }, 2000);
        
    } catch (error) {
        console.error('清理失败:', error);
        document.getElementById('cleanupStatus').innerHTML = `
            <div class="error-message">
                <h4>清理失败</h4>
                <p>${error.message}</p>
            </div>
        `;
        
        setTimeout(closeModal, 3000);
    }
}

// 更新清理状态显示
function updateCleanupDisplay() {
    if (!cleanupStatus) return;
    
    const { cacheSize, maxCacheSize, status } = cleanupStatus;
    const percentage = maxCacheSize > 0 ? (cacheSize / maxCacheSize * 100).toFixed(1) : 0;
    
    let statusClass = 'status-good';
    let statusText = '正常';
    
    if (percentage > 80) {
        statusClass = 'status-critical';
        statusText = '需要清理';
    } else if (percentage > 60) {
        statusClass = 'status-warning';
        statusText = '注意';
    }

    cacheStatusEl.textContent = statusText;
    cacheStatusEl.className = `stat-status ${statusClass}`;
    
    if (cacheDetailsEl) {
        cacheDetailsEl.textContent = `${cacheSize}/${maxCacheSize} (${percentage}%)`;
    }
}

// 更新连接状态
function updateConnectionStatus(online) {
    connectionOnline = online;
    const statusDot = document.querySelector('.status-dot');
    const statusText = connectionStatusEl;
    
    if (online) {
        statusDot?.classList.remove('offline');
        if (statusText) statusText.textContent = '已连接';
    } else {
        statusDot?.classList.add('offline');
        if (statusText) statusText.textContent = '连接断开';
    }
}

// 更新最后更新时间
function updateLastUpdateTime() {
    const now = new Date();
    if (lastUpdateEl) {
        lastUpdateEl.textContent = `最后更新: ${now.toLocaleTimeString()}`;
    }
}

// 显示模态框
function showModal() {
    if (cleanupModal) {
        cleanupModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // 重置模态框内容
        document.getElementById('cleanupStatus').innerHTML = `
            <div class="loading-message">
                <h4>正在清理数据</h4>
                <p>请稍候...</p>
            </div>
        `;
    }
}

// 关闭模态框
function closeModal() {
    if (cleanupModal) {
        cleanupModal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// 导出数据
function exportData() {
    try {
        const dataToExport = {
            exportTime: new Date().toISOString(),
            totalEvents: filteredEvents.length,
            events: filteredEvents
        };
        
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `servereye-events-${new Date().toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('数据导出成功', 'success');
    } catch (error) {
        console.error('导出失败:', error);
        showNotification('导出失败', 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 动画显示
    setTimeout(() => notification.classList.add('show'), 100);
    
    // 自动移除
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 开始定期更新
function startPeriodicUpdates() {
    // 每30秒刷新一次数据
    setInterval(() => {
        if (connectionOnline) {
            fetchEvents();
            fetchCleanupStatus();
        }
    }, 30000);
    
    // 每5分钟检查一次连接状态
    setInterval(() => {
        checkConnectionStatus();
    }, 300000);
}

// 检查连接状态
async function checkConnectionStatus() {
    try {
        const response = await fetch('/api/events', { 
            method: 'HEAD',
            timeout: 5000 
        });
        updateConnectionStatus(response.ok);
    } catch (error) {
        updateConnectionStatus(false);
    }
}

// 添加滚动动画
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // 观察所有需要动画的元素
    document.querySelectorAll('.glass-card, .stat-card').forEach(el => {
        observer.observe(el);
    });
}

// 添加键盘快捷键支持
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + R: 刷新
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            handleRefresh();
        }
        
        // Ctrl/Cmd + E: 导出
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            exportData();
        }
        
        // Ctrl/Cmd + F: 聚焦搜索
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            playerFilterInput?.focus();
        }
        
        // Escape: 关闭模态框
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// 添加触摸设备支持
function setupTouchSupport() {
    let touchStartY = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
    });
    
    document.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartY - touchEndY;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // 向上滑动 - 刷新数据
                if (window.scrollY === 0) {
                    handleRefresh();
                }
            }
        }
    }
}

// 性能优化：虚拟滚动（当事件数量很大时）
function setupVirtualScrolling() {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;
    
    const ITEM_HEIGHT = 120; // 每个事件卡片的大概高度
    const VISIBLE_ITEMS = Math.ceil(window.innerHeight / ITEM_HEIGHT) + 5;
    
    let scrollTop = 0;
    let startIndex = 0;
    let endIndex = VISIBLE_ITEMS;

    function updateVisibleItems() {
        if (filteredEvents.length <= VISIBLE_ITEMS) {
            renderEvents(); // 使用原始渲染方法
            return;
        }

        startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
        endIndex = Math.min(startIndex + VISIBLE_ITEMS, filteredEvents.length);

        const visibleEvents = filteredEvents.slice(startIndex, endIndex);
        const totalHeight = filteredEvents.length * ITEM_HEIGHT;
        const offsetY = startIndex * ITEM_HEIGHT;

        eventsList.style.height = `${totalHeight}px`;
        eventsList.style.paddingTop = `${offsetY}px`;

        // 渲染可见的事件
        const eventsHTML = visibleEvents.map((event, index) => {
            const actualIndex = startIndex + index;
            const eventTime = new Date(event.timestamp);
            const relativeTime = getRelativeTime(eventTime);

            return `
                <div class="event-card ${event.event}" data-index="${actualIndex}">
                    <div class="event-header">
                        <div class="event-type">${getEventTypeName(event.event)}</div>
                        <div class="event-time-info">
                            <span class="event-time">${eventTime.toLocaleString()}</span>
                            <span class="event-relative-time">${relativeTime}</span>
                        </div>
                    </div>
                    ${event.player ? `<div class="event-player">玩家: ${event.player}</div>` : ''}
                    <div class="event-details">${formatEventDetails(event)}</div>
                </div>
            `;
        }).join('');

        eventsList.innerHTML = eventsHTML;
    }

    eventsList.addEventListener('scroll', () => {
        scrollTop = eventsList.scrollTop;
        requestAnimationFrame(updateVisibleItems);
    });
}

// 初始化所有功能
function initializeAllFeatures() {
    setupKeyboardShortcuts();
    setupTouchSupport();
    setupVirtualScrolling();
}

// 在DOMContentLoaded事件中添加新的初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    startPeriodicUpdates();
    addScrollAnimations();
    initializeAllFeatures();
});

// 页面可见性API - 当页面不可见时暂停更新
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // 页面隐藏时可以暂停一些更新
        console.log('页面已隐藏，暂停部分更新');
    } else {
        // 页面重新可见时恢复更新
        console.log('页面重新可见，恢复更新');
        fetchEvents();
        fetchCleanupStatus();
    }
});

// 错误处理
window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
    showNotification('发生了一个错误，请刷新页面重试', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的Promise拒绝:', e.reason);
    showNotification('网络请求失败，请检查连接', 'error');
});