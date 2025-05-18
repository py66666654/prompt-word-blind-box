# GitHub 设置指南

## 第一次设置

1. 在GitHub上创建一个新仓库：
   - 访问 https://github.com/new
   - 仓库名称：`prompt-word-blind-box`
   - 描述：提示词盲盒应用 - 随机抽取AI提示词的卡片系统
   - 选择公开或私有
   - 点击"创建仓库"

2. 将本地仓库与GitHub关联：
   ```bash
   git remote add origin https://github.com/your-username/prompt-word-blind-box.git
   ```
   (将`your-username`替换为您的GitHub用户名)

3. 将代码推送到GitHub：
   ```bash
   git push -u origin main
   ```

## 后续更新

每次修改代码后，按照以下步骤将更新推送到GitHub：

1. 查看更改：
   ```bash
   git status
   ```

2. 添加更改的文件：
   ```bash
   git add .
   ```

3. 提交更改：
   ```bash
   git commit -m "描述您的更改"
   ```

4. 推送到GitHub：
   ```bash
   git push
   ```

## 更新GitHub用户信息（如果需要）

GitHub提示您更新用户信息时，可以运行：

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 创建新分支进行开发

如果您想在不影响主分支的情况下进行开发，可以创建新分支：

```bash
git checkout -b feature/new-feature-name
```

开发完成后，可以将分支推送到GitHub：

```bash
git push -u origin feature/new-feature-name
```

然后在GitHub上创建Pull Request将更改合并到主分支。

## 使用GitHub Pages发布网站（可选）

如果您想直接从GitHub发布您的网站，可以使用GitHub Pages：

1. 在GitHub仓库页面，点击"Settings"
2. 滚动到"GitHub Pages"部分
3. 在"Source"下拉菜单中选择"main"分支和"/docs"文件夹（如果您将前端文件放在docs文件夹中）
4. 点击"Save"
5. 您的网站将在`https://your-username.github.io/prompt-word-blind-box`可用

## 注意事项

- 确保不要将敏感信息（如数据库密码）提交到GitHub
- 使用`.gitignore`文件排除不需要版本控制的文件
- 定期拉取最新代码：`git pull origin main`