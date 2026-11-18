using NeonDrift;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

/// <summary>
/// 编辑器工具：把运行时程序化生成的环境烘焙成一个可保存、可在 Scene 视图查看的 .unity 场景，
/// 并把内存材质持久化为 .mat 资源，避免场景序列化时材质引用丢失。
/// 菜单：Tools > Neon Drift > Bake Environment Scene
/// </summary>
public static class SceneBuilder
{
    const string ScenePath = "Assets/Scenes/NeonDrift.unity";

    [MenuItem("Tools/Neon Drift/Bake Environment Scene")]
    public static void Bake()
    {
        if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
            AssetDatabase.CreateFolder("Assets", "Scenes");

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        GameConfig cfg = GameConfig.CreateDefault();

        WorldBuilder.ClearMaterialCache();
        WorldRefs refs = WorldBuilder.BuildEnvironment(cfg);
        WorldBuilder.PersistMaterials();

        GameObject manager = new GameObject("NeonDrift_GameManager");
        manager.AddComponent<GameManager>();

        EditorSceneManager.SaveScene(scene, ScenePath);
        AssetDatabase.Refresh();
        Selection.activeGameObject = manager;
        Debug.Log("Neon Drift: 场景已烘焙到 " + ScenePath +
                  "（环境 " + (refs.segments == null ? 0 : refs.segments.Length) +
                  " 段），点 Play 即可运行。");
    }
}
