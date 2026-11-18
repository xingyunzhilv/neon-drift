# 在团结引擎里运行 NEON DRIFT（照着点就行）

> 适用：团结引擎 `Tuanjie 2022.3.62t18` + 团结 Cowork，许可证已激活。
> 工程目录：本仓库的 `unity/` 文件夹 —— 用 Cowork 打开这一层（含 `Assets` + `ProjectSettings`）。

---

## 一句话版

**Cowork → 打开已有项目 → 选 `neon-drift\unity` 文件夹 → 双击 `Assets/Scenes/NeonDrift.unity` → 点 ▶ Play → 按 Enter 开始。**

---

## 详细步骤

### 1. 打开工程

1. 启动**团结 Cowork**（保持登录、保持联网，个人版许可证已激活）。
2. 在「项目」页选 **打开 / 添加已有项目**（不同版本可能叫 *Add* / *Open* / *添加项目*）。
3. 选择文件夹：`neon-drift\unity` —— 注意选的是 **unity 这一层**，不是 `neon-drift`，也不是 `unity/Assets`。
   - 这一层里有 `Assets/`、`Packages/`、`ProjectSettings/`，Cowork 才认得出是一个工程。
   - `ProjectSettings/ProjectVersion.txt` 已写死 `2022.3.62t18`，会直接用你已装的版本打开，不会触发重下。
4. **首次打开要等 1–3 分钟**：引擎要导入资源、重建 Library、编译脚本。看进度条走完，别中途关。

### 2. 打开场景

在 **Project** 窗口依次展开 `Assets` → `Scenes`，双击 **`NeonDrift.unity`**。

这是已经烘焙好的场景：16 段霓虹赛道、护栏、灯光、相机都摆在 Scene 视图里可以直接看。
`Hierarchy` 里会看到 `NeonDrift_GameManager` 等对象。

> 即使打开的是别的场景或空场景也能跑 —— `GameBootstrap.cs` 会在 Play 时自动创建 `GameManager`，
> 再由 `WorldBuilder` 程序化搭建整个世界。只是那样 Scene 视图里看不到静态赛道。

#### 如果打开后是 `Untitled` 空场景、找不到 Project 窗口

**这是最常见的困惑，不是工程出错。** Cowork 打开工程后默认停在 `Untitled` 空场景，
左侧还被 `Tuanjie AI / Cowork` 面板占掉一大块，Project 窗口被压成右下角的一个**标签页**
（和 `Hierarchy`、`Console`、`Inspector` 叠在一起）。此时脚本其实已经编译好、资源也已导入。

- **最快验证（10 秒）**：什么都不用找，**直接点顶部 ▶ Play**。`GameBootstrap.cs` 会在运行时
  自动搭建整个世界，空场景照样能跑起来，按 `Enter` 开始。
- **想在 Scene 视图看到赛道（面试展示推荐）**：点右下角标签栏的 **Project** →
  展开 `Assets` → `Scenes` → 双击 **`NeonDrift.unity`**，再点 Play。
- 左侧 `Tuanjie AI` 面板与本作品无关，点它右上角 × 关掉可腾出空间；
  底部黄色 `Codelly Bridge ... buffered` 是 Cowork 插件的埋点告警，忽略即可。
- 判断工程是否加载对了：编辑器标题是 `unity - Untitled - ... - Tuanjie 1.11.1` 也属正常，
  这里显示的是「项目名 - 场景名」，项目名就是文件夹名 `unity`；只要 Project 窗口里
  能看到 `Assets/Scripts`、`Assets/Scenes/NeonDrift.unity`，就说明工程是对的。

### 3. 点 Play

顶部工具栏**水平中间偏左**有一组三个小图标 `▶` `❚❚` `⏭`，点第一个三角形。
它**只有图标、没有「Play」文字**，尺寸又小，很容易看漏 —— 双击 `.unity` 场景只是打开场景，
不会自动开始运行，所以还得手动点一下这个三角形。

> **更省事：直接按 `Ctrl+P`**（Windows）。按之前先用鼠标点一下 `Scene` 或 `Game` 视图，
> 让焦点从左侧 Cowork AI 输入框回到编辑器主窗口，否则快捷键可能被 AI 面板吃掉。

- 画面中央出现 `NEON DRIFT` 标题和「按 Enter / 空格 / 点击开始」。
- 按 **Enter**、**空格**或**鼠标点击**开始飞行。
- 若画面还停在网格赛道而不是游戏，点 `Scene` 标签旁边的 **`Game`** 标签切过去；
  Play 时编辑器一般会自动切换，手动点一下最保险。
- 再按一次 `Ctrl+P`（或再点 ▶）退出 Play。

### 4. 操作

| 按键 | 动作 |
|---|---|
| `A` / `←` | 向左变轨 |
| `D` / `→` | 向右变轨 |
| `W` / `空格` / `↑` | 跃升（躲红色方块） |
| `S` / `↓` | 下沉（钻过橙色横梁） |
| `P` / `Esc` | 暂停 / 继续 |
| `R` | 立刻重开 |

青色晶体加分并攒连击，三点护盾耗尽进入 `RUN COMPLETE`。也可以鼠标拖拽 / 触屏滑动操作。

### 5. 看 Console

`Ctrl+Shift+C` 打开 Console，**确认没有红色 Error**。
黄色 Warning 最多只有内置字体回退之类，不影响运行。

### 6. 面试前建议亲手做两件事

1. 菜单 **Tools > Neon Drift > Bake Environment Scene** 再跑一次（会重新生成场景和 `Assets/NeonDrift/Materials/*.mat`），确认编辑器工具链也正常。
2. 菜单 **Create > Neon Drift > Game Config** 建一个配置资源，改一个数值（比如 `startSpeed` 从 22 改到 28），再 Play 感受差异 —— 这是讲「数据驱动」时最有说服力的一手体验。

---

## 工程结构

```
unity/                          ← 用 Cowork 打开这一层
├── Assets/
│   ├── Scripts/                12 个 C# 运行时脚本
│   ├── Shaders/NeonGrid.shader 自写霓虹网格地面 Shader
│   ├── Editor/SceneBuilder.cs  烘焙场景的编辑器工具
│   ├── Scenes/NeonDrift.unity 已烘焙好的可编辑场景
│   └── NeonDrift/Materials/    烘焙落盘的 6 个材质
├── Packages/manifest.json      只依赖引擎内置包 + com.unity.ugui，完全离线
└── ProjectSettings/            从团结引擎官方 3D 模板提取，YAML tag 与版本匹配
```

`Library/`、`Temp/`、`Logs/`、`UserSettings/` 是引擎本地缓存，**已刻意不打包**；
你第一次打开时引擎会自动重建，属正常现象。

---

## 出问题时对照

| 现象 | 处理 |
|---|---|
| 打开后是 `Untitled` 空场景、Scene 视图空的、找不到 Project 窗口 | **正常**，工程已加载且编译通过。直接点 ▶ Play 即可；或点底部 **Project** 标签 → `Assets/Scenes/NeonDrift.unity`，详见 2 节 |
| Cowork 找不到 / 不认这个工程 | 确认选的是含 `Assets` + `ProjectSettings` 的 `unity` 文件夹，不是上一级 |
| 提示版本不匹配 / 要下载别的版本 | 用 Cowork 的 *Locate existing installation* 指向 `C:\Program Files\Tuanjie 2022.3.62t18\Editor\Tuanjie.exe` |
| 又弹 `License error` | 见 `ENGINE-FIX.md`；确认 Cowork 已登录且 `C:\ProgramData\Tuanjie\Tuanjie_lic.ulf` 存在 |
| 编译报 `Collider / AudioListener / ParticleSystem` 找不到 | `Packages/manifest.json` 里必须保留 `com.unity.modules.physics` / `audio` / `particlesystem`；本工程已配好，别删 |
| 画面全黑 | 看 Hierarchy 是否只有一个启用的 Camera；`WorldBuilder` 会自动禁用模板场景多余相机 |
| HUD 没文字 | 内置字体名在不同版本是 `LegacyRuntime.ttf` / `Arial.ttf`，`HUD.cs` 已双重回退 |
| 按 `A/D` 没反应 | Project Settings > Player > Active Input Handling；新旧输入都已适配，设为 Both 最保险 |
| 命令行批处理编译报 `Item has already been added. Key: 'HTTP_PROXY'` | 仅当从某些终端启动编辑器时、环境变量里大小写两份代理变量共存才会触发；**从 Cowork 图形界面启动不受影响** |

---

## 已经验证到哪一步（如实说明）

| 项目 | 状态 |
|---|---|
| 团结引擎 `2022.3.62t18` 批处理模式编译全部 C# / Shader | ✅ 0 error，生成 `Assembly-CSharp.dll`、`Assembly-CSharp-Editor.dll` |
| `SceneBuilder.Bake` 烘焙场景 | ✅ 成功，`NeonDrift.unity` 16 段环境 + 6 个 `.mat` 落盘 |
| 浏览器镜像版 | ✅ 无头 Edge 实机渲染，0 JS 错误，可玩 |
| **Play 模式实机试玩** | ⏳ **需要你按上面第 3–5 步亲手点一次** |

最后一项请务必自己跑一遍：玩到一次 Game Over、看一眼 Console、把三个技术点用自己的话说一遍。
面试时能讲清「为什么这样设计」，比任何截图都加分。

---

## 不想开引擎也能演示

直接双击 `web/showcase.html`（单文件、离线、无需 Unity）：左边是能玩的 3D 游戏，
右上角「作品讲解」展开架构图、四个技术亮点、6 段真实源码和追问要点。可直接当邮件附件发给面试官。
