"""静态源码校验（无需 Unity / .NET 环境）。

检查项：
  1. C# 文件括号平衡（剔除注释与字符串字面量后）
  2. MonoBehaviour / ScriptableObject 类名与文件名一致（否则 Unity 场景引用会丢失）
  3. Shader 的 CGPROGRAM/ENDCG 配对与括号平衡
  4. 关键类型/符号均已定义
  5. web/index.html 引用的脚本文件全部存在
运行：python tests/check_sources.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "unity" / "Assets"
WEB = ROOT / "web"
errors = []
checks = []


def record(label, ok, detail=""):
    checks.append((label, ok, detail))
    if not ok:
        errors.append(label + (" :: " + detail if detail else ""))


def strip_cs(text):
    """去掉块注释、行注释、字符串与字符字面量，保留结构字符。"""
    out = []
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        if c == "/" and i + 1 < n and text[i + 1] == "/":
            j = text.find("\n", i)
            i = n if j < 0 else j
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "*":
            j = text.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        if c in "\"'":
            q = c
            i += 1
            while i < n:
                if text[i] == "\\":
                    i += 2
                    continue
                if text[i] == q:
                    i += 1
                    break
                i += 1
            out.append(" ")
            continue
        out.append(c)
        i += 1
    return "".join(out)


def balanced(text, label):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in text:
        if ch in "([{":
            stack.append(ch)
        elif ch in ")]}":
            if not stack or stack.pop() != pairs[ch]:
                record(label, False, "括号不匹配")
                return
    record(label, len(stack) == 0, "剩余未闭合 " + str(len(stack)))


cs_files = sorted(ASSETS.rglob("*.cs"))
record("C# 文件数量", len(cs_files) >= 12, str(len(cs_files)) + " 个")
all_cs = ""
for f in cs_files:
    src = f.read_text(encoding="utf-8")
    all_cs += src + "\n"
    clean = strip_cs(src)
    balanced(clean, "括号平衡 " + f.name)

    for m in re.finditer(r"\b(?:public|internal)\s+(?:static\s+|sealed\s+|abstract\s+)*"
                         r"(class|struct)\s+(\w+)[^{;]*\{", clean):
        kind, name = m.group(1), m.group(2)
        decl = clean[m.start():m.end()]
        if ": MonoBehaviour" in decl or ": ScriptableObject" in decl:
            record("文件名匹配 " + f.name, f.stem == name, name)
        else:
            record("文件名匹配 " + f.name, True, name + " (普通类)")

# 关键符号
required = [
    "class GameManager", "class GameConfig", "class WorldRefs", "class WorldBuilder",
    "class NDInput", "class GameObjectPool", "class PlayerController",
    "class CameraRig", "class HUD", "class TrackGenerator", "class GameBootstrap",
    "struct HitBox", "enum GameState", "RuntimeInitializeOnLoadMethod",
    "CreateAssetMenu", "RuntimeInitializeLoadType",
]
for sym in required:
    record("符号定义 " + sym, sym in all_cs)

shader = (ASSETS / "Shaders" / "NeonGrid.shader").read_text(encoding="utf-8")
record("Shader CGPROGRAM 配对",
       shader.count("CGPROGRAM") == 1 and shader.count("ENDCG") == 1)
record("Shader 自定义属性名", "_PulseTime" in shader and "_Scroll" in shader)
balanced(strip_cs(shader), "Shader 括号平衡")

html = (WEB / "index.html").read_text(encoding="utf-8")
refs = re.findall(r'<script src="([^"]+)"', html)
for ref in refs:
    record("脚本存在 " + ref, (WEB / ref).is_file())
record("vendor 本地化", (WEB / "vendor" / "three.min.js").stat().st_size > 100000)

for label, ok, detail in checks:
    print(("PASS  " if ok else "FAIL  ") + label + ("  [" + detail + "]" if detail else ""))
print("\n" + ("ALL CHECKS PASSED" if not errors else "FAILED:\n  " + "\n  ".join(errors)))
sys.exit(1 if errors else 0)
