# 计划 · 桌面挂件

Electron 包装 Web 端 `/widget` 路由，做成无边框、透明、可置顶的桌面小部件，类似滴答清单的桌面便签。

## 启动

前置：先把后端和前端跑起来（项目根目录 `docker compose up -d`，确保 http://localhost:8080 可访问）。

```powershell
cd C:\Users\32545\Desktop\plan\jihua\desktop
npm install              # 首次安装依赖（含 Electron 二进制约 100MB）
npm start                # 之后启动用这个
# 也可以直接双击 start.cmd
```

> 如果你之前在环境变量里设置过 `ELECTRON_RUN_AS_NODE=1`，会让 Electron 退化成纯 Node。仓库里的脚本已自动取消这个变量，无需手动处理。

## 自定义地址

默认指向 `http://localhost:8080/widget` 和 `http://localhost:8080/`，部署到其他机器时改环境变量：

```powershell
$env:JIHUA_WIDGET_URL = "http://192.168.x.x:8080/widget"
$env:JIHUA_MAIN_URL   = "http://192.168.x.x:8080/"
npm start
```

## 操作

- 拖动顶部标题栏：移动窗口
- 图钉按钮：置顶/取消置顶
- 齿轮按钮：在浏览器打开完整主界面
- × 按钮：关闭挂件（托盘点击重新打开）
- 系统托盘：右键菜单可显示挂件、打开主界面、退出
