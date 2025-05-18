# 使用GitHub CLI认证并推送代码

GitHub CLI是一个命令行工具，可以简化与GitHub的交互。以下是安装和使用的步骤：

## 步骤1: 安装GitHub CLI

### macOS:
```bash
brew install gh
```

### Windows:
```bash
winget install --id GitHub.cli
```

### Linux:
```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

## 步骤2: 登录GitHub

```bash
gh auth login
```

按照提示选择GitHub.com，选择HTTPS认证方式，并允许使用Web浏览器登录。

## 步骤3: 创建GitHub仓库（如果尚未创建）

```bash
gh repo create prompt-word-blind-box --public --description "提示词盲盒应用 - 随机抽取AI提示词的卡片系统"
```

## 步骤4: 推送代码到GitHub

```bash
git push -u origin main
```

现在应该可以直接推送，因为GitHub CLI已经处理了认证。

## 其他有用的GitHub CLI命令

- 列出您的仓库:
```bash
gh repo list
```

- 查看仓库:
```bash
gh repo view prompt-word-blind-box
```

- 创建issue:
```bash
gh issue create --title "标题" --body "描述"
```

- 创建PR:
```bash
gh pr create --title "标题" --body "描述"
```

GitHub CLI使得在命令行中使用GitHub变得更加便捷，特别是对于需要频繁与GitHub交互的开发者。