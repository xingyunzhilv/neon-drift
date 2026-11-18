/* 生成单文件版 web/standalone.html
 * 把 three.min.js 与全部 src/*.js 内联进 index.html，得到一个可以单独发送、
 * 双击即玩、完全离线的 HTML 文件（面试发附件 / 邮件用）。
 * 运行：node tests/bundle.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const web = path.join(__dirname, '..', 'web');

let html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
let inlined = 0;

html = html.replace(/<script src="([^"]+)"><\/script>/g, function (match, ref) {
  const code = fs.readFileSync(path.join(web, ref), 'utf8');
  inlined++;
  // 防止脚本内容中的 </script> 提前闭合 HTML 标签
  const safe = code.replace(/<\/script>/gi, '<\\/script>');
  return '<script>\n' + safe + '\n</script>';
});

if (html.indexOf('src="vendor/') !== -1 || html.indexOf('src="src/') !== -1)
  throw new Error('仍有未内联的外部脚本引用');

const out = path.join(web, 'standalone.html');
fs.writeFileSync(out, html);
console.log('bundled ' + inlined + ' scripts -> web/standalone.html (' +
            (fs.statSync(out).size / 1024).toFixed(0) + ' KB)');
