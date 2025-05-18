# 使用个人访问令牌（PAT）推送代码到GitHub

个人访问令牌是一种安全的方式来访问您的GitHub仓库。以下是创建和使用PAT的步骤：

## 步骤1: 创建个人访问令牌

1. 登录GitHub账户
2. 点击右上角的头像，选择"Settings"
3. 在左侧边栏滚动到底部，点击"Developer settings"
4. 点击"Personal access tokens"，然后选择"Tokens (classic)"
5. 点击"Generate new token"，然后选择"Generate new token (classic)"
6. 为令牌提供一个描述性名称（如"Prompt Word Blind Box Project"）
7. 设置令牌的过期时间（根据需要选择）
8. 勾选以下权限：
   - `repo`（完整仓库访问权限）
   - `workflow`（如果需要GitHub Actions）
9. 点击"Generate token"
10. **重要：** 复制生成的令牌！它只会显示一次。

## 步骤2: 使用令牌推送代码

方法1：在命令行中使用令牌（一次性）：

```bash
git push https://USERNAME:TOKEN@github.com/fantasy/prompt-word-blind-box.git main
```
将USERNAME替换为您的GitHub用户名，TOKEN替换为您刚才创建的个人访问令牌。

方法2：配置Git存储凭据（避免重复输入）：

```bash
git config credential.helper store
git push https://github.com/fantasy/prompt-word-blind-box.git main
```

当提示输入用户名和密码时，输入您的GitHub用户名和个人访问令牌（而不是密码）。这些凭据会被存储，以后就不需要再次输入。

方法3: 使用macOS钥匙串存储（更安全）：

```bash
git config --global credential.helper osxkeychain
git push https://github.com/fantasy/prompt-word-blind-box.git main
```

提示凭据时输入用户名和个人访问令牌，它们将安全地存储在macOS钥匙串中。

## 安全注意事项

- 令牌与密码具有相同的功能，请安全保管
- 设置合适的过期时间
- 授予最小必要的权限
- 如果令牌泄露，立即在GitHub设置中撤销它
- 不要在公共场合或脚本中明文保存令牌