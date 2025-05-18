# 使用SSH密钥连接GitHub

已知您提供的SHA256密钥指纹：`SHA256:BDrz/Oy6++Ih9X4ziCeFLU9pbVfdZBm8TZwHa4aN8Mc`，请按照以下步骤设置SSH连接：

## 步骤1: 检查本地SSH密钥

```bash
ls -la ~/.ssh
```

## 步骤2: 如果需要，创建新的SSH密钥

如果没有SSH密钥或想创建新的：

```bash
ssh-keygen -t ed25519 -C "452367132@qq.com"
```

按照提示完成密钥创建。

## 步骤3: 将SSH密钥添加到ssh-agent

启动ssh-agent:
```bash
eval "$(ssh-agent -s)"
```

添加密钥:
```bash
ssh-add ~/.ssh/id_ed25519
```

## 步骤4: 复制SSH公钥

```bash
cat ~/.ssh/id_ed25519.pub
```

复制输出的公钥内容。

## 步骤5: 添加SSH密钥到GitHub账户

1. 登录GitHub
2. 点击右上角头像，选择"Settings"
3. 在左侧边栏点击"SSH and GPG keys"
4. 点击"New SSH key"
5. 标题填写一个便于识别的名称（如"MacBook Pro"）
6. 粘贴刚才复制的公钥内容
7. 点击"Add SSH key"

## 步骤6: 测试SSH连接

```bash
ssh -T git@github.com
```

如果显示"Hi [用户名]! You've successfully authenticated..."，则连接成功。

## 步骤7: 修改远程仓库URL为SSH方式

```bash
git remote set-url origin git@github.com:fantasy/prompt-word-blind-box.git
```

确保将"fantasy"替换为您的GitHub用户名。

## 步骤8: 推送代码

```bash
git push -u origin main
```

现在您应该可以成功推送代码而无需输入密码。