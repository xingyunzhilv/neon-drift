/* 世界与美术资源
 * 场景全部由代码程序化生成：没有任何外部模型 / 贴图 / 音频资源。
 * 地面网格用自写 GLSL 着色器绘制，滚动由 uScroll 驱动，不移动几何体。
 */
(function (global) {
  'use strict';
  var ND = global.ND = global.ND || {};
  var C = ND.CONFIG, COL = ND.COLORS;

  /* ---------- 共享资源工厂 ---------- */
  ND.Assets = {
    ready: false,
    init: function () {
      if (this.ready) return;
      this.geo = {
        block:   new THREE.BoxGeometry(1.9, 1.35, 1.6),
        blockEdge: new THREE.EdgesGeometry(new THREE.BoxGeometry(1.9, 1.35, 1.6)),
        beam:    new THREE.BoxGeometry(2.35, 0.48, 0.62),
        post:    new THREE.BoxGeometry(0.15, 1.45, 0.15),
        crystal: new THREE.OctahedronGeometry(0.46, 0),
        ring:    new THREE.TorusGeometry(0.72, 0.035, 6, 24),
        halo:    new THREE.RingGeometry(0.35, 0.9, 24),
        pillar:  new THREE.BoxGeometry(0.14, 3.6, 0.14),
        rail:    new THREE.BoxGeometry(0.09, 0.09, C.segmentLength),
        cap:     new THREE.BoxGeometry(0.34, 0.12, 0.34)
      };
      this.mat = {
        block: new THREE.MeshStandardMaterial({ color: 0x2a0a16, emissive: 0xff2d55, emissiveIntensity: 0.75, metalness: 0.45, roughness: 0.3 }),
        blockLine: new THREE.LineBasicMaterial({ color: 0xffc0cf, transparent: true, opacity: 0.9 }),
        gate: new THREE.MeshStandardMaterial({ color: 0x3a1c00, emissive: 0xff8a1f, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.35 }),
        crystal: new THREE.MeshStandardMaterial({ color: 0x083b3a, emissive: COL.pickup, emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.15 }),
        ring: new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }),
        pillarA: new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.72 }),
        pillarB: new THREE.MeshBasicMaterial({ color: COL.purple, transparent: true, opacity: 0.72 }),
        rail: new THREE.MeshBasicMaterial({ color: COL.purple, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
        cap: new THREE.MeshBasicMaterial({ color: COL.pink, blending: THREE.AdditiveBlending, depthWrite: false })
      };
      this.glowTexture = makeGlowTexture();
      this.ready = true;
    },

    /* 地面障碍：需要变轨或跃升 */
    makeBlock: function () {
      this.init();
      var g = new THREE.Group();
      var body = new THREE.Mesh(this.geo.block, this.mat.block);
      body.position.y = 0.675;
      g.add(body);
      var edge = new THREE.LineSegments(this.geo.blockEdge, this.mat.blockLine);
      edge.position.y = 0.675;
      g.add(edge);
      var halo = new THREE.Mesh(this.geo.halo,
        new THREE.MeshBasicMaterial({ color: 0xff5470, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.02;
      halo.scale.set(1.5, 1.5, 1);
      g.add(halo);
      g.userData.halo = halo;
      return g;
    },

    /* 高空横梁：需要下沉 */
    makeGate: function () {
      this.init();
      var g = new THREE.Group();
      var beam = new THREE.Mesh(this.geo.beam, this.mat.gate);
      beam.position.y = 1.45;
      g.add(beam);
      for (var s = -1; s <= 1; s += 2) {
        var p = new THREE.Mesh(this.geo.post, this.mat.gate);
        p.position.set(s * 1.16, 0.72, 0);
        g.add(p);
      }
      return g;
    },

    /* 能量晶体 */
    makePickup: function () {
      this.init();
      var g = new THREE.Group();
      var core = new THREE.Mesh(this.geo.crystal, this.mat.crystal);
      g.add(core);
      var ring = new THREE.Mesh(this.geo.ring, this.mat.ring);
      g.add(ring);
      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTexture, color: COL.pickup, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55
      }));
      sprite.scale.set(2.6, 2.6, 1);
      g.add(sprite);
      g.userData.core = core;
      g.userData.ring = ring;
      return g;
    },

    /* 粒子爆点（拾取 / 碰撞共用） */
    makeBurst: function () {
      this.init();
      var n = 14;
      var pos = new Float32Array(n * 3);
      var vel = [];
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, r = ND.rand(2.5, 7.5);
        vel.push(new THREE.Vector3(Math.cos(a) * r, ND.rand(1.0, 6.0), Math.sin(a) * r));
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var mat = new THREE.PointsMaterial({
        color: COL.cyan, size: 0.28, transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
      });
      var pts = new THREE.Points(geo, mat);
      var g = new THREE.Group();
      g.add(pts);
      g.userData.points = pts;
      g.userData.vel = vel;
      g.userData.life = 0;
      g.userData.maxLife = 0.55;
      return g;
    }
  };

  function makeGlowTexture() {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    var ctx = cv.getContext('2d');
    var gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  }

  /* ---------- 地面网格着色器 ---------- */
  var VERT = [
    'varying vec3 vWorld;',
    'void main() {',
    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
    '  vWorld = wp.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}'
  ].join('\n');

  var FRAG = [
    'uniform float uScroll;',
    'uniform float uTime;',
    'uniform vec3 uCyan;',
    'uniform vec3 uPurple;',
    'varying vec3 vWorld;',
    'float lineMask(float v, float period, float thickness) {',
    '  float f = abs(fract(v / period - 0.5) - 0.5) * period;',
    '  return 1.0 - smoothstep(0.0, thickness, f);',
    '}',
    'void main() {',
    '  float z = vWorld.z + uScroll;',
    '  float x = vWorld.x;',
    '  float gx = lineMask(x, 2.7, 0.075);',
    '  float gz = lineMask(z, 3.0, 0.055);',
    '  float grid = max(gx, gz * 0.7);',
    '  float distFade = 1.0 - smoothstep(55.0, 210.0, length(vec2(x, vWorld.z)));',
    '  float edgeFade = 1.0 - smoothstep(16.0, 38.0, abs(x));',
    '  vec3 col = mix(uPurple, uCyan, clamp((x + 14.0) / 28.0, 0.0, 1.0));',
    '  float pulse = 0.82 + 0.18 * sin(uTime * 2.2 + z * 0.09);',
    '  vec3 base = vec3(0.014, 0.019, 0.045);',
    '  float lane = 1.0 - smoothstep(4.0, 5.8, abs(x));',
    '  vec3 outc = base + vec3(0.025, 0.05, 0.10) * lane * distFade + col * grid * distFade * edgeFade * 1.25 * pulse;',
    '  gl_FragColor = vec4(outc, 1.0);',
    '}'
  ].join('\n');

  /* ---------- 世界 ---------- */
  ND.World = function (scene) {
    this.scene = scene;
    this.segments = [];
    this.scroll = 0;
    this.time = 0;
    this.total = C.segmentLength * C.segmentCount;
    this.build();
  };

  ND.World.prototype.build = function () {
    var A = ND.Assets;
    A.init();
    var scene = this.scene;
    scene.background = new THREE.Color(COL.dark);
    scene.fog = new THREE.FogExp2(COL.dark, 0.0058);

    scene.add(new THREE.AmbientLight(0x42557f, 1.15));
    var dir = new THREE.DirectionalLight(0xcbe8ff, 0.95);
    dir.position.set(6, 12, 6);
    scene.add(dir);
    var rim = new THREE.PointLight(COL.cyan, 2.2, 70);
    rim.position.set(0, 5, -4);
    scene.add(rim);
    this.rim = rim;

    /* 地面 */
    var groundGeo = new THREE.PlaneGeometry(80, C.groundLength, 1, 1);
    groundGeo.rotateX(-Math.PI / 2);
    this.gridMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uScroll: { value: 0 },
        uTime: { value: 0 },
        uCyan: { value: new THREE.Vector3(0.22, 0.96, 0.88) },
        uPurple: { value: new THREE.Vector3(0.63, 0.42, 1.0) }
      },
      side: THREE.DoubleSide
    });
    var ground = new THREE.Mesh(groundGeo, this.gridMat);
    ground.position.set(0, -0.02, -C.groundLength / 2 + 30);
    scene.add(ground);

    /* 循环护栏段 */
    for (var i = 0; i < C.segmentCount; i++) this.segments.push(this.makeSegment(i));

    /* 远景合成波太阳 */
    var sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeSunTexture(), transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    sun.position.set(0, 14, -205);
    sun.scale.set(180, 100, 1);
    scene.add(sun);

    /* 星空 */
    var count = 280, arr = new Float32Array(count * 3);
    for (var k = 0; k < count; k++) {
      arr[k * 3] = ND.rand(-90, 90);
      arr[k * 3 + 1] = ND.rand(3, 48);
      arr[k * 3 + 2] = ND.rand(-330, 20);
    }
    var starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x9fd8ff, size: 0.42, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    scene.add(this.stars);
  };

  ND.World.prototype.makeSegment = function (i) {
    var A = ND.Assets, g = new THREE.Group();
    for (var s = -1; s <= 1; s += 2) {
      var rail = new THREE.Mesh(A.geo.rail, A.mat.rail);
      rail.position.set(s * 5.7, 0.12, -C.segmentLength / 2);
      g.add(rail);
      for (var j = 0; j < 2; j++) {
        var p = new THREE.Mesh(A.geo.pillar, (i + j) % 2 ? A.mat.pillarA : A.mat.pillarB);
        p.position.set(s * 5.7, 1.8, -j * C.segmentLength / 2 - 1);
        g.add(p);
        var cap = new THREE.Mesh(A.geo.cap, A.mat.cap);
        cap.position.set(s * 5.7, 3.66, -j * C.segmentLength / 2 - 1);
        g.add(cap);
      }
    }
    g.position.z = 10 - i * C.segmentLength;
    this.scene.add(g);
    return g;
  };

  ND.World.prototype.update = function (dt, speed) {
    this.time += dt;
    this.scroll += speed * dt;
    this.gridMat.uniforms.uScroll.value = this.scroll;
    this.gridMat.uniforms.uTime.value = this.time;

    var move = speed * dt;
    for (var i = 0; i < this.segments.length; i++) {
      var seg = this.segments[i];
      seg.position.z += move;
      if (seg.position.z > 34) seg.position.z -= this.total;
    }
    var pos = this.stars.geometry.attributes.position;
    var a = pos.array;
    for (var k = 0; k < a.length; k += 3) {
      a[k + 2] += speed * 0.28 * dt;
      if (a[k + 2] > 22) a[k + 2] -= 350;
    }
    pos.needsUpdate = true;
  };

  ND.World.prototype.reset = function () {
    this.scroll = 0;
    this.gridMat.uniforms.uScroll.value = 0;
    for (var i = 0; i < this.segments.length; i++) {
      this.segments[i].position.z = 10 - i * C.segmentLength;
    }
  };

  function makeSunTexture() {
    var cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    var ctx = cv.getContext('2d');
    var gr = ctx.createRadialGradient(256, 256, 20, 256, 256, 250);
    gr.addColorStop(0, 'rgba(255,190,120,.95)');
    gr.addColorStop(0.35, 'rgba(255,90,170,.55)');
    gr.addColorStop(0.72, 'rgba(150,70,255,.18)');
    gr.addColorStop(1, 'rgba(90,40,200,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 512, 512);
    ctx.globalCompositeOperation = 'destination-out';
    for (var y = 270; y < 500; y += 26) {
      ctx.fillRect(0, y, 512, 6 + (y - 270) * 0.045);
    }
    return new THREE.CanvasTexture(cv);
  }
})(window);
