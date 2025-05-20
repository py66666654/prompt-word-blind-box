# 提示词盲盒安装与部署指南

本文档提供提示词盲盒应用的详细安装和部署步骤，适用于开发环境和生产环境。

## 目录

1. [前提条件](#前提条件)
2. [开发环境搭建](#开发环境搭建)
   - [获取源代码](#获取源代码)
   - [安装依赖](#安装依赖)
   - [配置环境变量](#配置环境变量)
   - [初始化数据库](#初始化数据库)
   - [启动开发服务器](#启动开发服务器)
3. [生产环境部署](#生产环境部署)
   - [服务器准备](#服务器准备)
   - [安装与配置](#安装与配置)
   - [使用PM2管理进程](#使用pm2管理进程)
   - [配置Nginx反向代理](#配置nginx反向代理)
   - [SSL证书配置](#ssl证书配置)
4. [Docker部署](#docker部署)
   - [构建Docker镜像](#构建docker镜像)
   - [使用Docker Compose](#使用docker-compose)
5. [数据库维护](#数据库维护)
   - [备份与恢复](#备份与恢复)
   - [数据迁移](#数据迁移)
6. [更新与升级](#更新与升级)
7. [常见问题解决](#常见问题解决)
8. [性能优化建议](#性能优化建议)

## 前提条件

在开始安装提示词盲盒应用之前，请确保您的系统满足以下要求：

### 系统要求

- **操作系统**: Linux, macOS 或 Windows
- **Node.js**: v14.0.0 或更高版本
- **npm**: v6.0.0 或更高版本
- **MySQL**: v8.0 或更高版本
- **Git**: 任意最新版本

### 资源推荐配置

- **开发环境**：
  - 2GB RAM
  - 双核CPU
  - 10GB可用磁盘空间

- **生产环境**：
  - 4GB+ RAM
  - 四核CPU
  - 20GB+可用磁盘空间
  - 带宽 ≥ 5 Mbps

### 推荐工具

- **数据库管理**: MySQL Workbench, phpMyAdmin
- **代码编辑器**: Visual Studio Code, WebStorm
- **API测试**: Postman, Insomnia
- **过程监控**: PM2

## 开发环境搭建

### 获取源代码

1. 克隆Git仓库:

```bash
git clone https://github.com/your-username/prompt-word-blind-box.git
cd prompt-word-blind-box
```

### 安装依赖

执行以下命令安装所需的npm包：

```bash
npm install
```

这将安装所有在`package.json`中定义的依赖项。

### 配置环境变量

1. 在项目根目录复制`.env.example`文件并重命名为`.env`:

```bash
cp .env.example .env
```

2. 使用文本编辑器打开`.env`文件，根据您的环境配置以下参数：

```
# 数据库配置
DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=prompt_blind_box_db
DB_PORT=3306

# 服务器配置
PORT=3000

# JWT密钥（用于用户认证）
JWT_SECRET=your_jwt_secret_key

# 邮件配置（用于密码重置和邮箱验证）
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password

# 前端URL（用于邮件中的链接）
FRONTEND_URL=http://localhost:3000
```

> **安全提示**: JWT_SECRET应该是一个强随机字符串。可以通过以下命令生成：
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 初始化数据库

1. 创建MySQL数据库:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE prompt_blind_box_db;
exit;
```

2. 导入数据库架构:

```bash
mysql -u your_database_user -p prompt_blind_box_db < database_schema_updated.sql
```

### 启动开发服务器

1. 使用nodemon启动开发服务器（支持热重载）:

```bash
npm run dev
```

2. 如果一切配置正确，您将看到以下输出:

```
HTTP服务器运行在 http://localhost:3000
WebSocket服务器运行在 ws://localhost:3000
数据库连接成功
```

3. 访问http://localhost:3000查看应用。

## 生产环境部署

### 服务器准备

1. 更新系统包:

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

2. 安装Node.js和npm:

```bash
# 使用NVM安装Node.js（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # 或 ~/.zshrc
nvm install 14    # 安装Node.js v14
nvm use 14        # 使用Node.js v14
```

3. 安装MySQL:

```bash
# Ubuntu/Debian
sudo apt install mysql-server -y

# CentOS/RHEL
sudo yum install mysql-server -y
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

4. 安装Git:

```bash
# Ubuntu/Debian
sudo apt install git -y

# CentOS/RHEL
sudo yum install git -y
```

### 安装与配置

1. 克隆代码仓库:

```bash
git clone https://github.com/your-username/prompt-word-blind-box.git /opt/prompt-word-blind-box
cd /opt/prompt-word-blind-box
```

2. 安装依赖:

```bash
npm install --production
```

3. 创建并配置环境变量:

```bash
cp .env.example .env
nano .env  # 或使用任何文本编辑器
```

在生产环境中，确保更新以下设置:

```
# 生产环境数据库设置
DB_HOST=localhost
DB_USER=production_user
DB_PASSWORD=strong_production_password
DB_NAME=prompt_blind_box_db

# 使用生产环境端口
PORT=3000

# 强随机JWT密钥
JWT_SECRET=your_very_strong_random_jwt_secret

# 邮件服务配置
EMAIL_SERVICE=your_email_provider
EMAIL_USER=your_production_email@example.com
EMAIL_PASSWORD=your_production_email_password

# 生产环境前端URL（带HTTPS）
FRONTEND_URL=https://your-domain.com
```

4. 初始化数据库:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE prompt_blind_box_db;
CREATE USER 'production_user'@'localhost' IDENTIFIED BY 'strong_production_password';
GRANT ALL PRIVILEGES ON prompt_blind_box_db.* TO 'production_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
mysql -u production_user -p prompt_blind_box_db < database_schema_updated.sql
```

### 使用PM2管理进程

1. 全局安装PM2:

```bash
npm install -g pm2
```

2. 创建PM2配置文件 `ecosystem.config.js`:

```bash
nano ecosystem.config.js
```

添加以下内容:

```javascript
module.exports = {
  apps: [{
    name: "prompt-blind-box",
    script: "server.js",
    env: {
      NODE_ENV: "production",
    },
    instances: "max",
    exec_mode: "cluster",
    watch: false,
    max_memory_restart: "1G"
  }]
}
```

3. 使用PM2启动应用:

```bash
pm2 start ecosystem.config.js
```

4. 配置PM2开机自启:

```bash
pm2 startup
pm2 save
```

5. 检查应用状态:

```bash
pm2 status
```

### 配置Nginx反向代理

1. 安装Nginx:

```bash
# Ubuntu/Debian
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

2. 创建Nginx配置文件:

```bash
sudo nano /etc/nginx/sites-available/prompt-blind-box
```

添加以下内容:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket支持
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. 启用站点配置:

```bash
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/prompt-blind-box /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# CentOS/RHEL
sudo ln -s /etc/nginx/sites-available/prompt-blind-box /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL证书配置

1. 安装Certbot:

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx -y

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx -y
```

2. 获取并配置SSL证书:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

3. 配置自动续期:

```bash
sudo systemctl status certbot.timer  # 确认自动续期计划任务已启用
```

## Docker部署

### 构建Docker镜像

1. 创建Dockerfile:

```bash
nano Dockerfile
```

添加以下内容:

```dockerfile
FROM node:14-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

2. 创建.dockerignore文件:

```bash
nano .dockerignore
```

添加以下内容:

```
node_modules
npm-debug.log
.env
.git
.gitignore
```

3. 构建Docker镜像:

```bash
docker build -t prompt-blind-box:latest .
```

### 使用Docker Compose

1. 创建docker-compose.yml文件:

```bash
nano docker-compose.yml
```

添加以下内容:

```yaml
version: '3'

services:
  app:
    image: prompt-blind-box:latest
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - db
    environment:
      - DB_HOST=db
      - DB_USER=prompt_user
      - DB_PASSWORD=prompt_password
      - DB_NAME=prompt_blind_box_db
      - DB_PORT=3306
      - JWT_SECRET=your_jwt_secret
      - EMAIL_SERVICE=your_email_service
      - EMAIL_USER=your_email@example.com
      - EMAIL_PASSWORD=your_email_password
      - FRONTEND_URL=https://your-domain.com
    networks:
      - prompt-network

  db:
    image: mysql:8.0
    restart: always
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=prompt_blind_box_db
      - MYSQL_USER=prompt_user
      - MYSQL_PASSWORD=prompt_password
    volumes:
      - mysql-data:/var/lib/mysql
      - ./database_schema_updated.sql:/docker-entrypoint-initdb.d/schema.sql
    networks:
      - prompt-network

networks:
  prompt-network:
    driver: bridge

volumes:
  mysql-data:
```

2. 启动容器:

```bash
docker-compose up -d
```

3. 检查容器状态:

```bash
docker-compose ps
```

## 数据库维护

### 备份与恢复

1. 创建数据库备份:

```bash
# 创建备份
mysqldump -u production_user -p prompt_blind_box_db > backup_$(date +%Y%m%d).sql

# 使用压缩
mysqldump -u production_user -p prompt_blind_box_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

2. 恢复数据库:

```bash
# 从备份文件恢复
mysql -u production_user -p prompt_blind_box_db < backup_file.sql

# 从压缩文件恢复
gunzip < backup_file.sql.gz | mysql -u production_user -p prompt_blind_box_db
```

3. 设置定时备份:

```bash
crontab -e
```

添加以下内容(每天凌晨3点备份):

```
0 3 * * * mysqldump -u production_user -p'your_password' prompt_blind_box_db | gzip > /path/to/backups/backup_$(date +\%Y\%m\%d).sql.gz
```

### 数据迁移

如果需要迁移到新服务器或更新数据库架构:

1. 备份现有数据库
2. 在新环境中创建数据库
3. 导入备份数据
4. 应用最新的数据库架构脚本

```bash
# 在新环境中
mysql -u new_user -p new_database < backup_file.sql
mysql -u new_user -p new_database < database_updates.sql
```

## 更新与升级

### 代码更新

1. 从Git仓库拉取最新代码:

```bash
cd /opt/prompt-word-blind-box
git pull origin main
```

2. 安装新依赖:

```bash
npm install
```

3. 重启应用:

```bash
# 使用PM2
pm2 restart prompt-blind-box

# 或使用Docker
docker-compose down
docker-compose up -d
```

### Node.js升级

如果需要升级Node.js版本:

```bash
# 使用NVM升级
nvm install 16  # 安装新版本
nvm alias default 16  # 设置为默认版本
```

之后重新安装依赖并重启应用:

```bash
cd /opt/prompt-word-blind-box
rm -rf node_modules
npm install
pm2 restart prompt-blind-box
```

## 常见问题解决

### 连接数据库失败

1. 检查MySQL服务是否运行:

```bash
sudo systemctl status mysql
```

2. 验证数据库凭据:

```bash
mysql -u production_user -p
```

3. 检查防火墙设置:

```bash
# Ubuntu/Debian
sudo ufw status

# CentOS/RHEL
sudo firewall-cmd --list-all
```

### 应用启动失败

1. 检查日志文件:

```bash
# PM2日志
pm2 logs prompt-blind-box

# Docker日志
docker-compose logs app
```

2. 检查环境变量:

```bash
# 确认.env文件存在并正确配置
cat .env
```

3. 验证文件权限:

```bash
ls -la /opt/prompt-word-blind-box
```

### WebSocket连接问题

1. 检查Nginx配置是否正确支持WebSocket:

```bash
sudo nginx -t
```

2. 验证防火墙是否允许WebSocket连接:

```bash
# Ubuntu/Debian
sudo ufw allow 3000

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 性能优化建议

### 数据库优化

1. 添加数据库索引提高查询性能:

```sql
-- 为常用查询添加索引
ALTER TABLE prompt_cards ADD INDEX idx_category_type (category_id, type_id);
ALTER TABLE prompt_cards ADD INDEX idx_quality_score (quality_score);
ALTER TABLE user_collections ADD INDEX idx_user_prompt (user_id, prompt_card_id);
```

2. 优化MySQL配置:

```bash
sudo nano /etc/mysql/my.cnf
```

添加以下参数:

```
[mysqld]
innodb_buffer_pool_size = 1G
query_cache_size = 64M
max_connections = 200
```

### 应用性能优化

1. 启用Node.js集群模式(PM2已配置)

2. 配置Nginx缓存:

```nginx
# Nginx配置中添加
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, no-transform";
}
```

3. 启用Gzip压缩:

```nginx
# Nginx配置中添加
gzip on;
gzip_comp_level 5;
gzip_min_length 256;
gzip_proxied any;
gzip_vary on;
gzip_types
  application/javascript
  application/json
  application/x-javascript
  text/css
  text/javascript
  text/plain
  text/xml;
```

4. 考虑使用CDN分发静态资源

5. 添加Redis缓存:

```bash
# 安装Redis
sudo apt install redis-server -y

# 添加Redis依赖到项目
npm install redis
```

然后在应用代码中实现缓存逻辑。

---

如有任何安装或部署问题，请联系技术支持团队或提交GitHub Issue。