# ServerEye Frontend Developer Documentation

## Project Overview

**ServerEye** is a Minecraft mod for monitoring player behavior on servers. It provides an HTTP-based web interface for real-time viewing of player activity. This documentation helps frontend developers understand the system architecture and build custom frontend interfaces.

## API Specification

### 1. Fetch Event Data

**Endpoint:** `GET /api/events`

**Response Format:** JSON Array

**Example Response:**
```json
[
  {
    "timestamp": "2025-06-01T07:58:24.587177700Z",
    "player": "Player488",
    "event": "command_execution",
    "details": {
      "Command": "list",
      "Arguments": "uuids",
      "ArgumentCount": 1,
      "Feedback": [
        {
          "ClientLanguage": "zh_cn",
          "RawMessage": "There are 1 of a max of 20 players online: Player488 (9aff406e-3282-3c93-8c5e-62214f4adca0)",
          "ClientMessage": "当前共有1名玩家在线（最大玩家数为20）：Player488（9aff406e-3282-3c93-8c5e-62214f4adca0）",
          "Timestamp": 1748764703575
        }
      ],
      "FeedbackCount": 1,
      "ExecutionDurationMs": 1011
    },
    "serverIp": "45.137.183.148"
  }
]
```

### 2. Get Queue Status

**Endpoint:** `GET /api/events/status`

**Response Format:** JSON Object

**Example Response:**
```json
{
  "queueSize": 15,
  "queueCapacity": 10000,
  "queueUsage": 0.15,
  "isShutdown": false
}
```

### 3. Static File Service

**Endpoint:** `GET /` or `GET /{filename}`

Static files are served from the `/web` resource directory. Supported file types:
- `.html` → `text/html`
- `.css` → `text/css`
- `.js` → `application/javascript`
- `.json` → `application/json`

## Event Types

| Type               | Description              | Example Details                        |
|--------------------|--------------------------|----------------------------------------|
| `player_join`      | Player joins the server  | `{"joinTime": "..."}`                  |
| `player_leave`     | Player leaves the server | `{"leaveTime": "...", "reason": "..."}` |
| `block_break`      | Player breaks a block    | `{"blockType": "stone", "position": {...}}` |
| `block_place`      | Player places a block    | `{"blockType": "dirt", "position": {...}}` |
| `chat_message`     | Player sends a message   | `{"message": "Hello world!"}`         |
| `gamemode_change`  | Game mode changes        | `{"oldMode": "survival", "newMode": "creative"}` |
| `command_execution`| Player executes a command| `{"command": "/tp", "feedback": [...]}` |

## Command Feedback Structure

For `command_execution` events, the `details.feedback` array uses the following structure:

```typescript
interface CommandFeedback {
  RawMessage: string;        // Original server message (English)
  ClientLanguage?: string;   // Client language code (e.g., "zh_cn")
  ClientMessage?: string;    // Localized message for client
  Timestamp: number;         // Unix timestamp in milliseconds
}
```

**Display Logic:**
- If `ClientMessage` equals `RawMessage`, show only one.
- If different, show both for comparison.
- Always display the language and timestamp.

## Existing Frontend Structure

### HTML Layout (`index.html`)
```html
<header>
  <h1>ServerEye Player Activity Monitor</h1>
  <div class="controls">
    <button id="refreshBtn">Refresh</button>
    <select id="eventFilter"></select>
    <input id="playerFilter" placeholder="Filter by player name...">
  </div>
</header>

<main>
  <div class="stats-container">
    <div class="stat-card">
      <h3>Total Events</h3>
      <p id="totalEvents">0</p>
    </div>
  </div>

  <div class="events-container">
    <h2>Event List</h2>
    <div id="eventsList" class="events-list"></div>
  </div>
</main>
```

### JavaScript Features (`script.js`)

**Key Functions:**
1. `fetchEvents()` – Fetch data from `/api/events`
2. `filterEvents()` – Filter by event type and player name
3. `renderEvents()` – Render events dynamically
4. `updateStats()` – Update statistics
5. `escapeHtml()` – XSS protection
6. `formatDetails()` – Recursively format complex objects

**Key Variables:**
```javascript
let allEvents = [];
let filteredEvents = [];
let activeFilter = 'all';
let playerFilter = '';
```

### CSS Design (`styles.css`)

**Style Highlights:**
- Responsive layout (mobile-friendly)
- Card-based UI
- Color-coded event types
- Dark header, light content

**Event Colors:**
```css
.event-card.player_join { border-left-color: #2ecc71; }
.event-card.player_leave { border-left-color: #e74c3c; }
.event-card.block_break { border-left-color: #f39c12; }
.event-card.block_place { border-left-color: #9b59b6; }
.event-card.chat_message { border-left-color: #3498db; }
.event-card.gamemode_change { border-left-color: #1abc9c; }
.event-card.command_execution { border-left-color: #e67e22; }
```

## Custom Frontend Development Guide

### 1. Minimal Example

```html
<!DOCTYPE html>
<html>
<head><title>Custom ServerEye Dashboard</title></head>
<body>
<div id="events"></div>

<script>
async function loadEvents() {
  const response = await fetch('/api/events');
  const events = await response.json();

  document.getElementById('events').innerHTML = events.map(event => `
    <div>
      <strong>${event.player}</strong> - ${event.event}<br>
      Time: ${new Date(event.timestamp).toLocaleString()}<br>
      Details: ${JSON.stringify(event.details, null, 2)}
    </div>
  `).join('<hr>');
}
loadEvents();
setInterval(loadEvents, 30000);
</script>
</body>
</html>
```

### 2. Using Modern Frameworks

#### React

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

  const filtered = events.filter(e => filter === 'all' || e.event === filter);

  return (
    <div>
      <select onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All Events</option>
        <option value="player_join">Player Join</option>
        <option value="command_execution">Commands</option>
      </select>
      {filtered.map((e, i) => (
        <div key={i}>
          <h3>{e.player} - {e.event}</h3>
          <p>{new Date(e.timestamp).toLocaleString()}</p>
          <pre>{JSON.stringify(e.details, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
```

#### Vue.js

```vue
<template>
  <div>
    <select v-model="filter">
      <option value="all">All Events</option>
      <option value="player_join">Player Join</option>
      <option value="command_execution">Commands</option>
    </select>
    <div v-for="event in filteredEvents" :key="event.timestamp">
      <h3>{{ event.player }} - {{ event.event }}</h3>
      <p>{{ formatTime(event.timestamp) }}</p>
      <pre>{{ JSON.stringify(event.details, null, 2) }}</pre>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return { events: [], filter: 'all' };
  },
  computed: {
    filteredEvents() {
      return this.events.filter(e => this.filter === 'all' || e.event === this.filter);
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
    formatTime(ts) {
      return new Date(ts).toLocaleString();
    }
  }
}
</script>
```

### 3. Advanced Features

#### Real-Time Updates (WebSocket)

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onmessage = (event) => {
  const newEvent = JSON.parse(event.data);
  // Append to UI
};
```

#### Data Visualization (Chart.js)

```javascript
const chart = new Chart(document.getElementById('eventChart'), {
  type: 'doughnut',
  data: {
    labels: ['Player Join', 'Block Break', 'Chat'],
    datasets: [{
      data: [joinCount, breakCount, chatCount],
      backgroundColor: ['#2ecc71', '#f39c12', '#3498db']
    }]
  }
});
```

#### Filtering

```javascript
function filterByTime(events, start, end) {
  return events.filter(e => {
    const t = new Date(e.timestamp);
    return t >= start && t <= end;
  });
}

function searchDetails(events, term) {
  return events.filter(e =>
    JSON.stringify(e.details).toLowerCase().includes(term.toLowerCase())
  );
}
```

## Deployment & Configuration

### 1. Replace Default Frontend

Place your files in:

```
src/main/resources/web/
├── index.html
├── styles.css
├── script.js
└── assets/
```

### 2. Server Config

```json
{
  "web": {
    "enableLocalWebInterface": true,
    "webServerPort": 8080,
    "saveToLocalFiles": false
  }
}
```

### 3. Reverse Proxy (Optional)

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

## Security Notes

1. Always escape user input (XSS)
2. CORS is enabled: `Access-Control-Allow-Origin: *`
3. Validate all API parameters
4. Consider adding authentication

## Performance Tips

1. Use pagination or virtual scrolling
2. Enable browser caching and Service Worker
3. Use gzip compression
4. Lazy-load non-critical assets

## Troubleshooting

### Common Issues

1. **Cannot access the web interface**
    - Check if the port is in use
    - Ensure `enableLocalWebInterface` is `true`
    - Check server logs

2. **Data not updating**
    - Verify network connectivity
    - Check API responses
    - Use browser console to debug

3. **CSS not loading properly**
    - Check file paths and MIME types
    - Clear browser cache

### Debugging Tools

```javascript
console.log('Current events:', allEvents);
console.log('Filtered events:', filteredEvents);

fetch('/api/events')
  .then(r => r.json())
  .then(data => console.log('API Response:', data));

fetch('/api/events/status')
  .then(r => r.json())
  .then(status => console.log('Queue Status:', status));
```

## Summary

ServerEye provides a flexible web framework for monitoring player behavior. You can:

1. Customize or replace HTML/CSS/JS
2. Use frameworks like React/Vue
3. Add visualization tools
4. Extend functionality with filters/searches
5. File an issue if something’s missing in the backend

Understanding the API and data structures is the key to building your perfect frontend.

---
