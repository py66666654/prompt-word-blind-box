// WebSocket中间件
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// 验证WebSocket连接的令牌
exports.verifySocketToken = async (req, socket, next) => {
  try {
    // 解析URL中的token参数
    const urlParams = new URLSearchParams(req.url.slice(1));
    const token = urlParams.get('token');
    
    if (!token) {
      socket.close(4000, '未提供认证令牌');
      return;
    }
    
    // 验证令牌
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 验证用户是否存在且状态正常
      const [users] = await pool.query(
        'SELECT id, status, role FROM users WHERE id = ?',
        [decoded.id]
      );
      
      if (users.length === 0) {
        socket.close(4001, '用户不存在');
        return;
      }
      
      // 检查用户状态是否正常
      if (users[0].status === 'banned') {
        socket.close(4003, '用户已被禁止访问');
        return;
      }
      
      // 将用户信息附加到socket对象
      socket.userId = decoded.id;
      socket.userRole = users[0].role;
      
      // 记录WebSocket会话
      await recordSocketSession(socket);
      
      next();
    } catch (error) {
      console.error('WebSocket令牌验证失败:', error);
      socket.close(4002, '认证失败');
    }
  } catch (error) {
    console.error('WebSocket中间件错误:', error);
    socket.close(4500, '服务器错误');
  }
};

// 记录WebSocket会话
async function recordSocketSession(socket) {
  try {
    // 生成会话ID
    const sessionId = generateSessionId();
    socket.sessionId = sessionId;
    
    // 获取客户端信息
    const clientInfo = {
      ip: socket._socket.remoteAddress,
      headers: socket.upgradeReq ? socket.upgradeReq.headers : {},
      user_agent: socket.upgradeReq ? socket.upgradeReq.headers['user-agent'] : 'Unknown'
    };
    
    // 记录会话
    await pool.query(`
      INSERT INTO websocket_sessions (
        user_id, session_id, client_info, connected_at
      ) VALUES (?, ?, ?, NOW())
    `, [socket.userId, sessionId, JSON.stringify(clientInfo)]);
    
    // 设置关闭监听器以更新断开连接时间
    socket.on('close', async () => {
      await pool.query(`
        UPDATE websocket_sessions
        SET disconnected_at = NOW(), is_active = FALSE
        WHERE session_id = ?
      `, [sessionId]);
    });
    
    return sessionId;
  } catch (error) {
    console.error('记录WebSocket会话失败:', error);
    return null;
  }
}

// 生成唯一会话ID
function generateSessionId() {
  return 'ws_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

// 检查WebSocket连接状态（心跳检测）
exports.createHeartbeatMiddleware = (wss) => {
  const interval = setInterval(() => {
    wss.clients.forEach(async (socket) => {
      if (socket.isAlive === false) {
        // 如果之前的心跳未响应，则关闭连接
        return socket.terminate();
      }
      
      // 将isAlive设置为false，等待客户端的pong响应
      socket.isAlive = false;
      socket.ping();
      
      // 更新用户最后活跃时间
      if (socket.userId) {
        await pool.query(`
          UPDATE user_online_status
          SET last_seen = NOW()
          WHERE user_id = ?
        `, [socket.userId]);
      }
    });
  }, 30000); // 每30秒检查一次
  
  // 清理间隔
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  // 添加客户端pong响应处理
  return (socket, req, next) => {
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });
    next();
  };
};

// 限制连接数中间件
exports.connectionLimiter = async (req, socket, next) => {
  try {
    // 解析URL中的token参数
    const urlParams = new URLSearchParams(req.url.slice(1));
    const token = urlParams.get('token');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        
        // 获取用户当前活跃连接数
        const [sessions] = await pool.query(`
          SELECT COUNT(*) as count
          FROM websocket_sessions
          WHERE user_id = ? AND is_active = TRUE
        `, [userId]);
        
        // 普通用户限制5个连接，管理员限制10个
        const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
        
        let maxConnections = 5; // 默认限制
        if (users.length > 0 && ['admin', 'super_admin'].includes(users[0].role)) {
          maxConnections = 10; // 管理员限制
        }
        
        // 检查是否超过限制
        if (sessions[0].count >= maxConnections) {
          socket.close(4100, `连接数超过限制（${maxConnections}）`);
          return;
        }
      } catch (error) {
        // 令牌验证失败，但不在这里处理，留给后续中间件
      }
    }
    
    next();
  } catch (error) {
    console.error('连接限制中间件错误:', error);
    socket.close(4500, '服务器错误');
  }
};

module.exports = exports;