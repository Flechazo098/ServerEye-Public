// 多语言系统
class I18n {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'zh';
        this.translations = {};
        this.loadLanguage(this.currentLanguage);
    }

    async loadLanguage(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load language: ${lang}`);
            }
            this.translations = await response.json();
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            this.updateUI();
            this.updateDocumentLanguage();
        } catch (error) {
            console.error('Failed to load language:', error);
            // 如果加载失败，尝试加载默认语言
            if (lang !== 'zh') {
                this.loadLanguage('zh');
            }
        }
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }

        if (typeof value === 'string') {
            // 支持参数替换
            return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
                return params[param] || match;
            });
        }

        return key;
    }

    updateUI() {
        // 更新所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            if (element.tagName === 'INPUT' && element.type === 'text') {
                // 对于输入框，更新placeholder
                if (element.hasAttribute('data-i18n-placeholder')) {
                    const placeholderKey = element.getAttribute('data-i18n-placeholder');
                    element.placeholder = this.t(placeholderKey);
                }
            } else {
                element.textContent = translation;
            }
        });

        // 更新placeholder属性
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // 更新页面标题
        document.title = `${this.t('nav.title')} - ${this.t('hero.description')}`;
    }

    updateDocumentLanguage() {
        document.documentElement.lang = this.currentLanguage === 'zh' ? 'zh-CN' : 'en';
    }

    setLanguage(lang) {
        if (lang !== this.currentLanguage) {
            this.loadLanguage(lang);
        }
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// 创建全局i18n实例
const i18n = new I18n();

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
const languageSelect = document.getElementById('languageSelect');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    startPeriodicUpdates();
    addScrollAnimations();
    initializeLanguage();
});

// 语言初始化
function initializeLanguage() {
    // 设置语言选择器的当前值
    languageSelect.value = i18n.getCurrentLanguage();

    // 添加语言切换事件监听器
    languageSelect.addEventListener('change', (e) => {
        const newLang = e.target.value;
        localStorage.setItem('language', newLang); // 提前保存
        location.reload(); // 直接刷新页面
    });
}

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
        ${i18n.t('hero.refreshing')}
    `;

    Promise.all([fetchEvents(), fetchCleanupStatus()])
        .finally(() => {
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = `
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.64A9 9 0 0 1 3.51 15"/>
                    </svg>
                    <span>${i18n.t('hero.refresh_btn')}</span>
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
        showNotification(i18n.t('messages.fetch_error'), 'error');
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
        cacheStatusEl.textContent = i18n.t('messages.fetch_error');
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
        eventsList.innerHTML = `<div class="no-events">${i18n.t('events.no_events')}</div>`;
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
                ${event.player ? `<div class="event-player">${i18n.t('events.player')}: ${event.player}</div>` : ''}
                <div class="event-details">${formatEventDetails(event)}</div>
            </div>
        `;
    }).join('');
}

// 获取事件类型名称
function getEventTypeName(type) {
    return i18n.t(`event_types.${type}`) || type;
}

// 格式化事件详情
function formatEventDetails(event) {
    if (!event.details || typeof event.details !== 'object') {
        return event.details || i18n.t('event_details.none');
    }

    const details = event.details;
    let formattedDetails = '';

    // 定义字段映射关系
    const fieldMappings = {
        'Command': 'command',                     // 命令
        'Parameters': 'parameters',               // 参数
        'Parameter Count': 'parameter_count',     // 参数数量
        'Feedback Messages': 'feedback_messages',// 反馈消息
        'Feedback Count': 'feedback_count',      // 反馈数量
        'Dimension': 'dimension',                 // 维度
        'Coordinates': 'coordinates',             // 坐标
        'Block': 'block',                         // 方块
        'Game Mode': 'gamemode',                  // 游戏模式
        'Previous Game Mode': 'previous_gamemode',// 变更前的游戏模式
        'New Game Mode': 'new_gamemode',          // 变更后的游戏模式
        'Message Content': 'message_content',     // 消息内容
        'Online Time': 'online_time',             // 在线时长
        'Word Count': 'word_count',               // 字数统计
        'Execution Time (ms)': 'execution_time_ms',// 执行时间（毫秒）
        'Game Mode Change': 'gamemode_change',    // 游戏模式变更
        'No Parameters': 'no_parameters'          // 无参数
    };

    // 遍历事件详情对象
    for (const [key, value] of Object.entries(details)) {
        // 获取翻译键
        const translationKey = fieldMappings[key] || key.toLowerCase().replace(/\s+/g, '_');

        // 获取翻译后的字段名
        const translatedKey = i18n.t(`event_details.${translationKey}`) || key;

        // 格式化值
        let formattedValue = formatValue(value);

        formattedDetails += `<div class="detail-item"><strong>${translatedKey}:</strong> ${formattedValue}</div>`;
    }

    return formattedDetails || i18n.t('event_details.none');
}

// 新增：格式化值的辅助函数
function formatValue(value) {
    if (value === null || value === undefined || value === '') {
        return i18n.t('event_details.none');
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return i18n.t('event_details.none');
        }
        // 处理数组中的每个元素
        const formattedItems = value.map(item => {
            if (typeof item === 'object' && item !== null) {
                return formatObjectValue(item);
            }
            return String(item);
        });
        return formattedItems.join('<br>');
    }

    if (typeof value === 'object' && value !== null) {
        return formatObjectValue(value);
    }

    return String(value).replace(/\n/g, '<br>');
}

// 新增：格式化对象值的辅助函数
function formatObjectValue(obj) {
    if (obj === null || obj === undefined) {
        return i18n.t('event_details.none');
    }

    // 如果对象有 toString 方法且不是默认的 [object Object]
    const stringValue = obj.toString();
    if (stringValue !== '[object Object]') {
        return stringValue;
    }

    // 尝试格式化为键值对
    const entries = Object.entries(obj);
    if (entries.length === 0) {
        return i18n.t('event_details.none');
    }

    // 如果对象比较简单（少于等于3个属性），显示为内联格式
    if (entries.length <= 3) {
        return entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ');
    }

    // 如果对象比较复杂，显示为多行格式
    const formattedEntries = entries.map(([k, v]) => {
        return `&nbsp;&nbsp;${k}: ${formatValue(v)}`;
    });
    return formattedEntries.join('<br>');
}

// 获取相对时间
function getRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return i18n.t('events.just_now');
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} ${i18n.t('events.minutes')} ${i18n.t('events.time_ago')}`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${i18n.t('events.hours')} ${i18n.t('events.time_ago')}`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} ${i18n.t('events.days')} ${i18n.t('events.time_ago')}`;
    }
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
    try {
        const response = await fetch('/api/cleanup', { method: 'POST' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            showNotification(i18n.t('messages.cleanup_success'), 'success');
            fetchCleanupStatus(); // 重新获取清理状态
        } else {
            throw new Error(result.message || 'Cleanup failed');
        }
    } catch (error) {
        console.error('清理失败:', error);
        showNotification(i18n.t('messages.cleanup_error'), 'error');
    }
}

// 更新清理状态显示
function updateCleanupDisplay() {
    if (!cleanupStatus) return;

    const { cacheSize, maxCacheSize } = cleanupStatus;
    const percentage = maxCacheSize > 0 ? (cacheSize / maxCacheSize) * 100 : 0;

    let statusText, statusClass;
    if (percentage < 50) {
        statusText = i18n.t('cleanup.status_good');
        statusClass = 'status-good';
    } else if (percentage < 80) {
        statusText = i18n.t('cleanup.status_warning');
        statusClass = 'status-warning';
    } else {
        statusText = i18n.t('cleanup.status_critical');
        statusClass = 'status-critical';
    }

    cacheStatusEl.textContent = statusText;
    cacheStatusEl.className = `stat-value ${statusClass}`;
    cacheDetailsEl.textContent = `${cacheSize}/${maxCacheSize} (${percentage.toFixed(1)}%)`;
}


// 更新连接状态
function updateConnectionStatus(isOnline) {
    connectionOnline = isOnline;
    const statusText = isOnline ? i18n.t('nav.connected') : i18n.t('nav.disconnected');
    const statusClass = isOnline ? 'connected' : 'disconnected';

    connectionStatusEl.textContent = statusText;
    connectionIndicator.className = `status-indicator ${statusClass}`;
}

// 更新最后更新时间
function updateLastUpdateTime() {
    const now = new Date();
    if (lastUpdateEl) {
        lastUpdateEl.textContent = `${i18n.t('stats.status_last_update')}: ${now.toLocaleTimeString()}`;
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
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    const container = document.getElementById('notificationContainer');
    container.appendChild(notification);

    // 显示动画
    setTimeout(() => notification.classList.add('show'), 100);

    // 自动隐藏
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => container.removeChild(notification), 300);
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