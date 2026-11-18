/* 逻辑冒烟测试（Node 环境，无需浏览器）
 * 用最小 DOM stub 驱动真实的 Three.js + 游戏逻辑，验证：
 * 场景构建、状态机、生成/回收、碰撞结算、连击、重开在长时间运行下不抛异常。
 * 运行：node tests/smoke.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const THREE = require('../web/vendor/three.min.js');

const root = path.join(__dirname, '..', 'web', 'src');

function leaf() {
  return { classList: { add() {}, remove() {}, toggle() {} } };
}
function fakeElement() {
  return {
    style: {}, textContent: '', innerHTML: '',
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    children: [leaf(), leaf(), leaf()],
    setAttribute() {}, getContext() { return ctx2d; },
    width: 128, height: 128
  };
}
const ctx2d = {
  fillStyle: null, globalCompositeOperation: '',
  createRadialGradient() { return { addColorStop() {} }; },
  fillRect() {}
};
const elements = {};
const document = {
  getElementById(id) { return elements[id] || (elements[id] = fakeElement()); },
  createElement(tag) { return tag === 'canvas' ? fakeElement() : {}; }
};

const sandbox = {
  THREE, document, console,
  localStorage: { getItem() { return null; }, setItem() {} },
  performance: { now() { return 0; } }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

['config', 'pool', 'world', 'player', 'game'].forEach(function (name) {
  const file = path.join(root, name + '.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
});

const ND = sandbox.ND;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, 1.6, 0.1, 600);
const renderer = { render() {} };

const report = { steps: [], errors: [] };
function check(label, condition, detail) {
  report.steps.push({ label: label, pass: !!condition, detail: detail });
  if (!condition) report.errors.push(label);
}

try {
  const game = new ND.Game(scene, camera, renderer);
  check('场景与游戏构造', game.state === 'ready', 'state=' + game.state);
  check('世界分段数量', game.world.segments.length === ND.CONFIG.segmentCount,
    'segments=' + game.world.segments.length);

  game.tick(1 / 60);
  check('ready 空闲循环', true, 'idle frame ok');

  game.input('start');
  check('开始游戏', game.state === 'playing', 'state=' + game.state);

  const actions = ['left', 'right', 'up', 'down'];
  let maxActive = 0;
  for (let i = 0; i < 2400; i++) {
    if (i % 23 === 0) game.input(actions[i % actions.length]);
    game.tick(1 / 60);
    const active = game.blockPool.active.length + game.gatePool.active.length +
      game.pickupPool.active.length + game.burstPool.active.length;
    maxActive = Math.max(maxActive, active);
    if (game.state === 'over') break;
  }
  check('长时间运行无异常', true, 'frames simulated');
  check('计分系统生效', game.score > 0, 'score=' + Math.floor(game.score));
  check('对象池规模有界', maxActive < 120, 'maxActive=' + maxActive);
  check('碰撞结算触发', game.shield < ND.CONFIG.maxShield || game.state === 'over',
    'shield=' + game.shield + ' state=' + game.state);

  game.input('pause');
  const paused = game.state;
  game.input('pause');
  check('暂停切换', paused === 'paused' || paused === 'over', 'pauseFrom=' + paused + ' -> ' + game.state);

  game.input('restart');
  check('重开归零', game.state === 'playing' && game.score === 0,
    'state=' + game.state + ' score=' + game.score);
  for (let i = 0; i < 300; i++) game.tick(1 / 60);
  check('重开后稳定运行', true, '300 frames ok');
} catch (e) {
  report.errors.push('EXCEPTION: ' + (e && e.stack ? e.stack : String(e)));
}

report.steps.forEach(function (s) {
  console.log((s.pass ? 'PASS' : 'FAIL') + '  ' + s.label + '  [' + s.detail + ']');
});
console.log('\n' + (report.errors.length ? 'FAILED: ' + report.errors.join(' | ') : 'ALL CHECKS PASSED'));
process.exit(report.errors.length ? 1 : 0);
