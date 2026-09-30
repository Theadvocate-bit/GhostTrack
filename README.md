# GhostTrack
Useful tool to track location or mobile number, so this tool can be called osint or also information gathering

<img src="https://github.com/HunxByts/GhostTrack/blob/main/asset/bn.png"/>

New update :
```Version 2.2```

### Instalation on Linux (deb)
```
sudo apt-get install git
sudo apt-get install python3
```

### Instalation on Termux
```
pkg install git
pkg install python3
```

### Usage Tool
```
git clone https://github.com/HunxByts/GhostTrack.git
cd GhostTrack
pip3 install -r requirements.txt
python3 GhostTR.py
```

Display on the menu ```IP Tracker```

<img src="https://github.com/HunxByts/GhostTrack/blob/main/asset/ip.png " />

on the IP Track menu, you can combo with the seeker tool to get the target IP
<details>
<summary>:zap: Install Seeker :</summary>
- <strong><a href="https://github.com/thewhiteh4t/seeker">Get Seeker</a></strong>
</details>

Display on the menu ```Phone Tracker```

<img src="https://github.com/HunxByts/GhostTrack/blob/main/asset/phone.png" />

on this menu you can search for information from the target phone number

Display on the menu ```Username Tracker```

<img src="https://github.com/HunxByts/GhostTrack/blob/main/asset/User.png"/>
on this menu you can search for information from the target username on social media

<details>
<summary>:zap: Author :</summary>
- <strong><a href="https://github.com/HunxByts">HunxByts</a></strong>
</details>

---

## EdgeOne Makers 部署版（Web UI + API）

本项目已适配 [腾讯云 EdgeOne Makers](https://pages.edgeone.ai/) 部署：原 Python CLI 保留，新增 `edge-functions/` 边缘函数版（网页 UI + REST API），Git 绑定后 push 自动部署，无需构建、无需环境变量。

### API

| 端点 | 说明 | 示例 |
| --- | --- | --- |
| `GET /` | 网页 UI（深色主题，替代终端菜单） | - |
| `GET /api/health` | 探活 | `/api/health` |
| `GET /api/ip` | IP 追踪（主源 ipwho.is，备源 ipapi.co） | `/api/ip?ip=8.8.8.8`（省略 `ip` = 访客 IP） |
| `GET /api/phone` | 手机号追踪 | `/api/phone?number=+8613800138000&region=CN` |
| `GET /api/username` | 用户名社媒排查（19 平台并发） | `/api/username?name=octocat` |

```bash
curl "https://<your-domain>/api/ip?ip=1.1.1.1"
curl "https://<your-domain>/api/phone?number=%2B8613800138000"
curl "https://<your-domain>/api/username?name=octocat"
```

### 与原版的差异

- **手机号归属地**：原版 Python `phonenumbers` 库为号段级城市数据；边缘函数版为**国家/地区级近似**（libphonenumber-js max 元数据），时区为国家主时区
- **运营商识别**：仅支持中国大陆号段粗判（移动/联通/电信/广电/虚拟），海外号码暂无
- **用户名排查**：移除 4 个死站（Periscope / StumbleUpon / Ello / We Heart It）与重复条目；边缘节点为数据中心 IP，Instagram / Facebook / TikTok 等存在 200 误报与 403 拦截，结果仅供参考

### 部署

1. 在 [pages.edgeone.ai](https://pages.edgeone.ai/) 控制台新建项目 → 绑定本仓库（`main` 分支）
2. 构建命令留空、输出目录留空（`edgeone.json` 已声明 `functions: ./edge-functions`）
3. push 即自动部署；本地验证：`node tools/smoke_test.mjs`
