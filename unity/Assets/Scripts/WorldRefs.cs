using UnityEngine;

namespace NeonDrift
{
    /// <summary>
    /// 场景引用持有者。运行时自动搭建，或由编辑器菜单烘焙进 .unity 场景；
    /// GameManager 通过它复用已有环境，避免重复生成（依赖注入，而非全局单例查找）。
    /// </summary>
    public class WorldRefs : MonoBehaviour
    {
        public Material gridMaterial;
        public Transform[] segments;
        public Camera worldCamera;
        public Light keyLight;

        [HideInInspector] public float scroll;
        [HideInInspector] public float time;
        [HideInInspector] public float segmentLength;
        [HideInInspector] public float totalLength;
    }
}
