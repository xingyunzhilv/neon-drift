/* 生成浏览器渲染自检页面：注入错误收集器，3.2 秒后把结果写进 DOM。
 * 配合 Edge/Chrome headless --dump-dom / --screenshot 使用。
 * 运行：node tests/probe.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const web = path.join(__dirname, '..', 'web');
const standalone = process.argv.indexOf('--standalone') !== -1;
const showcase = process.argv.indexOf('--showcase') !== -1;
const keepOpen = process.argv.indexOf('--keep-open') !== -1;
const scroll = process.argv.indexOf('--scroll') !== -1;
const source = showcase ? 'showcase.html' : (standalone ? 'standalone.html' : 'index.html');
const base = showcase ? '__probe_showcase' :
             (standalone ? '__probe_standalone' : '__probe');
const output = base + (scroll ? '_code' : (keepOpen ? '_shot' : '')) + '.html';
const html = fs.readFileSync(path.join(web, source), 'utf8');

// 截图专用：保持面板展开（--keep-open），或再滚到源码区（--scroll）
const closeStep = keepOpen ? '' :
  "setTimeout(function () { var x = document.getElementById('ndb-close'); if (x) x.click(); }, 2400);";
const scrollStep = scroll ?
  "setTimeout(function () { var p = document.getElementById('ndb-panel'); if (p) p.scrollTop = 1550; }, 2800);" : '';

const probe = `
<script>
window.__errs = [];
window.addEventListener('error', function (e) {
  window.__errs.push(e.message + ' @' + (e.filename || '') + ':' + e.lineno);
});
window.addEventListener('unhandledrejection', function (e) {
  window.__errs.push('promise:' + e.reason);
});
window.__panelSeen = 'n/a';
setTimeout(function () {
  var b = document.getElementById('startBtn');
  if (b) b.click();
}, 400);
// 展示页额外校验：讲解面板能展开、能关闭、关闭后游戏恢复
setTimeout(function () {
  var t = document.getElementById('ndb-toggle');
  if (t) t.click();
}, 900);
setTimeout(function () {
  var p = document.getElementById('ndb-panel');
  window.__panelSeen = p ? (p.classList.contains('ndb-open') ? 'open' : 'closed') : 'none';
}, 1600);
${closeStep}
${scrollStep}
setTimeout(function () {
  var d = document.createElement('div');
  d.id = '__probe';
  var c = document.getElementById('scene');
  var p = document.getElementById('ndb-panel');
  d.textContent = 'ERRS=' + window.__errs.length + '|' + window.__errs.join(';;') +
    '|CANVAS=' + (c ? (c.width + 'x' + c.height) : 'none') +
    '|STATE=' + (window.NDGame ? window.NDGame.state : 'none') +
    '|SCORE=' + (window.NDGame ? Math.floor(window.NDGame.score) : -1) +
    '|PANEL=' + window.__panelSeen +
    '|PANEL2=' + (p ? (p.classList.contains('ndb-open') ? 'open' : 'closed') : 'none') +
    '|CODES=' + document.querySelectorAll('pre.ndb-code').length +
    '|BRIEF=' + (window.__NDBrief ? 'yes' : 'no');
  document.body.appendChild(d);
}, 3200);
</script>`;

fs.writeFileSync(path.join(web, output), html.replace('<head>', '<head>' + probe));
console.log('probe page written: web/' + output + ' (from ' + source + ')');
