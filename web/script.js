// 全局变量
let allEvents = [];
let filteredEvents = [];
let activeFilter = 'all';
let playerFilter = '';
let cleanupStatus = null;
let connectionOnline = true;

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
const lastUpdateEl = document.getElementById('lastUpdate');
const cleanupModal = document.getElementById('cleanupModal');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    fetchEvents();
    fetchCleanupStatus();
    
    // 事件监听
    refreshBtn.addEventListener('click', () => {
        fetchEvents();
        fetchCleanupStatus();
    });
    cleanupBtn.addEventListener('click', performManualCleanup);
    eventFilter.addEventListener('change', filterEvents);
    playerFilterInput.addEventListener('input', filterEvents);
    clearFilterBtn.addEventListener('click', clearFilters);
    exportBtn.addEventListener('click', exportData);
    
    // 模态框关闭
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === cleanupModal) {
            closeModal();
        }
    });
    
    // 定时刷新（每30秒）
    setInterval(() => {
        fetchEvents();
        fetchCleanupStatus();
    }, 30000);
});

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
    } catch (error) {
        console.error('获取事件数据失败:', error);
        updateConnectionStatus(false);
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

// 执行手动清理
async function performManualCleanup() {
    showModal();
    
    try {
        const response = await fetch('/api/cleanup', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('cleanupStatus').innerHTML = `
                <div class="success-message">
                    <h4>✅ 清理完成</h4>
                    <p>${result.message}</p>
                </div>
            `;
            cleanupStatus = result.status;
            updateCleanupDisplay();
            // 刷新事件数据
            setTimeout(() => {
                fetchEvents();
                closeModal();
            }, 2000);
        } else {
            document.getElementById('cleanupStatus').innerHTML = `
                <div class="error-message">
                    <h4>❌ 清理失败</h4>
                    <p>${result.message}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('执行清理失败:', error);
        document.getElementById('cleanupStatus').innerHTML = `
            <div class="error-message">
                <h4>❌ 清理失败</h4>
                <p>网络错误: ${error.message}</p>
            </div>
        `;
    }
}

// 更新清理状态显示
function updateCleanupDisplay() {
    if (!cleanupStatus) return;
    
    const usage = Math.round((cleanupStatus.currentCacheSize / cleanupStatus.maxCacheSize) * 100);
    cacheStatusEl.textContent = `${cleanupStatus.currentCacheSize}/${cleanupStatus.maxCacheSize} (${usage}%)`;
    
    const details = [
        `最旧事件: ${cleanupStatus.oldestEventAgeDays}天前`,
        `自动清理: ${cleanupStatus.autoCleanupEnabled ? '启用' : '禁用'}`,
        `清理间隔: ${cleanupStatus.cleanupIntervalHours}小时`
    ];
    cacheDetailsEl.textContent = details.join(' | ');
    
    // 根据使用率设置颜色
    cacheStatusEl.className = '';
    if (usage >= 90) {
        cacheStatusEl.classList.add('status-critical');
    } else if (usage >= 70) {
        cacheStatusEl.classList.add('status-warning');
    } else {
        cacheStatusEl.classList.add('status-good');
    }
}

// 更新连接状态
function updateConnectionStatus(online) {
    connectionOnline = online;
    connectionStatusEl.textContent = `连接状态: ${online ? '在线' : '离线'}`;
    connectionStatusEl.className = online ? 'status-online' : 'status-offline';
}

// 更新最后更新时间
function updateLastUpdateTime() {
    const now = new Date();
    lastUpdateEl.textContent = `最后更新: ${now.toLocaleTimeString()}`;
}

// 清除过滤器
function clearFilters() {
    eventFilter.value = 'all';
    playerFilterInput.value = '';
    activeFilter = 'all';
    playerFilter = '';
    filterEvents();
}

// 导出数据
function exportData() {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `servereye-events-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 模态框控制
function showModal() {
    cleanupModal.style.display = 'block';
    document.getElementById('cleanupStatus').innerHTML = `
        <div class="loading-message">
            <h4>🔄 正在执行清理...</h4>
            <p>请稍候，正在清理过期数据</p>
        </div>
    `;
}

function closeModal() {
    cleanupModal.style.display = 'none';
}

// 过滤事件
function filterEvents() {
    activeFilter = eventFilter.value;
    playerFilter = playerFilterInput.value.toLowerCase();
    
    filteredEvents = allEvents.filter(event => {
        const matchesType = activeFilter === 'all' || event.event === activeFilter;
        const matchesPlayer = !playerFilter || event.player.toLowerCase().includes(playerFilter);
        return matchesType && matchesPlayer;
    });
    
    renderEvents();
}

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化详情
function formatDetails(details, indent = '') {
    if (!details || typeof details !== 'object') return '无详情';

    let result = '';

    for (const [key, value] of Object.entries(details)) {
        if (Array.isArray(value)) {
            result += `${indent}${escapeHtml(key)}:\n`;
            value.forEach((item) => {
                if (typeof item === 'object') {
                    if (item.源消息) {
                        result += `${indent}  源消息: \n${escapeHtml(item.源消息)}\n`;
                        
                        if (item.客户端语言) {
                            result += `${indent}  客户端语言: ${escapeHtml(item.客户端语言)}\n`;
                        }
                        
                        if (item.客户端消息 && item.客户端消息 !== item.源消息) {
                            result += `${indent}  客户端消息: \n${escapeHtml(item.客户端消息)}\n`;
                        }
                        
                        if (item.时间戳) {
                            const timestamp = new Date(item.时间戳);
                            result += `${indent}  时间戳: ${timestamp.toLocaleString()}\n`;
                        }
                    } else {
                        result += formatDetails(item, indent + '  ');
                    }
                } else {
                    result += `${indent}  - ${escapeHtml(String(item))}\n`;
                }
            });
        } else if (typeof value === 'object') {
            result += `${indent}${escapeHtml(key)}:\n`;
            result += formatDetails(value, indent + '  ');
        } else if (typeof value === 'string' && value.includes('\n')) {
            result += `${indent}${escapeHtml(key)}:\n`;
            value.split('\n').forEach(line => {
                result += `${indent}  ${escapeHtml(line)}\n`;
            });
        } else {
            result += `${indent}${escapeHtml(key)}: ${escapeHtml(String(value))}\n`;
        }
    }

    return result;
}

// 渲染事件列表
function renderEvents() {
    eventsList.innerHTML = '';
    
    if (filteredEvents.length === 0) {
        eventsList.innerHTML = '<p class="no-events">没有匹配的事件</p>';
        return;
    }
    
    filteredEvents.forEach((event, index) => {
        const eventCard = document.createElement('div');
        eventCard.className = `event-card ${event.event}`;
        
        const eventTime = new Date(event.timestamp);
        const formattedTime = eventTime.toLocaleString('zh-CN');
        const relativeTime = getRelativeTime(eventTime);
        
        let eventTypeText = '';
        switch(event.event) {
            case 'player_join': eventTypeText = '玩家加入'; break;
            case 'player_leave': eventTypeText = '玩家离开'; break;
            case 'block_break': eventTypeText = '破坏方块'; break;
            case 'block_place': eventTypeText = '放置方块'; break;
            case 'chat_message': eventTypeText = '聊天消息'; break;
            case 'gamemode_change': eventTypeText = '游戏模式变更'; break;
            case 'command_execution': eventTypeText = '执行命令'; break;
            default: eventTypeText = event.event;
        }
        
        eventCard.innerHTML = `
            <div class="event-header">
                <span class="event-type">${escapeHtml(eventTypeText)}</span>
                <div class="event-time-info">
                    <span class="event-time">${escapeHtml(formattedTime)}</span>
                    <span class="event-relative-time">${relativeTime}</span>
                </div>
            </div>
            <div class="event-player">${escapeHtml(event.player)}</div>
            <div class="event-details"><pre>${formatDetails(event.details)}</pre></div>
            <div class="event-index">#${allEvents.length - index}</div>
        `;
        
        eventsList.appendChild(eventCard);
    });
}

// 获取相对时间
function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    return `${diffDays}天前`;
}

// 更新统计信息
function updateStats() {
    totalEventsEl.textContent = allEvents.length;
    
    const uniquePlayers = new Set(allEvents.map(event => event.player));
    activePlayersEl.textContent = uniquePlayers.size;
    
    const blockBreakEvents = allEvents.filter(event => event.event === 'block_break');
    blocksBrokenEl.textContent = blockBreakEvents.length;
    
    const chatEvents = allEvents.filter(event => event.event === 'chat_message');
    chatMessagesEl.textContent = chatEvents.length;
}