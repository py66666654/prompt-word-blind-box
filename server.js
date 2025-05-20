// 导入必要的依赖
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const { initDb } = require('./config/database');
const { initWebsocketServer } = require('./services/websocket.service');

// 创建Express应用
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || PORT;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API路由
app.use('/api', routes);

// 前端路由处理（SPA支持）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 初始化WebSocket服务
const wss = initWebsocketServer(server);

// 初始化数据库连接
initDb()
  .then(() => {
    // 启动HTTP服务器
    server.listen(PORT, () => {
      console.log(`HTTP服务器运行在 http://localhost:${PORT}`);
      console.log(`WebSocket服务器运行在 ws://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });