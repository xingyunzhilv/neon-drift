using UnityEngine;

namespace NeonDrift
{
    /// <summary>
    /// 数据驱动配置。可在 Project 面板右键 Create > Neon Drift > Game Config 生成资源，
    /// 命名为 NeonDriftConfig 并放在任意 Resources 目录下即可被游戏自动读取；
    /// 未创建时代码使用字段默认值，保证零配置也能直接运行。
    /// </summary>
    [CreateAssetMenu(fileName = "NeonDriftConfig", menuName = "Neon Drift/Game Config")]
    public class GameConfig : ScriptableObject
    {
        [Header("赛道")]
        public float laneWidth = 2.7f;
        public int laneCount = 3;
        public float segmentLength = 24f;
        public int segmentCount = 16;
        public float groundLength = 420f;

        [Header("速度")]
        public float startSpeed = 22f;
        public float maxSpeed = 48f;
        public float speedRamp = 0.42f;

        [Header("玩家")]
        public float jumpVelocity = 11.2f;
        public float gravity = 30f;
        public float slideDuration = 0.70f;
        public float laneLerp = 14f;
        public float playerBaseY = 0.85f;
        public float playerHeight = 1.15f;
        public float slideHeight = 0.55f;
        public float playerHalfWidth = 0.62f;
        public float hitZ = 1.15f;

        [Header("生成")]
        public float spawnAhead = 190f;
        public float despawnBehind = 14f;
        public float baseSpawnGap = 15f;
        public float minSpawnGap = 10f;
        public float difficultyDistance = 1400f;

        [Header("规则")]
        public int maxShield = 3;
        public float invulnerable = 1.25f;
        public float pickupScore = 60f;
        public float comboWindow = 2.4f;
        public float comboStep = 0.25f;
        public float maxComboMultiplier = 4f;
        public float dtClamp = 0.05f;

        [Header("相机")]
        public float cameraHeight = 4.0f;
        public float cameraBack = 9.2f;
        public float cameraLag = 6.5f;

        /// <summary>按轨道索引求世界 X 坐标，轨道数可配置。</summary>
        public float LaneX(int index)
        {
            return (index - (laneCount - 1) * 0.5f) * laneWidth;
        }

        public static GameConfig CreateDefault()
        {
            return CreateInstance<GameConfig>();
        }
    }
}
