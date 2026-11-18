/* NEON DRIFT — 全局可调参数
 * 所有数值集中在这里，方便做难度调优与数据驱动。
 * Unity 版本中对应 GameConfig(ScriptableObject)，设计思路一致。
 */
(function (global) {
  'use strict';
  var ND = global.ND = global.ND || {};

  ND.CONFIG = {
    laneWidth: 2.7,
    laneX: [-2.7, 0, 2.7],

    segmentLength: 24,
    segmentCount: 16,
    groundLength: 420,

    startSpeed: 22,          // 起始前进速度 (单位/秒)
    maxSpeed: 48,            // 速度上限
    speedRamp: 0.42,         // 每秒速度增量
    distancePerScore: 1.0,   // 每米基础分权重

    jumpVelocity: 11.2,      // 跃升初速度
    gravity: 30.0,           // 重力
    slideDuration: 0.70,     // 下沉持续时间
    laneLerp: 14.0,          // 轨道切换插值速度

    spawnAhead: 190,         // 生成距离（相对相机）
    despawnBehind: 14,       // 超过玩家多远回收
    baseSpawnGap: 15,        // 初始障碍间距
    minSpawnGap: 10,         // 最小障碍间距

    playerHalfWidth: 0.62,
    playerBaseY: 0.85,
    playerHeight: 1.15,
    slideHeight: 0.55,
    hitZ: 1.15,              // 碰撞判定的 z 容差

    maxShield: 3,
    invulnerable: 1.25,      // 受击无敌时间
    pickupScore: 60,
    comboWindow: 2.4,        // 连击有效窗口（秒）
    comboStep: 0.25,         // 每层连击倍率增量
    maxComboMultiplier: 4,

    cameraLag: 6.5,
    cameraHeight: 4.0,
    cameraBack: 9.2,

    dtClamp: 0.05
  };

  ND.COLORS = {
    cyan:   0x38f5e0,
    purple: 0xa06bff,
    pink:   0xff4fa3,
    amber:  0xffc861,
    dark:   0x05060e,
    block:  0xff5470,
    gate:   0xffa03c,
    pickup: 0x5cffe4
  };

  ND.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  ND.rand = function (a, b) { return a + Math.random() * (b - a); };
  ND.randInt = function (a, b) { return Math.floor(ND.rand(a, b + 1)); };
})(window);
