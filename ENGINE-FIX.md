# 团结引擎打不开 —— 本机诊断与修复卡

> 初版：2026-11-18 17:13　·　**最终更新：17:52（许可证已激活，引擎已实机编译通过）**
> 以下结论来自本机实际的进程、安装包与日志，不是通用猜测。
> **当前状态与运行步骤请直接看第六节与 [`START-HERE.md`](START-HERE.md)。**

---

## 〇、排查过程记录（问题已解决 ✅）

> ✅ **17:41 许可证已激活**（`Tuanjie_lic.ulf` 已生成、`Found 1 entitlements`）；
> 17:52 已用团结引擎实机编译全部脚本并成功烘焙场景。
> 下面保留当时的诊断记录供复盘，不代表当前状态。

你 17:33 下载的 `Tuanjie Cowork-2.2.0-x86_64-pc-windows-msvc-setup.exe`（235 MB）**已装好并在运行**：
`%LOCALAPPDATA%\Programs\Tuanjie Cowork\cowork.exe`（17:34 启动），
它也拉起了 `Tuanjie.Licensing.Client`。

**方向完全正确**。团结引擎官网下载页现在写的就是「使用团结引擎创作，仅需三步：
1 下载团结 Cowork —— 可管理团结引擎的多个安装、创建新项目和访问您的工作」。
也就是说，**团结 Cowork 就是新版 Hub**，承担版本管理、项目创建和许可证签发。
（它同时也是 Unity 中国的 AI 编程助手；这里我们只用它的项目/许可证管理功能。）

但复查显示**许可证依然是 0**：

| 检查项（17:35） | 实际结果 |
|---|---|
| `C:\ProgramData\Tuanjie\Tuanjie_lic.ulf` | **仍不存在** |
| Licensing Client 日志（17:34 段） | `Processed 0 license files` ×2、`Token not found in cache` ×1；`Processed 1 license files`、`Successfully activated` 均为 **0 次** |
| `%APPDATA%\TuanjieHub\cloudConfig.json.json` | 只有配置字段，**没有实际 userId / token 值** → Cowork 里**还没登录** |
| `%APPDATA%\TuanjieHub\` | 已生成 `releases.json`、`favoriteProjects.json` 等（17:34），说明客户端初始化完成 |
| 编辑器日志 | 最新仍是 17:20 的 `No valid Unity Editor license found` + `return code 1` |

> **结论：不是「下载了 Cowork 就可以了」。**
> 装 Cowork 只是把「能签发许可证的工具」装上了，**还必须在它里面登录 Unity 中国账号、
> 领取个人版免费许可**，引擎才会从 `License error` 变成正常启动。

---

## 一、原始诊断（为什么一开始打不开）

| 检查项 | 实际结果 |
|---|---|
| 引擎安装 | 已安装：`C:\Program Files\Tuanjie 2022.3.62t18\Editor\Tuanjie.exe` |
| 主窗口标题 | **`License error`** ← 你看到的「打不开」其实是这个弹窗 |
| Editor.log 末行 | `No valid Unity Editor license found. Please activate your license.` |
| 同一份日志 | `No ULF license found.,Token not found in cache`、`Access token is unavailable; failed to update` |
| 授权查询 | `Found 0 entitlement groups and 0 free entitlements`，返回 404 |
| 最初下载 | `TuanjieSetup64.exe`（3.5 GB，**Tuanjie 1.11.1 Installer**）—— 是编辑器离线包，不含管理器 |
| 桌面快捷方式 | `C:\Users\Public\Desktop\Tuanjie 1.11.1.lnk`，直接指向编辑器 |
| 硬件/系统 | 正常：RTX 4060 Laptop + AMD Radeon 780M、Windows 11 (10.0.26200)、.NET Framework 4.8、16 GB |

日志里的 `Code 10 while verifying Licensing Client signature` 是**次要告警**，通常与安全软件拦截
或 `Program Files` 写权限有关；先走完登录激活，仍失败再看第四节。

**一句话**：引擎本体、显卡、系统都没问题；最初是「只有编辑器、没有管理器也没登录」，
现在是「管理器装好了、但还没登录领证」。

---

## 二、接下来只要 3 步（重点）

### 1. 在 Cowork 里登录 Unity 中国账号
打开桌面/开始菜单的 **Tuanjie Cowork**，找右上角「登录 / Sign in」，
用 **Unity 中国账号**（unity.cn 的 Unity ID）登录；没有就先免费注册。
支持扫码、手机号或账号密码。

### 2. 领取个人版免费许可证 ← 现在缺的就是这一步
- 首次登录通常会弹授权对话框，点 **同意并获取个人版许可证** /
  `Agree and get personal edition license`（个人版免费、无名额限制）。
- 如果没弹：点头像 → **许可证 / 管理许可证 / Manage licenses** → **添加 / Add** →
  选择**获取免费个人版许可证**。界面文案随版本会变，认准「个人版 / Personal / 免费」字样。
- 需要联网，保持网络通畅；公司网络若拦截，换手机热点试一次。

### 3. 从 Cowork 启动，不要双击桌面 `Tuanjie 1.11.1.lnk`
Cowork → **项目 / Projects** → **新建项目** → 选 **3D** 模板。
若「安装 / Installs」里没自动认出已装的编辑器，用 **Locate / 添加已有安装** 指向
`C:\Program Files\Tuanjie 2022.3.62t18\Editor\Tuanjie.exe` —— **不用重下 3.5 GB**。
Cowork 会把登录态和许可证传给编辑器，这是与直接双击 exe 的本质区别。

**怎么确认真的成功了**（任一即可）：

- `C:\ProgramData\Tuanjie\Tuanjie_lic.ulf` 文件出现；
- `%LOCALAPPDATA%\Tuanjie\Tuanjie.Licensing.Client.log` 里出现 `Processed 1 license files`；
- `%LOCALAPPDATA%\Tuanjie\Editor\Editor.log` 不再出现 `No valid Unity Editor license found`，
  并且窗口正常进入编辑器主界面。

> 旧窗口若还卡着：先结束 `Tuanjie.exe`、`Tuanjie.Licensing.Client.exe`、
> `TuanjieCrashHandler64.exe` 三个进程，再从 Cowork 启动。也可以让我用命令精确结束。

---

## 三、路线 B：命令行手动激活（不依赖 Cowork 登录）

若在 Cowork 里找不到许可证入口，或自动激活一直失败。注意本机 exe 叫 **`Tuanjie.exe`**：

```bat
"C:\Program Files\Tuanjie 2022.3.62t18\Editor\Tuanjie.exe" -batchmode -createManualActivationFile -logfile
```

生成 `*.alf` → 打开 <https://license.tuanjie.cn/manual> 上传 → 选**个人版** → 下载 `*.ulf` → 再执行：

```bat
"C:\Program Files\Tuanjie 2022.3.62t18\Editor\Tuanjie.exe" -batchmode -manualLicenseFile "C:\你的路径\Tuanjie_v2022.x.ulf" -logfile
```

官方文档入口：<https://docs.unity.cn/cn/tuanjiemanual/Manual/LicensesAndActivation.html>。
手动激活页与参数若改版，以该文档为准。

---

## 四、还不行：清缓存 / 排干扰 / 提工单

1. Cowork → 许可证管理 → **Return License（归还许可）**，然后完全退出 Cowork 与编辑器。
2. 删除 `C:\ProgramData\Tuanjie\Tuanjie_lic.ulf`（若存在）。
3. 删除客户端缓存：`%APPDATA%\TuanjieHub`、`%LOCALAPPDATA%\Tuanjie\config`、
   `%LOCALAPPDATA%\Tuanjie\licenses`。
4. **临时关闭** 360 / 火绒 / Defender 实时防护再试 —— 它们可能拦截授权文件读取，
   也可能造成签名校验 `Code 10`。同时用**管理员身份运行** Cowork。
5. 重装最新版 Cowork，重新登录并激活。
6. 仍失败：提交官方工单 <https://unity.cn/contact-us>，附上 Cowork 版本、报错截图、
   `%LOCALAPPDATA%\Tuanjie\Editor\Editor.log` 与 `Tuanjie.Licensing.Client.log`。

> 上面删除的都是**引擎自己的缓存与许可证文件**，不涉及任何个人文档。
> 操作前确认 Cowork 和编辑器已完全退出；不确定就先只做第二节的 3 步。

---

## 五、面试时间紧：引擎一时修不好也不影响推进

直接用 **`web/showcase.html`**：

- 单个 HTML 文件、离线双击即开、**不需要 Unity / 团结引擎、不需要联网**
- 左边是可玩的 3D 游戏，右上角「作品讲解」展开后是架构图、四个技术亮点、
  **工程里的真实 C# / Shader 源码片段**、追问要点与诚实边界
- 可直接作为邮件附件或网盘链接发给面试官，对方双击就能看

`web/standalone.html` 是纯游戏版；`README.md`、`INTERVIEW.md` 是完整架构说明与讲稿。
`unity/` 现在已是完整工程（含 `Packages/` 与 `ProjectSettings/`），可直接用 Cowork 打开，
运行步骤见 `START-HERE.md`。

**验证边界如实说**：Unity 侧已用团结引擎 `2022.3.62t18` 实机编译（0 error）并烘焙场景成功，
浏览器版做过真实渲染验证；**Play 模式试玩请自己点一次再讲**。
不要编造 Profiler 数据或实机截图。

---

## 六、许可证已激活之后的进展（17:52 更新）

引擎现在能正常启动了，我已经用它**实机编译并烘焙过工程**：

| 项目 | 结果 |
|---|---|
| `Tuanjie_lic.ulf` | ✅ 17:41 生成，`Processed 1 license files`、`Found 1 entitlements` |
| 批处理编译全部 C# / Shader | ✅ 0 error，生成 `Assembly-CSharp.dll`、`Assembly-CSharp-Editor.dll` |
| `SceneBuilder.Bake` | ✅ 成功，`Assets/Scenes/NeonDrift.unity` 16 段环境 + 6 个 `.mat` |
| `unity/` 工程结构 | ✅ 已补齐 `Packages/manifest.json`（官方 3D 模板的 33 个内置模块）与 `ProjectSettings/` |
| **Play 模式实机试玩** | ⏳ **仍需你亲手点一次** |

**现在怎么跑**：见 [`START-HERE.md`](START-HERE.md) —— 用 Cowork 打开 `unity` 文件夹，
双击 `Assets/Scenes/NeonDrift.unity`，点 ▶ Play，看 Console 无红色报错。

> 附带发现：从某些终端用命令行启动编辑器会撞到
> `Item has already been added. Key: 'HTTP_PROXY' / 'http_proxy'` —— 那是终端同时注入了
> 大小写两份代理变量，导致 Bee 构建系统崩溃，**与工程代码无关**，从 Cowork 图形界面启动不受影响。
