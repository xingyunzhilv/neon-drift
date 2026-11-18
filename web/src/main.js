/* 入口：渲染器初始化、输入层（键盘 / 触屏滑动 / 鼠标拖拽 / 虚拟按键）、主循环 */
(function (global) {
  'use strict';
  var ND = global.ND;
  var C = ND.CONFIG;
  var canvas = document.getElementById('scene');

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.getElementById('overlay').innerHTML =
      '<div class="card"><h1>WEBGL 不可用</h1><div class="sub">请在支持 WebGL 的浏览器中打开，' +
      '或改用 /unity 目录下的 Unity 工程运行。</div></div>';
    return;
  }
  renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
  renderer.setSize(global.innerWidth, global.innerHeight, false);
  if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(68, global.innerWidth / global.innerHeight, 0.1, 600);
  camera.position.set(0, C.cameraHeight, C.cameraBack);
  camera.lookAt(0, 1.15, -14);

  var game = new ND.Game(scene, camera, renderer);
  global.NDGame = game;   // 便于在控制台查看状态、面试时演示调参

  /* ---------- 自适应 ---------- */
  global.addEventListener('resize', function () {
    var w = global.innerWidth, h = global.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  /* ---------- 键盘 ---------- */
  var KEY = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', Space: 'up',
    ArrowDown: 'down', KeyS: 'down',
    KeyP: 'pause', Escape: 'pause',
    KeyR: 'restart',
    Enter: 'start', NumpadEnter: 'start'
  };
  var BLOCK = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
  global.addEventListener('keydown', function (e) {
    if (BLOCK.indexOf(e.code) !== -1) e.preventDefault();
    if (e.repeat) return;
    var a = KEY[e.code];
    if (a) game.input(a);
  });

  /* ---------- 开始 / 重开按钮 ---------- */
  document.getElementById('startBtn').addEventListener('click', function () {
    game.input('start');
  });

  /* ---------- 触屏 / 鼠标手势 ---------- */
  var startPt = null;
  function begin(x, y) { startPt = { x: x, y: y }; }
  function end(x, y) {
    if (!startPt) return;
    var dx = x - startPt.x, dy = y - startPt.y;
    startPt = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) game.input(dx > 0 ? 'right' : 'left');
    else game.input(dy > 0 ? 'down' : 'up');
  }

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length) begin(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  canvas.addEventListener('touchend', function (e) {
    if (e.changedTouches.length) end(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }, { passive: true });

  canvas.addEventListener('mousedown', function (e) { begin(e.clientX, e.clientY); });
  canvas.addEventListener('mouseup', function (e) { end(e.clientX, e.clientY); });

  var BTN = { tLeft: 'left', tRight: 'right', tUp: 'up', tDown: 'down' };
  Object.keys(BTN).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      game.input(BTN[id]);
    });
  });

  /* ---------- 主循环 ---------- */
  var last = performance.now();
  function loop(now) {
    global.requestAnimationFrame(loop);
    var dt = Math.min((now - last) / 1000, C.dtClamp);
    last = now;
    if (dt > 0) game.tick(dt);
  }
  global.requestAnimationFrame(loop);
})(window);
