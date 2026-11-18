using UnityEngine;

namespace NeonDrift
{
    /// <summary>
    /// 零配置启动：把 Assets 拷进任意 Unity 工程，打开任意场景点 Play 就能跑。
    /// 若场景中已放置 GameManager（编辑器烘焙出的场景），则不重复创建。
    /// </summary>
    public static class GameBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
#if UNITY_2022_2_OR_NEWER
            if (UnityEngine.Object.FindFirstObjectByType<GameManager>() != null) return;
#else
            if (UnityEngine.Object.FindObjectOfType<GameManager>() != null) return;
#endif
            GameObject root = new GameObject("NeonDrift_Runtime");
            root.AddComponent<GameManager>();
        }
    }
}
