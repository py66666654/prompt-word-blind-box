-- 实时通知系统数据库扩展

USE prompt_blind_box_db;

-- 系统广播表
CREATE TABLE IF NOT EXISTS system_broadcasts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    sender_id INT,
    recipient_filter JSON, -- 用于存储用户过滤条件
    recipient_count INT NOT NULL, -- 接收者数量
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 在线状态表
CREATE TABLE IF NOT EXISTS user_online_status (
    user_id INT PRIMARY KEY,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP,
    last_activity VARCHAR(255), -- 最后活动描述
    socket_id VARCHAR(100), -- WebSocket连接ID
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 更新通知表，添加实时通知字段
ALTER TABLE notifications 
ADD COLUMN is_realtime BOOLEAN DEFAULT FALSE AFTER is_read,
ADD COLUMN delivery_status ENUM('pending', 'delivered', 'read', 'failed') DEFAULT 'pending' AFTER is_realtime,
ADD COLUMN delivered_at TIMESTAMP NULL AFTER delivery_status;

-- 协作编辑历史表
CREATE TABLE IF NOT EXISTS collaborative_edit_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collaborative_prompt_id INT NOT NULL,
    user_id INT NOT NULL,
    edit_type ENUM('create', 'update', 'delete', 'approve', 'reject') NOT NULL,
    content_before TEXT,
    content_after TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collaborative_prompt_id) REFERENCES collaborative_prompts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 添加WebSocket会话表
CREATE TABLE IF NOT EXISTS websocket_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    client_info JSON, -- 存储客户端信息（浏览器、设备等）
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (session_id)
);

-- 创建存储函数：记录用户活动并发送通知
DELIMITER //
CREATE FUNCTION IF NOT EXISTS record_user_activity(
    p_user_id INT, 
    p_activity_type VARCHAR(50),
    p_reference_id INT
) RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE v_activity_id INT;
    
    -- 插入活动记录
    INSERT INTO user_activities (user_id, activity_type, reference_id)
    VALUES (p_user_id, p_activity_type, p_reference_id);
    
    SET v_activity_id = LAST_INSERT_ID();
    
    -- 更新用户在线状态
    UPDATE user_online_status
    SET last_activity = p_activity_type, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN v_activity_id;
END//
DELIMITER ;

-- 创建触发器：用户连接时更新在线状态
DELIMITER //
CREATE TRIGGER IF NOT EXISTS websocket_connect_trigger
AFTER INSERT ON websocket_sessions
FOR EACH ROW
BEGIN
    -- 插入或更新用户在线状态
    INSERT INTO user_online_status (user_id, is_online, last_seen, socket_id)
    VALUES (NEW.user_id, TRUE, NOW(), NEW.session_id)
    ON DUPLICATE KEY UPDATE 
        is_online = TRUE,
        last_seen = NOW(),
        socket_id = NEW.session_id;
END//
DELIMITER ;

-- 创建触发器：用户断开连接时更新在线状态
DELIMITER //
CREATE TRIGGER IF NOT EXISTS websocket_disconnect_trigger
AFTER UPDATE ON websocket_sessions
FOR EACH ROW
BEGIN
    -- 仅在会话状态从活跃变为非活跃时触发
    IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
        -- 检查用户是否还有其他活跃会话
        IF (SELECT COUNT(*) FROM websocket_sessions 
            WHERE user_id = NEW.user_id AND is_active = TRUE) = 0 THEN
            -- 更新用户为离线状态
            UPDATE user_online_status
            SET is_online = FALSE, last_seen = NOW()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
END//
DELIMITER ;

-- 创建统计表：实时通知性能统计
CREATE TABLE IF NOT EXISTS realtime_notification_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    count_sent INT DEFAULT 0,
    count_delivered INT DEFAULT 0,
    count_failed INT DEFAULT 0,
    avg_delivery_time_ms INT DEFAULT 0,
    date DATE DEFAULT (CURRENT_DATE),
    UNIQUE (notification_type, date)
);

-- 插入初始在线状态记录
INSERT IGNORE INTO user_online_status (user_id, is_online, last_seen)
SELECT id, FALSE, NOW() FROM users;