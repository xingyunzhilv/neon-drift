/* 生成 web/showcase.html —— 单文件离线「面试作品展示页」
 *
 * = 可玩的 3D 游戏（standalone.html 全量内联）
 * + 架构图 / 四个技术亮点 / 工程真实源码片段 / 追问要点 / 诚实边界
 *
 * 源码片段直接从 unity/Assets 下读取并做 HTML 转义与轻量语法高亮，
 * 不使用手写伪代码，保证展示内容与交付工程一致。
 *
 * 运行：node tests/build_showcase.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const web = path.join(root, 'web');

// 先复用单文件打包逻辑，确保 showcase 基于最新的 index.html / src
require('./bundle.js');

const standalonePath = path.join(web, 'standalone.html');
const panelPath = path.join(web, 'showcase-panel.html');
let html = fs.readFileSync(standalonePath, 'utf8');
let panel = fs.readFileSync(panelPath, 'utf8');

/* ---------- 从工程里截取真实源码 ---------- */
function extract(rel, start, end, includeEnd) {
  const s = fs.readFileSync(path.join(root, rel), 'utf8');
  const a = s.indexOf(start);
  if (a < 0) throw new Error('片段起始标记未找到: ' + rel + ' :: ' + start);
  let b;
  if (!end) {
    b = s.indexOf('\n', a);
    if (b < 0) b = s.length;
  } else {
    const e = s.indexOf(end, a + start.length);
    if (e < 0) throw new Error('片段结束标记未找到: ' + rel + ' :: ' + end);
    b = includeEnd ? e + end.length : e;
  }
  return s.slice(a, b).replace(/\s+$/, '');
}

const TG = 'unity/Assets/Scripts/TrackGenerator.cs';
const specs = {
  spawn: extract(TG,
    '        void SpawnRow(float z)',
    '            for (int k = 0; k < chain; k++) SpawnPickup(freeLane, z - 1.5f - k * 3.2f);', true),

  sweep: extract(TG,
    '                if (d.prevZ < 0f && p.z >= 0f) ResolvePass(go, d);', null, false),

  aabb: extract(TG,
    '            float oyMin = d.kind == "block" ? 0f : 1.21f;',
    '                gm.Damage(go.transform.position);', true),

  mask: extract('unity/Assets/Shaders/NeonGrid.shader',
    '            float lineMask(float value, float period, float thickness)',
    '            }', true),

  frag: extract('unity/Assets/Shaders/NeonGrid.shader',
    '                float z = i.world.z + _Scroll;',
    '                float grid = max(gx, gz * 0.7);', true),

  pool: extract('unity/Assets/Scripts/Pool.cs',
    '        public GameObject Acquire()',
    '        public void ReleaseAll()', false)
};

/* ---------- 转义 + 轻量语法高亮（单轮扫描，不会重复处理插入的标签） ---------- */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TOKEN = /\/\/[^\n]*|"(?:[^"\\]|\\.)*"|\b(?:public|private|protected|void|float|int|bool|if|else|return|new|for|class|readonly|static|true|false|null|this|out|in|struct|fixed4|float3|float4|float2|frac|smoothstep|saturate|max|min|abs|lerp|sin|mul|Vector3|GameObject|Mathf|Random|List|Stack|Dictionary|GameObjectPool|HitBox|SetActive)\b/g;

function highlight(code) {
  return esc(code).replace(TOKEN, function (m) {
    if (m.slice(0, 2) === '//') return '<span class="ndb-c">' + m + '</span>';
    if (m.charAt(0) === '"') return '<span class="ndb-s">' + m + '</span>';
    return '<span class="ndb-k">' + m + '</span>';
  });
}

Object.keys(specs).forEach(function (key) {
  const token = '{{CODE:' + key + '}}';
  if (panel.indexOf(token) < 0) throw new Error('模板缺少占位符 ' + token);
  const lines = specs[key].split('\n').length;
  panel = panel.replace(token,
    '<pre class="ndb-code"><code>' + highlight(specs[key]) + '</code></pre>');
  console.log('  snippet ' + key + ' -> ' + lines + ' lines');
});

if (/\{\{CODE:/.test(panel)) throw new Error('仍有未替换的源码占位符');

/* ---------- 注入到单文件游戏里 ---------- */
if (html.indexOf('</body>') < 0) throw new Error('standalone.html 缺少 </body>');
html = html.replace(/<title>[^<]*<\/title>/,
  '<title>NEON DRIFT — Unity 3D 作品展示 | 面试演示</title>');
html = html.replace('</body>', panel + '\n</body>');

/* ---------- 完整性断言 ---------- */
['<canvas id="scene">', 'window.NDGame', 'id="ndb-panel"', 'id="ndb-toggle"',
 'ndb-arch', 'TrackGenerator.cs', 'NeonGrid.shader', '必须如实说明的边界']
  .forEach(function (needle) {
    if (html.indexOf(needle) < 0) throw new Error('生成结果缺少关键内容: ' + needle);
  });
if ((html.match(/<pre class="ndb-code">/g) || []).length !== 6)
  throw new Error('源码片段数量应为 6');

const out = path.join(web, 'showcase.html');
fs.writeFileSync(out, html);
console.log('built -> web/showcase.html (' +
            (fs.statSync(out).size / 1024).toFixed(0) + ' KB, 6 real snippets)');
