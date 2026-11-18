using System.Collections.Generic;
using UnityEngine;

namespace NeonDrift
{
    /// <summary>
    /// GameObject 对象池。障碍 / 晶体在整局中反复复用，避免 Instantiate 与 Destroy
    /// 带来的 GC 峰值。Active 列表对外只读，供生成器倒序遍历。
    /// </summary>
    public class GameObjectPool
    {
        readonly GameObject prefab;
        readonly Transform parent;
        readonly List<GameObject> active = new List<GameObject>();
        readonly Stack<GameObject> free = new Stack<GameObject>();

        public GameObjectPool(GameObject prefab, Transform parent, int prewarm = 0)
        {
            this.prefab = prefab;
            this.parent = parent;
            for (int i = 0; i < prewarm; i++)
            {
                GameObject go = InstantiateNew();
                go.SetActive(false);
                free.Push(go);
            }
        }

        GameObject InstantiateNew()
        {
            GameObject go = Object.Instantiate(prefab, parent);
            go.name = prefab.name + "_Pooled";
            return go;
        }

        public GameObject Acquire()
        {
            GameObject go = free.Count > 0 ? free.Pop() : InstantiateNew();
            go.SetActive(true);
            active.Add(go);
            return go;
        }

        public void Release(GameObject go)
        {
            if (go == null) return;
            active.Remove(go);
            go.SetActive(false);
            free.Push(go);
        }

        public void ReleaseAll()
        {
            while (active.Count > 0) Release(active[0]);
        }

        public List<GameObject> Active { get { return active; } }
        public int ActiveCount { get { return active.Count; } }
    }
}
