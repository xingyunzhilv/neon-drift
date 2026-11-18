# NEON DRIFT — Unity / 团结引擎工程

> 这是 `unity/` 完整工程目录的说明，可单独随工程一起发给面试官。
> 完整项目介绍见上一级 `README.md`，一步一步的运行操作见 `START-HERE.md`，面试讲稿见 `INTERVIEW.md`。

## 直接打开（推荐）

`unity/` **本身就是一个完整工程**，包含 `Assets/`、`Packages/manifest.json`、
`ProjectSettings/`，设置取自团结引擎官方 3D 模板，`ProjectVersion.txt` 锁定
`2022.3.62t18`。**不需要新建工程、不需要拷贝文件**：

1. 团结 Cowork → **打开已有项目** → 选择 `unity` 这一层文件夹。
2. 首次打开等 1–3 分钟导入完成。
3. 双击 `Assets/Scenes/NeonDrift.unity`（已烘焙好的 16 段赛道场景）→ 点 **▶ Play** → 按 `Enter` 开始。
4. `Ctrl+Shift+C` 查看 Console 无红色报错。

详细图文步骤见 [`START-HERE.md`](../START-HERE.md)。

## 也可以拷进已有工程

把 `Assets` 整体复制到任意 3D 工程的 `Assets` 下，打开任意场景直接点 Play 即可 ——
`GameBootstrap.cs` 用 `[RuntimeInitializeOnLoadMethod]` 自动搭建整个世界。
注意同时保留 `Packages/manifest.json` 里 `physics` / `audio` / `particlesystem` 三个内置模块，
否则 `WorldBuilder.cs` 会报 `CS1069`。

可选：菜单 **Tools > Neon Drift > Bake Environment Scene** 重新烘焙场景；
菜单 **Create > Neon Drift > Game Config** 建配置资源（命名 `NeonDriftConfig.asset`
并放入任意 `Resources` 目录）覆盖默认难度参数。

`Active Input Handling` 设为 `Both`、`Input Manager (Old)`、`Input System Package (New)` 均可。

## 文件职责

| 文件 | 职责 |
|---|---|
| `GameBootstrap.cs` | `[RuntimeInitializeOnLoadMethod]` 零配置启动；场景已有 GameManager 时不重复创建 |
| `GameManager.cs` | 状态机、子系统装配、计分 / 连击 / 护盾 / 存档 |
| `GameConfig.cs` | ScriptableObject 配置，所有可调数值集中处 |
| `PlayerController.cs` | 三轨道移动、跃升、下沉；帧率无关运动与碰撞盒 |
| `TrackGenerator.cs` | 按距离程序化生成、可解性保证、扫掠式碰撞判定 |
| `Pool.cs` | GameObject 对象池，消除生成阶段的 GC 峰值 |
| `WorldBuilder.cs` | 程序化生成地面 / 护栏 / 灯光 / 相机 / 飞船 / 障碍 / 粒子；编辑器材质持久化 |
| `WorldRefs.cs` | 场景引用持有，让「运行时搭建」与「烘焙场景」共用一套环境 |
| `CameraRig.cs` | 阻尼跟随、速度感 FOV、受击抖动（LateUpdate） |
| `HUD.cs` | 运行时构建 UGUI，不依赖 TMP / EventSystem / 预制体 |
| `NDInput.cs` | 新旧输入系统条件编译适配，键盘 / 鼠标 / 触屏统一为四种动作 |
| `NeonGrid.shader` | 世界坐标计算的自写网格 Shader，`SRPDefaultUnlit` 跨管线兼容 |
| `SceneBuilder.cs` | 编辑器工具：烘焙可保存的 .unity 场景 |

## 设计要点

- **可解性**：每行障碍最多占用 `laneCount - 1` 条轨道，永远留一条空轨道，晶体放在安全路径上。
- **不漏判**：记录移动前 z，只在物体跨过玩家平面 `z=0` 时结算一次碰撞，与单帧位移无关。
- **帧率无关**：位移按 `dt` 积分并 clamp 到 0.05s；横向用 `1 - exp(-k·dt)` 指数插值。
- **零 GC 生成**：障碍 / 晶体走对象池；只有低频特效用 `ParticleSystem` + 定时销毁。
- **零依赖美术**：所有几何体由 `CreatePrimitive` 组合，材质运行时创建，shader 自写。
- **跨管线 / 跨输入系统**：材质与输入均做了条件编译或运行时探测回退。

## 常见问题

| 现象 | 原因 / 处理 |
|---|---|
| 点 Play 后画面黑屏 | 确认只有一个启用的 Camera；`WorldBuilder` 会自动禁用模板场景里多余的相机 |
| Console 报 `FindObjectsByType` 不存在 | 使用 Unity 2021.3 时条件编译会走 `FindObjectsOfType`；确认符号 `UNITY_2022_2_OR_NEWER` 生效 |
| 文字不显示 | 内置字体名在不同版本为 `LegacyRuntime.ttf` / `Arial.ttf`，`HUD.cs` 已做双重回退 |
| 输入无响应 | 检查 Project Settings > Player > Active Input Handling；两套输入都已适配 |
| 地面是纯色没有网格 | 确认 `NeonGrid.shader` 已导入且未被剔除；回退路径会用单色 Unlit 材质 |
| 烘焙场景材质变粉 / 丢失 | 重新执行一次 Bake 菜单，会把内存材质写入 `Assets/NeonDrift/Materials/` |
