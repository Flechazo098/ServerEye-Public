# ServerEye 前端开发者文档

## 项目概述

ServerEye 是一个 Minecraft 服务器玩家行为监控 MOD，提供了一个基于 HTTP 的 Web 界面来实时查看玩家活动。本文档将帮助前端开发者理解系统架构并创建自定义的前端界面。

## API 接口规范

### 1. 获取事件数据

**接口地址：** `GET /api/events`

**响应格式：** JSON 数组

**响应示例：**
```json
[
  {
    "timestamp": "2025-06-01T07:58:24.587177700Z",
    "player": "Player488",
    "event": "command_execution",
    "details": {
      "指令": "list",
      "参数": "uuids",
      "参数数量": 1,
      "反馈消息": [
        {
          "客户端语言": "zh_cn",
          "源消息": "There are 1 of a max of 20 players online: Player488 (9aff406e-3282-3c93-8c5e-62214f4adca0)",
          "客户端消息": "当前共有1名玩家在线（最大玩家数为20）：Player488（9aff406e-3282-3c93-8c5e-62214f4adca0）",
          "时间戳": 1748764703575
        }
      ],
      "反馈数量": 1,
      "执行时长毫秒": 1011
    },
    "serverIp": "45.137.183.148"
  }
]
```

### 2. 获取队列状态

**接口地址：** `GET /api/events/status`

**响应格式：** JSON 对象

**响应示例：**
```json
{
  "queueSize": 15,
  "queueCapacity": 10000,
  "queueUsage": 0.15,
  "isShutdown": false
}
```

### 3. 静态文件服务

**接口地址：** `GET /` 或 `GET /{filename}`

服务器会自动从 `/web` 资源目录提供静态文件，支持的文件类型：
- `.html` → `text/html`
- `.css` → `text/css`
- `.js` → `application/javascript`
- `.json` → `application/json`

## 事件类型说明

| 事件类型 | 描述 | 详情字段示例 |
|---------|------|-------------|
| `player_join` | 玩家加入服务器 | `{"joinTime": "..."}` |
| `player_leave` | 玩家离开服务器 | `{"leaveTime": "...", "reason": "..."}`|
| `block_break` | 玩家破坏方块 | `{"blockType": "stone", "position": {...}}` |
| `block_place` | 玩家放置方块 | `{"blockType": "dirt", "position": {...}}` |
| `chat_message` | 玩家发送聊天消息 | `{"message": "Hello world!"}` |
| `gamemode_change` | 游戏模式变更 | `{"oldMode": "survival", "newMode": "creative"}` |
| `command_execution` | 命令执行 | `{"command": "/tp", "feedback": [...]}` |

## 命令反馈数据结构

对于 `command_execution` 事件，`details.feedback` 数组包含以下结构：

```typescript
interface CommandFeedback {
  源消息: string;           // 服务器原始消息（英文）
  客户端语言?: string;       // 客户端语言代码（如 "zh_cn"）
  客户端消息?: string;       // 客户端本地化消息
  时间戳: number;           // Unix 时间戳（毫秒）
}
```

**显示逻辑：**
- 如果 `客户端消息` 与 `源消息` 相同，只显示一个
- 如果不同，显示两个消息以便对比
- 始终显示客户端语言和时间戳

## 现有前端实现分析

### HTML 结构 (`index.html`)

```html
<!-- 主要组件 -->
<header>
  <h1>ServerEye 玩家行为监控</h1>
  <div class="controls">
    <button id="refreshBtn">刷新数据</button>
    <select id="eventFilter"><!-- 事件类型过滤器 --></select>
    <input id="playerFilter" placeholder="玩家名称过滤..."><!-- 玩家过滤器 -->
  </div>
</header>

<main>
  <!-- 统计卡片 -->
  <div class="stats-container">
    <div class="stat-card">
      <h3>总事件数</h3>
      <p id="totalEvents">0</p>
    </div>
    <!-- 更多统计卡片... -->
  </div>
  
  <!-- 事件列表 -->
  <div class="events-container">
    <h2>事件列表</h2>
    <div id="eventsList" class="events-list"></div>
  </div>
</main>
```

### JavaScript 功能 (`script.js`)

**核心功能：**
1. **数据获取：** `fetchEvents()` - 从 `/api/events` 获取数据
2. **数据过滤：** `filterEvents()` - 按事件类型和玩家名过滤
3. **数据渲染：** `renderEvents()` - 动态生成事件卡片
4. **统计更新：** `updateStats()` - 更新统计数字
5. **HTML 转义：** `escapeHtml()` - 防止 XSS 攻击
6. **详情格式化：** `formatDetails()` - 递归格式化复杂对象

**关键变量：**
```javascript
let allEvents = [];      // 所有事件数据
let filteredEvents = []; // 过滤后的事件
let activeFilter = 'all'; // 当前事件类型过滤器
let playerFilter = '';   // 当前玩家名过滤器
```

### CSS 样式系统 (`styles.css`)

**设计特点：**
- 响应式设计（支持移动端）
- 卡片式布局
- 事件类型颜色编码
- 深色头部 + 浅色内容区域

**事件类型颜色：**
```css
.event-card.player_join { border-left-color: #2ecc71; }     /* 绿色 */
.event-card.player_leave { border-left-color: #e74c3c; }    /* 红色 */
.event-card.block_break { border-left-color: #f39c12; }     /* 橙色 */
.event-card.block_place { border-left-color: #9b59b6; }     /* 紫色 */
.event-card.chat_message { border-left-color: #3498db; }    /* 蓝色 */
.event-card.gamemode_change { border-left-color: #1abc9c; } /* 青色 */
.event-card.command_execution { border-left-color: #e67e22; } /* 深橙色 */
```

## 自定义前端开发指南

### 1. 最小化实现

```html
<!DOCTYPE html>
<html>
<head>
    <title>Custom ServerEye Dashboard</title>
</head>
<body>
    <div id="events"></div>
    
    <script>
    async function loadEvents() {
        const response = await fetch('/api/events');
        const events = await response.json();
        
        const container = document.getElementById('events');
        container.innerHTML = events.map(event => `
            <div>
                <strong>${event.player}</strong> - ${event.event}
                <br>Time: ${new Date(event.timestamp).toLocaleString()}
                <br>Details: ${JSON.stringify(event.details, null, 2)}
            </div>
        `).join('<hr>');
    }
    
    // 加载数据
    loadEvents();
    
    // 每30秒刷新
    setInterval(loadEvents, 30000);
    </script>
</body>
</html>
```

### 2. 使用现代前端框架

#### React 示例

```jsx
import React, { useState, useEffect } from 'react';

function ServerEyeDashboard() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    const fetchEvents = async () => {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data);
    };
    
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const filteredEvents = events.filter(event => 
    filter === 'all' || event.event === filter
  );
  
  return (
    <div>
      <select onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All Events</option>
        <option value="player_join">Player Join</option>
        <option value="command_execution">Commands</option>
      </select>
      
      {filteredEvents.map((event, index) => (
        <div key={index} className={`event-${event.event}`}>
          <h3>{event.player} - {event.event}</h3>
          <p>{new Date(event.timestamp).toLocaleString()}</p>
          <pre>{JSON.stringify(event.details, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}

export default ServerEyeDashboard;
```

#### Vue.js 示例

```vue
<template>
  <div>
    <select v-model="filter">
      <option value="all">All Events</option>
      <option value="player_join">Player Join</option>
      <option value="command_execution">Commands</option>
    </select>
    
    <div v-for="event in filteredEvents" :key="event.timestamp" 
         :class="`event-${event.event}`">
      <h3>{{ event.player }} - {{ event.event }}</h3>
      <p>{{ formatTime(event.timestamp) }}</p>
      <pre>{{ JSON.stringify(event.details, null, 2) }}</pre>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      events: [],
      filter: 'all'
    }
  },
  computed: {
    filteredEvents() {
      return this.events.filter(event => 
        this.filter === 'all' || event.event === this.filter
      );
    }
  },
  mounted() {
    this.fetchEvents();
    setInterval(this.fetchEvents, 30000);
  },
  methods: {
    async fetchEvents() {
      const response = await fetch('/api/events');
      this.events = await response.json();
    },
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleString();
    }
  }
}
</script>
```

### 3. 高级功能建议

#### 实时更新（WebSocket）

虽然当前系统使用轮询，你可以扩展后端支持 WebSocket：

```javascript
// 客户端 WebSocket 连接
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onmessage = (event) => {
  const newEvent = JSON.parse(event.data);
  // 添加到事件列表
  addNewEvent(newEvent);
};
```

#### 数据可视化

使用 Chart.js 或 D3.js 创建图表：

```javascript
// 使用 Chart.js 创建事件统计图
const ctx = document.getElementById('eventChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'doughnut',
  data: {
    labels: ['Player Join', 'Block Break', 'Chat Message'],
    datasets: [{
      data: [joinCount, breakCount, chatCount],
      backgroundColor: ['#2ecc71', '#f39c12', '#3498db']
    }]
  }
});
```

#### 高级过滤和搜索

```javascript
// 时间范围过滤
function filterByTimeRange(events, startTime, endTime) {
  return events.filter(event => {
    const eventTime = new Date(event.timestamp);
    return eventTime >= startTime && eventTime <= endTime;
  });
}

// 详情内容搜索
function searchInDetails(events, searchTerm) {
  return events.filter(event => {
    const detailsStr = JSON.stringify(event.details).toLowerCase();
    return detailsStr.includes(searchTerm.toLowerCase());
  });
}
```

## 部署和配置

### 1. 替换默认前端

将你的自定义前端文件放在 MOD 的 `src/main/resources/web/` 目录下：

```
src/main/resources/web/
├── index.html      # 主页面
├── styles.css      # 样式文件
├── script.js       # JavaScript 逻辑
└── assets/         # 其他资源文件
    ├── images/
    └── fonts/
```

### 2. 配置服务器

在 Minecraft 服务器的配置文件中调整设置：

```json
{
  "web": {
    "enableLocalWebInterface": true,
    "webServerPort": 8080,
    "saveToLocalFiles": false
  }
}
```

### 3. 反向代理配置（可选）

如果需要通过域名访问，可以配置 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 安全注意事项

1. **XSS 防护：** 始终对用户输入进行 HTML 转义
2. **CORS 配置：** 服务器已设置 `Access-Control-Allow-Origin: *`
3. **输入验证：** 对 API 参数进行验证
4. **访问控制：** 考虑添加身份验证机制

## 性能优化建议

1. **分页加载：** 对于大量事件，实现分页或虚拟滚动
2. **缓存策略：** 使用浏览器缓存和 Service Worker
3. **压缩传输：** 启用 gzip 压缩
4. **懒加载：** 延迟加载非关键资源

## 故障排除

### 常见问题

1. **无法访问 Web 界面**
    - 检查端口是否被占用
    - 确认 `enableLocalWebInterface` 为 `true`
    - 查看服务器日志

2. **数据不更新**
    - 检查网络连接
    - 确认 API 端点响应正常
    - 查看浏览器控制台错误

3. **样式显示异常**
    - 检查 CSS 文件路径
    - 确认 MIME 类型正确
    - 清除浏览器缓存

### 调试工具

```javascript
// 在浏览器控制台中调试
console.log('Current events:', allEvents);
console.log('Filtered events:', filteredEvents);

// 检查 API 响应
fetch('/api/events')
  .then(r => r.json())
  .then(data => console.log('API Response:', data));

// 检查队列状态
fetch('/api/events/status')
  .then(r => r.json())
  .then(status => console.log('Queue Status:', status));
```

## 总结

ServerEye 提供了一个灵活的 Web 界面框架，你可以：

1. 直接修改现有的 HTML/CSS/JS 文件
2. 使用现代前端框架重新构建
3. 集成第三方可视化库
4. 添加自定义功能和样式
5. 如果感觉mod后端局限很大，欢迎fork修改成自己想要的样子

关键是理解 API 接口和数据结构，然后根据你的需求创建合适的用户界面。现有的实现提供了一个很好的起点，你可以在此基础上进行扩展和定制。
        