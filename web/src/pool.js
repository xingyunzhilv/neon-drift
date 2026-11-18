/* 泛型对象池
 * 障碍、晶体、粒子在整局游戏中反复复用，避免运行时 new / GC 造成的帧率抖动。
 * active 用「交换删除」保持 O(1) 回收。
 */
(function (global) {
  'use strict';
  var ND = global.ND = global.ND || {};

  ND.Pool = function (factory) {
    this.factory = factory;
    this.free = [];
    this.active = [];
  };

  ND.Pool.prototype.acquire = function (parent) {
    var obj = this.free.length ? this.free.pop() : this.factory();
    obj.visible = true;
    if (parent) parent.add(obj);
    this.active.push(obj);
    return obj;
  };

  ND.Pool.prototype.release = function (obj) {
    var i = this.active.indexOf(obj);
    if (i !== -1) {
      this.active[i] = this.active[this.active.length - 1];
      this.active.pop();
    }
    obj.visible = false;
    if (obj.parent) obj.parent.remove(obj);
    if (this.free.indexOf(obj) === -1) this.free.push(obj);
  };

  ND.Pool.prototype.releaseAll = function () {
    while (this.active.length) this.release(this.active[0]);
  };

  ND.Pool.prototype.forEach = function (fn) {
    for (var i = 0; i < this.active.length; i++) fn(this.active[i]);
  };
})(window);
