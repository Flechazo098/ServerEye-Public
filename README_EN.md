# ServerEye

[![Minecraft](https://img.shields.io/badge/Minecraft-1.21-brightgreen.svg)](https://www.minecraft.net/)  
[![Fabric](https://img.shields.io/badge/Mod%20Loader-Fabric-blue.svg)](https://fabricmc.net/)  
[![License](https://img.shields.io/badge/License-All%20rights%20reserved-green.svg)](LICENSE.txt)

## 📝 Project Overview

**ServerEye** is a Minecraft Fabric server mod designed to monitor player behavior in real time and collect event data. It provides a built-in web interface for local data visualization and supports remote uploading to centralized servers for analysis.

---

## ✨ Features

- **Player Activity Monitoring**: Tracks various player events, including:
    - Player join/leave
    - Block breaking/placing
    - Game mode changes
    - Chat messages (with optional sensitive word filtering)

- **Data Visualization**: Built-in web dashboard to view server statistics and analytics
    - Event summaries and breakdowns
    - Player activity logs
    - Filtering and search capabilities

- **High Performance Design**:
    - Asynchronous data processing
    - Event cooldown control
    - Minimal resource usage

---

## 🚀 Installation

1. Ensure your server is running on the **Fabric mod loader** (Minecraft 1.21)
2. Download the latest version of the ServerEye mod
3. Place the mod `.jar` file into the server's `mods` folder
4. Start the server – configuration files will be generated automatically

---

## ⚙️ Configuration

Upon first launch, a config file will be generated at `config/servereye.json`.  
The mod is fully compatible with **ModMenu**, allowing GUI-based configuration.

---

## 📊 Usage

### Local Web Interface

After the server starts, you can access the web dashboard at:

```
http://localhost:8080
```

> Tip: The port number can be changed in the configuration file.

### Remote Upload

If remote uploading is enabled, event data can be accessed via your server endpoint:

```
https://your-server.example.com/api/receive
```

### Event Data Format

Here’s a sample of the event data structure:

```json
{
  "timestamp": "2025-05-24T12:34:56Z",
  "player": "Notch",
  "event": "block_break",
  "details": {
    "block": "minecraft:diamond_ore",
    "position": "X: 123, Y: 64, Z: -45"
  },
  "serverIp": "127.0.0.1",
  "serverId": "server-1"
}
```

---

## 📜 License

All rights reserved by the author.  
For details, please refer to the [LICENSE.txt](LICENSE.txt) file.

---

## 🤝 Contributing

You're welcome to submit issues or feature suggestions!  
This repository is intended as a **public PR hub for language files only**. If you'd like to contribute:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to your fork (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Contact

- Maintainer: **Flechazo**  
  [Gmail](mailto:flechazo09823@gmail.com) | [QQ](mailto:2558755403@qq.com)

---

<div align="center">
  <sub>Built with ❤️ by Flechazo</sub>
</div>

---