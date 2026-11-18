/* 游戏主控制器
 * 状态机 ready -> playing <-> paused -> over -> playing
 * 负责：程序化生成、扫掠式碰撞检测、计分连击、相机、粒子、HUD、存档
 */
(function (global) {
  'use strict';
  var ND = global.ND = global.ND || {};
  var C = ND.CONFIG, COL = ND.COLORS;

  function $(id) { return document.getElementById(id); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  ND.Game = function (scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.dom = {
      overlay: $('overlay'), kicker: $('kicker'), subtitle: $('subtitle'),
      result: $('result'), keys: $('keys'), btn: $('startBtn'),
      score: $('score'), distance: $('distance'), speed: $('speed'),
      combo: $('combo'), shields: $('shields').children,
      pause: $('pause'), flash: $('flash'),
      finalScore: $('finalScore'), finalDist: $('finalDist'),
      finalCombo: $('finalCombo'), bestScore: $('bestScore')
    };

    this.world = new ND.World(scene);
    this.player = new ND.Player(scene);

    this.blockPool  = new ND.Pool(function () { return ND.Assets.makeBlock(); });
    this.gatePool   = new ND.Pool(function () { return ND.Assets.makeGate(); });
    this.pickupPool = new ND.Pool(function () { return ND.Assets.makePickup(); });
    this.burstPool  = new ND.Pool(function () { return ND.Assets.makeBurst(); });
    this.pools = [this.blockPool, this.gatePool, this.pickupPool, this.burstPool];

    this.best = this.loadBest();
    this.state = 'ready';
    this.reset();
    this.showReady();
  };

  /* ---------- 存档 ---------- */
  ND.Game.prototype.loadBest = function () {
    try { return parseInt(global.localStorage.getItem('neon-drift-best') || '0', 10) || 0; }
    catch (e) { return 0; }
  };
  ND.Game.prototype.saveBest = function (v) {
    try { global.localStorage.setItem('neon-drift-best', String(v)); } catch (e) {}
  };

  /* ---------- 状态 ---------- */
  ND.Game.prototype.reset = function () {
    for (var i = 0; i < this.pools.length; i++) this.pools[i].releaseAll();
    this.world.reset();
    this.player.reset();
    this.elapsed = 0;
    this.speed = C.startSpeed;
    this.distance = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.shield = C.maxShield;
    this.spawnAccum = 0;
    this.shake = 0;
    this.flashAlpha = 0;
    this.dom.flash.style.opacity = '0';
    this.dom.combo.classList.remove('on');
    this.camera.fov = 68;
    this.camera.updateProjectionMatrix();
    this.updateHUD();
  };

  ND.Game.prototype.start = function () {
    this.reset();
    this.state = 'playing';
    this.dom.overlay.classList.add('hidden');
    this.dom.pause.classList.remove('on');
  };

  ND.Game.prototype.togglePause = function () {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.dom.pause.classList.add('on');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.dom.pause.classList.remove('on');
    }
  };

  ND.Game.prototype.gameOver = function () {
    this.state = 'over';
    this.spawnBurst(this.player.group.position, COL.pink, 1.6);
    this.player.group.visible = false;
    this.best = Math.max(this.best, Math.floor(this.score));
    this.saveBest(this.best);
    this.showOver();
  };

  ND.Game.prototype.input = function (action) {
    if (action === 'start') {
      if (this.state === 'ready' || this.state === 'over') this.start();
      return;
    }
    if (action === 'restart') { this.start(); return; }
    if (action === 'pause') { this.togglePause(); return; }
    if (this.state !== 'playing') return;
    switch (action) {
      case 'left':  this.player.move(-1); break;
      case 'right': this.player.move(1); break;
      case 'up':    this.player.jump(); break;
      case 'down':  this.player.slide(); break;
    }
  };

  /* ---------- 界面 ---------- */
  ND.Game.prototype.showReady = function () {
    var d = this.dom;
    d.overlay.classList.remove('hidden');
    d.kicker.textContent = 'UNITY 3D PORTFOLIO DEMO / WEB MIRROR';
    d.subtitle.innerHTML = '三轨道无尽飞行 · 程序化赛道生成 · 自研霓虹网格着色器<br>一个从零搭建、不依赖任何美术资源的 3D 游戏原型';
    d.result.classList.remove('on');
    d.keys.style.display = '';
    d.btn.textContent = '开始飞行';
  };

  ND.Game.prototype.showOver = function () {
    var d = this.dom;
    d.overlay.classList.remove('hidden');
    d.kicker.textContent = 'RUN COMPLETE / 护盾耗尽';
    d.subtitle.innerHTML = '左右变轨 · 跃升与下沉 · 收集晶体维持连击<br>按 <b>R</b> 或点击按钮重新挑战';
    d.result.classList.add('on');
    d.keys.style.display = 'none';
    d.btn.textContent = '再来一次';
    d.finalScore.textContent = Math.floor(this.score);
    d.finalDist.textContent = Math.floor(this.distance) + ' m';
    d.finalCombo.textContent = this.maxCombo + ' x';
    d.bestScore.textContent = this.best;
  };

  ND.Game.prototype.updateHUD = function () {
    var d = this.dom;
    d.score.textContent = String(Math.floor(this.score)).padStart(6, '0');
    d.distance.textContent = Math.floor(this.distance) + ' m';
    d.speed.textContent = Math.round(this.speed) + ' u/s';
    if (this.combo > 1) {
      d.combo.textContent = 'COMBO ' + this.combo + ' x  ·  ' + this.multiplier().toFixed(2) + ' 倍率';
      d.combo.classList.add('on');
    } else {
      d.combo.classList.remove('on');
    }
    for (var i = 0; i < d.shields.length; i++) {
      d.shields[i].classList.toggle('off', i >= this.shield);
    }
  };

  /* ---------- 难度与计分 ---------- */
  ND.Game.prototype.difficulty = function () {
    return ND.clamp(this.distance / 1400, 0, 1);
  };
  ND.Game.prototype.multiplier = function () {
    return Math.min(1 + this.combo * C.comboStep, C.maxComboMultiplier);
  };

  /* ---------- 生成 ---------- */
  ND.Game.prototype.spawnRow = function (z) {
    var diff = this.difficulty();
    var lanes = shuffle([0, 1, 2]);
    var count = Math.random() < (0.16 + 0.48 * diff) ? 2 : 1;

    for (var i = 0; i < count; i++) {
      var lane = lanes[i];
      var isGate = Math.random() < 0.42;
      var pool = isGate ? this.gatePool : this.blockPool;
      var o = pool.acquire(this.scene);
      o.position.set(C.laneX[lane], 0, z + ND.rand(-1.4, 1.4));
      o.userData.kind = isGate ? 'gate' : 'block';
      o.userData.lane = lane;
      o.userData.prevZ = o.position.z;
      o.userData.phase = Math.random() * 6.28;
    }

    /* 保证至少一条空轨道，并把晶体放在这条安全路径上 */
    var free = lanes.slice(count);
    var pickLane = free[ND.randInt(0, free.length - 1)];
    var chain = Math.random() < 0.35 ? 3 : 1;
    for (var k = 0; k < chain; k++) {
      this.spawnPickup(pickLane, z - 1.5 - k * 3.2);
    }
  };

  ND.Game.prototype.spawnPickup = function (lane, z) {
    var o = this.pickupPool.acquire(this.scene);
    o.position.set(C.laneX[lane], 1.05, z);
    o.userData.kind = 'pickup';
    o.userData.lane = lane;
    o.userData.prevZ = z;
    o.userData.phase = Math.random() * 6.28;
    return o;
  };

  ND.Game.prototype.spawnBurst = function (pos, color, scale) {
    var b = this.burstPool.acquire(this.scene);
    b.position.copy(pos);
    b.scale.setScalar(scale || 1);
    b.userData.life = 0.55;
    b.userData.maxLife = 0.55;
    var pts = b.userData.points;
    pts.material.color.setHex(color);
    pts.material.opacity = 1;
    var arr = pts.geometry.attributes.position.array;
    var vel = b.userData.vel;
    for (var i = 0; i < vel.length; i++) {
      arr[i * 3] = 0; arr[i * 3 + 1] = 0; arr[i * 3 + 2] = 0;
      var a = Math.random() * Math.PI * 2, r = ND.rand(2.5, 8);
      vel[i].set(Math.cos(a) * r, ND.rand(1.5, 7), Math.sin(a) * r);
    }
    pts.geometry.attributes.position.needsUpdate = true;
  };

  /* ---------- 每帧逻辑 ---------- */
  ND.Game.prototype.tick = function (dt) {
    if (this.state === 'playing') this.update(dt);
    else if (this.state === 'ready' || this.state === 'over') this.updateIdle(dt);
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.6);
      this.dom.flash.style.opacity = String(this.flashAlpha * 0.5);
    }
    this.renderer.render(this.scene, this.camera);
  };

  ND.Game.prototype.updateIdle = function (dt) {
    this.elapsed += dt;
    this.world.update(dt, 9);
    if (this.state === 'ready') this.player.update(dt, 9);
    this.updateBursts(dt);
    this.camera.position.x = Math.sin(this.elapsed * 0.35) * 0.7;
    this.camera.position.y = C.cameraHeight + Math.sin(this.elapsed * 0.6) * 0.22;
    this.camera.lookAt(0, 1.15, -14);
  };

  ND.Game.prototype.update = function (dt) {
    this.elapsed += dt;
    this.speed = Math.min(C.maxSpeed, C.startSpeed + C.speedRamp * this.elapsed);
    var move = this.speed * dt;
    this.distance += move;

    this.world.update(dt, this.speed);
    this.player.update(dt, this.speed);

    /* 按行进距离生成，保证任意速度下的障碍间距一致 */
    this.spawnAccum += move;
    var gap = C.baseSpawnGap - this.difficulty() * (C.baseSpawnGap - C.minSpawnGap);
    if (this.spawnAccum >= gap) {
      this.spawnAccum -= gap;
      this.spawnRow(-C.spawnAhead + this.spawnAccum);
    }

    this.moveObjects(move, dt);
    this.updateBursts(dt);

    this.score += move * 2 * this.multiplier();
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this.updateCamera(dt);
    this.updateHUD();
  };

  /* 倒序遍历 + 扫掠判定：物体跨过玩家平面(z=0)时结算一次，高速下不会漏判 */
  ND.Game.prototype.moveObjects = function (move, dt) {
    var self = this;
    var obstaclePools = [this.blockPool, this.gatePool, this.pickupPool];

    for (var p = 0; p < obstaclePools.length; p++) {
      var pool = obstaclePools[p], arr = pool.active;
      for (var i = arr.length - 1; i >= 0; i--) {
        var o = arr[i];
        o.userData.prevZ = o.position.z;
        o.position.z += move;

        if (o.userData.kind === 'pickup') {
          o.userData.core.rotation.y += dt * 2.6;
          o.userData.core.rotation.x += dt * 1.1;
          o.userData.ring.rotation.z += dt * 1.8;
          o.position.y = 1.05 + Math.sin(this.elapsed * 3 + o.userData.phase) * 0.16;
        } else if (o.userData.halo) {
          o.userData.halo.material.opacity = 0.28 + 0.16 * Math.sin(this.elapsed * 5 + o.userData.phase);
        }

        if (o.userData.prevZ < 0 && o.position.z >= 0) self.resolvePass(o);
        if (o.position.z > C.despawnBehind) pool.release(o);
      }
    }
  };

  ND.Game.prototype.resolvePass = function (o) {
    var b = this.player.bounds();
    var dx = Math.abs(o.position.x - b.x);
    var kind = o.userData.kind;

    if (kind === 'pickup') {
      if (dx < b.hw + 0.8 && Math.abs(this.player.group.position.y - o.position.y) < 1.4) {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.comboTimer = C.comboWindow;
        this.score += C.pickupScore * this.multiplier();
        this.spawnBurst(o.position, COL.pickup, 0.8);
        this.pickupPool.release(o);
      }
      return;
    }

    if (this.player.invuln > 0 || this.state !== 'playing') return;
    var oy = kind === 'block' ? { min: 0, max: 1.35 } : { min: 1.21, max: 1.69 };
    var hw = kind === 'block' ? 0.95 : 1.15;
    if (dx < b.hw + hw && b.max > oy.min && b.min < oy.max) this.damage(o);
  };

  ND.Game.prototype.damage = function (o) {
    this.shield--;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = 0.75;
    this.flashAlpha = 1;
    this.player.hit();
    this.spawnBurst(o.position, COL.block, 1.3);
    if (this.shield <= 0) this.gameOver();
  };

  ND.Game.prototype.updateBursts = function (dt) {
    var arr = this.burstPool.active;
    for (var i = arr.length - 1; i >= 0; i--) {
      var b = arr[i], u = b.userData;
      u.life -= dt;
      if (u.life <= 0) { this.burstPool.release(b); continue; }
      var pts = u.points, pos = pts.geometry.attributes.position, a = pos.array;
      for (var k = 0; k < u.vel.length; k++) {
        a[k * 3] += u.vel[k].x * dt;
        a[k * 3 + 1] += u.vel[k].y * dt;
        a[k * 3 + 2] += u.vel[k].z * dt;
        u.vel[k].y -= 11 * dt;
      }
      pos.needsUpdate = true;
      pts.material.opacity = u.life / u.maxLife;
      b.scale.multiplyScalar(1 + dt * 0.9);
    }
  };

  ND.Game.prototype.updateCamera = function (dt) {
    var px = this.player.group.position.x;
    this.camera.position.x = lerp(this.camera.position.x, px * 0.35, 1 - Math.exp(-C.cameraLag * dt));
    var s = this.shake;
    this.camera.position.y = C.cameraHeight + Math.sin(this.elapsed * 62) * s * 0.24;
    this.camera.position.z = C.cameraBack + Math.sin(this.elapsed * 78) * s * 0.16;
    this.camera.lookAt(px * 0.22, 1.15, -14);

    var boost = (this.speed - C.startSpeed) / (C.maxSpeed - C.startSpeed);
    var fov = 68 + ND.clamp(boost, 0, 1) * 9 - s * 3;
    if (Math.abs(fov - this.camera.fov) > 0.08) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.shake = Math.max(0, this.shake - dt * 2.4);
  };
})(window);
