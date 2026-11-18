/* 玩家飞船：三轨道状态机 + 跃升 / 下沉
 * 运动完全由 deltaTime 驱动，与刷新率解耦；横向用指数插值保证手感一致。
 */
(function (global) {
  'use strict';
  var ND = global.ND = global.ND || {};
  var C = ND.CONFIG, COL = ND.COLORS;

  function lerp(a, b, t) { return a + (b - a) * t; }

  ND.Player = function (scene) {
    this.group = new THREE.Group();
    this.build();
    scene.add(this.group);
    this.reset();
  };

  ND.Player.prototype.build = function () {
    ND.Assets.init();
    var hull = new THREE.MeshStandardMaterial({
      color: 0x0b2a3a, emissive: 0x137f96, emissiveIntensity: 0.65,
      metalness: 0.7, roughness: 0.25, flatShading: true
    });
    var bright = new THREE.MeshStandardMaterial({
      color: 0x0a3b3a, emissive: COL.cyan, emissiveIntensity: 1.5,
      metalness: 0.3, roughness: 0.2
    });
    var engine = new THREE.MeshBasicMaterial({ color: COL.pink });

    var bodyGeo = new THREE.ConeGeometry(0.55, 1.85, 4);
    bodyGeo.rotateX(-Math.PI / 2);
    var body = new THREE.Mesh(bodyGeo, hull);
    this.group.add(body);

    var finGeo = new THREE.BoxGeometry(1.15, 0.09, 0.62);
    for (var s = -1; s <= 1; s += 2) {
      var fin = new THREE.Mesh(finGeo, hull);
      fin.position.set(s * 0.62, -0.05, 0.28);
      fin.rotation.z = -s * 0.2;
      this.group.add(fin);
      var tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), bright);
      tip.position.set(s * 1.17, 0.02, 0.28);
      this.group.add(tip);
    }

    var cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), bright);
    cockpit.scale.set(1, 0.6, 1.5);
    cockpit.position.set(0, 0.16, -0.16);
    this.group.add(cockpit);

    this.engines = [];
    for (var e = -1; e <= 1; e += 2) {
      var en = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.42, 8), engine);
      en.rotation.x = Math.PI / 2;
      en.position.set(e * 0.28, -0.06, 0.82);
      this.group.add(en);
      this.engines.push(en);

      var trailGeo = new THREE.PlaneGeometry(0.22, 2.6);
      var trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({
        color: COL.cyan, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      }));
      trail.rotation.x = -Math.PI / 2;
      trail.position.set(e * 0.28, -0.06, 2.1);
      this.group.add(trail);
      this.engines.push(trail);
    }

    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: ND.Assets.glowTexture, color: COL.cyan, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.42
    }));
    glow.scale.set(3.4, 3.4, 1);
    glow.position.z = 0.4;
    this.group.add(glow);
    this.glow = glow;
  };

  ND.Player.prototype.reset = function () {
    this.lane = 1;
    this.targetX = C.laneX[1];
    this.group.position.set(0, C.playerBaseY, 0);
    this.group.rotation.set(0, 0, 0);
    this.offsetY = 0;
    this.vy = 0;
    this.grounded = true;
    this.sliding = false;
    this.slideTimer = 0;
    this.invuln = 0;
    this.bob = 0;
    this.visible = true;
    this.group.visible = true;
  };

  ND.Player.prototype.move = function (dir) {
    var next = ND.clamp(this.lane + dir, 0, C.laneX.length - 1);
    if (next === this.lane) return false;
    this.lane = next;
    this.targetX = C.laneX[next];
    return true;
  };

  ND.Player.prototype.jump = function () {
    if (!this.grounded || this.sliding) return false;
    this.vy = C.jumpVelocity;
    this.grounded = false;
    return true;
  };

  ND.Player.prototype.slide = function () {
    if (this.sliding || !this.grounded) return false;
    this.sliding = true;
    this.slideTimer = C.slideDuration;
    return true;
  };

  ND.Player.prototype.hit = function () {
    this.invuln = C.invulnerable;
  };

  ND.Player.prototype.height = function () {
    return this.sliding ? C.slideHeight : C.playerHeight;
  };

  ND.Player.prototype.bounds = function () {
    var cy = this.group.position.y, h = this.height();
    return { min: cy - h / 2, max: cy + h / 2, x: this.group.position.x, hw: C.playerHalfWidth };
  };

  ND.Player.prototype.update = function (dt, speed) {
    this.bob += dt;
    var prevX = this.group.position.x;
    this.group.position.x = lerp(this.group.position.x, this.targetX, 1 - Math.exp(-C.laneLerp * dt));
    var vx = (this.group.position.x - prevX) / Math.max(dt, 0.0001);
    this.group.rotation.z = lerp(this.group.rotation.z, ND.clamp(-vx * 0.045, -0.5, 0.5), 0.18);
    this.group.rotation.y = lerp(this.group.rotation.y, ND.clamp(vx * 0.02, -0.22, 0.22), 0.12);

    if (!this.grounded) {
      this.vy -= C.gravity * dt;
      this.offsetY += this.vy * dt;
      if (this.offsetY <= 0) {
        this.offsetY = 0;
        this.vy = 0;
        this.grounded = true;
      }
    }
    if (this.sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.sliding = false;
    }

    var baseY = C.playerBaseY + (this.sliding ? -0.34 : 0);
    this.group.position.y = baseY + this.offsetY + Math.sin(this.bob * 4.2) * 0.045;
    this.group.scale.y = this.sliding ? 0.62 : 1;

    if (this.invuln > 0) {
      this.invuln -= dt;
      this.group.visible = (Math.floor(this.invuln * 14) % 2 === 0);
    } else {
      this.group.visible = true;
    }

    var boost = ND.clamp((speed - C.startSpeed) / (C.maxSpeed - C.startSpeed), 0, 1);
    for (var i = 0; i < this.engines.length; i++) {
      var e = this.engines[i];
      if (e.geometry && e.geometry.type === 'PlaneGeometry') {
        e.scale.y = 0.65 + boost * 0.9 + Math.sin(this.bob * 22) * 0.08;
        e.material.opacity = 0.35 + boost * 0.3;
      } else {
        e.scale.setScalar(0.9 + boost * 0.25);
      }
    }
    this.glow.material.opacity = 0.3 + boost * 0.25;
  };
})(window);
