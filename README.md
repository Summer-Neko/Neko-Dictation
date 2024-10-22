## 部署 Neko-Dictation 到阿里云服务器并绑定域名

以下步骤将指导你如何将打包后的 Neko-Dictation 项目部署到阿里云服务器（ECS），并且购买域名，将其绑定到服务器的 IP 地址。

### 1. **准备工作**
- **打包后的项目下载链接**：`https://github.com/Summer-Neko/Neko-Dictation/releases/download/Neko-Dictation/Neko-Dictation.V1.0.zip`
- **阿里云服务器（ECS）**：确保你已经购买并启动了阿里云的 ECS 实例，并有公网 IP 地址。
- **SSH 工具**：用于连接到阿里云服务器的工具，例如终端、PuTTY 或其他 SSH 客户端。

---

### 2. **连接到阿里云服务器**

1. 打开终端（或使用 PuTTY 等工具），通过 **SSH** 连接到你的阿里云服务器。

   ```bash
   ssh username@your-server-ip
   ```

   如果使用 SSH 密钥连接：

   ```bash
   ssh -i /path/to/private-key username@your-server-ip
   ```

   > 替换 `username` 为你的服务器用户名（一般是 `root`），`your-server-ip` 为你的阿里云服务器的公网 IP。

---

### 3. **上传打包的 Neko-Dictation 项目**

使用 `scp` 将打包好的 `Neko-Dictation.V1.0.zip` 文件上传到服务器。打开终端，在本地执行以下命令：

```bash
scp /path/to/Neko-Dictation.V1.0.zip username@your-server-ip:/home/username/
```

> 替换 `/path/to/Neko-Dictation.V1.0.zip` 为你的文件路径，`username` 为你的服务器用户名，`your-server-ip` 为阿里云服务器的公网 IP。

---

### 4. **解压项目文件**

1. 登录到服务器后，进入上传的文件目录：

   ```bash
   cd /home/username/
   ```

2. 解压 `Neko-Dictation.V1.0.zip`：

   ```bash
   unzip Neko-Dictation.V1.0.zip
   ```

   解压后会生成 `Neko-Dictation` 文件夹，进入该文件夹：

   ```bash
   cd Neko-Dictation
   ```

3. 赋予可执行权限：

   ```bash
   chmod +x Neko-Dictation
   ```

---

### 5. **运行打包的 Neko-Dictation**

通过 SSH 直接运行可执行文件：

```bash
./Neko-Dictation
```

如果希望在后台运行应用，可以使用 `nohup` 或 `screen`：

- **使用 `nohup`**：

   ```bash
   nohup ./Neko-Dictation > output.log 2>&1 &
   ```

- **使用 `screen`**：

   ```bash
   screen -S neko-dictation
   ./Neko-Dictation
   ```

---

### 6. **配置阿里云安全组**

为了让外部访问你的应用，你需要开放服务器的端口。

1. 登录到阿里云控制台，找到你的 **ECS 实例**。
2. 在左侧导航栏中选择 **网络与安全** -> **安全组**。
3. 选择你的 ECS 实例所在的安全组，点击 **配置规则**。
4. 添加一条新的 **入方向规则**，放行你的应用端口（如 80 或 8080），并设置来源为 `0.0.0.0/0` 以允许所有 IP 访问。

---

### 7. **通过 IP 地址访问应用**

在完成上述步骤后，访问浏览器并输入你的 **服务器 IP** 地址及端口：

```
http://your-server-ip:8080
```

---

### 8. **购买阿里云域名并绑定到 ECS 实例**

#### 购买域名

1. 登录到阿里云控制台，选择 **域名与网站** -> **域名注册**。
2. 在搜索框中输入你想购买的域名，查看可用性，并点击 **立即购买**。
3. 选择注册年限并完成支付流程。

#### 绑定域名到服务器

1. 在阿里云控制台找到 **域名与网站** -> **域名解析**。
2. 选择你的域名，点击 **解析设置**。
3. 添加 **A 记录**，将 **域名** 指向你的 **服务器公网 IP**。
   - 记录类型：`A`
   - 主机记录：`@`（表示根域名）
   - 记录值：填写你的 **ECS 实例的公网 IP**

4. 保存解析设置后，等待 DNS 生效（一般需要几分钟到 24 小时）。

#### 通过域名访问应用

一旦 DNS 生效，你可以通过你的域名访问应用：

```
http://your-domain.com:8080
```

或者配置域名解析后将其指向端口 80，以便通过标准 HTTP 访问。

---

### 9. **README.md 示例**

```markdown
# Neko-Dictation 部署指南

## 项目简介

Neko-Dictation 是一个轻量级听写应用，通过 Flask 提供简单的 web 界面。

### 项目来源

- GitHub 项目地址: [Neko-Dictation](https://github.com/Summer-Neko/Neko-Dictation)
- 当前版本: V1.0

## 部署步骤

### 1. 下载打包的可执行文件

通过以下链接下载打包好的 Neko-Dictation V1.0：
[下载链接](https://github.com/Summer-Neko/Neko-Dictation/releases/download/Neko-Dictation/Neko-Dictation.V1.0.zip)

### 2. 上传到服务器

使用以下命令将 `Neko-Dictation.V1.0.zip` 上传到服务器：

```bash
scp /path/to/Neko-Dictation.V1.0.zip username@your-server-ip:/home/username/
```

### 3. 解压并运行

解压上传的文件并运行：

```bash
unzip Neko-Dictation.V1.0.zip
cd Neko-Dictation
chmod +x Neko-Dictation
./Neko-Dictation
```

### 4. 配置阿里云安全组

在阿里云控制台，进入 **安全组规则**，开放端口 8080 以允许外部访问。

### 5. 通过域名访问

购买阿里云域名并将其解析到你的 ECS 实例公网 IP，完成解析后，可以通过域名访问应用：

```
http://your-domain.com:8080
```

## 注意事项

- 请确保域名解析正确并等待 DNS 生效。
- 请定期更新和维护您的服务器安全组规则和应用配置。
```

### 总结
- 上传打包好的程序到阿里云服务器。
- 解压并运行打包好的可执行文件。
- 配置阿里云安全组以开放端口。
- 购买域名并将其绑定到服务器公网 IP，最终通过域名访问。
