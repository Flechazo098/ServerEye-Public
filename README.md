# ServerEye

[![Minecraft](https://img.shields.io/badge/Minecraft-1.21-brightgreen.svg)](https://www.minecraft.net/)
[![Fabric](https://img.shields.io/badge/Mod%20Loader-Fabric-blue.svg)](https://fabricmc.net/)
[![License](https://img.shields.io/badge/License-All%20rights%20reserved-green.svg)](LICENSE)

## 📝 项目介绍

ServerEye是一个Minecraft Fabric服务端MOD，用于实时监控玩家行为并收集数据。它提供了本地Web界面进行数据可视化，同时支持将数据上传到远程服务器进行分析。



## ✨ 主要功能

- **玩家行为监控**：记录玩家的各种行为事件
    - 玩家加入/离开服务器
    - 方块破坏/放置
    - 游戏模式变更
    - 聊天消息（可配置过滤敏感词）

- **数据可视化**：内置Web界面，实时展示服务器数据（可配置 URL 启用远程上传）
    - 事件统计和分析
    - 玩家活动记录
    - 多种筛选和过滤选项

- **高性能设计**：
    - 异步数据处理
    - 事件冷却机制
    - 低资源占用

## 🚀 安装说明

1. 确保你的Minecraft服务器运行在Fabric模组加载器上（Minecraft 1.21）
2. 下载最新版本的ServerEye模组
3. 将模组文件放入服务器的`mods`文件夹中
4. 启动服务器，模组将自动创建配置文件

## ⚙️ 配置说明

首次运行后，配置文件将生成在`config/servereye.json`，而本模组与 ModMenu 集成，可在可视化配置页面配置。


## 📊 使用方法

### 本地Web界面

启动服务器后，可通过以下地址访问Web界面：

```
http://localhost:8080
```

> 注意：端口号可在配置文件中修改

### 远程上传

如果启用了远程上传，可通过以下地址访问中央监控界面：

```
https://your-server.example.com/api/receive
```

### 数据结构

事件数据格式示例：

```json
{
  "timestamp": "2025-05-24T12:34:56Z",
  "player": "Notch",
  "event": "block_break",
  "details": {
    "方块": "minecraft:diamond_ore",
    "坐标": "X: 123, Y: 64, Z: -45"
  },
  "serverIp": "127.0.0.1",
  "serverId": "server-1"
}
```

## 📜 许可证

本项目许可归作者所有，详情请参阅[LICENSE.txt](LICENSE)文件。

## 🤝 贡献

欢迎提交问题报告和功能建议！此仓库作为语言文件 PR 公共仓库，如果你想为项目做出贡献，请遵循以下步骤：

1. Fork本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个Pull Request

## 📞 联系方式

- 项目维护者: **Flechazo**  
  [Gmail](mailto:flechazo09823@gmail.com) | [QQ](mailto:2558755403@qq.com)
 
---

<div align="center">
  <sub>Built with ❤️ by Flechazo</sub>
</div>

        