using System.Collections.Generic;
using UnityEngine;

namespace NeonDrift
{
    class ItemData
    {
        public string kind;      // "block" | "gate" | "pickup"
        public int lane;
        public float prevZ;
        public float phase;
    }

    /// <summary>
    /// 程序化赛道：按「行进距离」而非时间生成障碍，保证不同速度下间距一致；
    /// 生成时始终留出至少一条安全轨道，并把晶体放在这条路径上（可解性保证）。
    /// 碰撞用跨过 z=0 平面的扫掠判定，高帧速 / 高速度下都不会漏判。
    /// </summary>
    public class TrackGenerator : MonoBehaviour
    {
        GameConfig cfg;
        GameManager gm;
        PlayerController player;

        GameObjectPool blocks;
        GameObjectPool gates;
        GameObjectPool pickups;
        readonly Dictionary<GameObject, ItemData> meta = new Dictionary<GameObject, ItemData>();
        float spawnAccum;

        public void Setup(GameConfig config, GameManager manager, PlayerController controller)
        {
            cfg = config;
            gm = manager;
            player = controller;

            GameObject blockTpl = WorldBuilder.CreateBlockTemplate();
            blockTpl.transform.SetParent(transform, false);
            GameObject gateTpl = WorldBuilder.CreateGateTemplate();
            gateTpl.transform.SetParent(transform, false);
            GameObject pickupTpl = WorldBuilder.CreatePickupTemplate();
            pickupTpl.transform.SetParent(transform, false);

            blocks = new GameObjectPool(blockTpl, transform, 8);
            gates = new GameObjectPool(gateTpl, transform, 6);
            pickups = new GameObjectPool(pickupTpl, transform, 10);
        }

        public void ResetState()
        {
            if (blocks != null) blocks.ReleaseAll();
            if (gates != null) gates.ReleaseAll();
            if (pickups != null) pickups.ReleaseAll();
            meta.Clear();
            spawnAccum = 0f;
        }

        public int ActiveCount
        {
            get
            {
                if (blocks == null) return 0;
                return blocks.ActiveCount + gates.ActiveCount + pickups.ActiveCount;
            }
        }

        public void Tick(float dt, float speed, float move)
        {
            spawnAccum += move;
            float gap = Mathf.Lerp(cfg.baseSpawnGap, cfg.minSpawnGap, gm.Difficulty);
            if (spawnAccum >= gap)
            {
                spawnAccum -= gap;
                SpawnRow(-cfg.spawnAhead + spawnAccum);
            }
            MovePool(blocks, dt, move);
            MovePool(gates, dt, move);
            MovePool(pickups, dt, move);
        }

        void SpawnRow(float z)
        {
            List<int> lanes = new List<int>();
            for (int i = 0; i < cfg.laneCount; i++) lanes.Add(i);
            for (int i = lanes.Count - 1; i > 0; i--)
            {
                int j = Random.Range(0, i + 1);
                int tmp = lanes[i]; lanes[i] = lanes[j]; lanes[j] = tmp;
            }

            int count = Random.value < (0.16f + 0.48f * gm.Difficulty) ? 2 : 1;
            count = Mathf.Min(count, cfg.laneCount - 1);

            for (int i = 0; i < count; i++)
            {
                int lane = lanes[i];
                bool isGate = Random.value < 0.42f;
                GameObjectPool pool = isGate ? gates : blocks;
                GameObject go = pool.Acquire();
                Vector3 p = new Vector3(cfg.LaneX(lane), 0f, z + Random.Range(-1.4f, 1.4f));
                go.transform.position = p;
                go.transform.localScale = Vector3.one;
                meta[go] = new ItemData
                {
                    kind = isGate ? "gate" : "block",
                    lane = lane,
                    prevZ = p.z,
                    phase = Random.value * 6.28f
                };
            }

            int freeLane = lanes[Random.Range(count, lanes.Count)];
            int chain = Random.value < 0.35f ? 3 : 1;
            for (int k = 0; k < chain; k++) SpawnPickup(freeLane, z - 1.5f - k * 3.2f);
        }

        void SpawnPickup(int lane, float z)
        {
            GameObject go = pickups.Acquire();
            Vector3 p = new Vector3(cfg.LaneX(lane), 1.05f, z);
            go.transform.position = p;
            go.transform.localScale = Vector3.one;
            meta[go] = new ItemData
            {
                kind = "pickup", lane = lane, prevZ = z, phase = Random.value * 6.28f
            };
        }

        void MovePool(GameObjectPool pool, float dt, float move)
        {
            List<GameObject> arr = pool.Active;
            for (int i = arr.Count - 1; i >= 0; i--)
            {
                GameObject go = arr[i];
                ItemData d;
                if (!meta.TryGetValue(go, out d)) continue;

                Vector3 p = go.transform.position;
                d.prevZ = p.z;
                p.z += move;
                go.transform.position = p;

                if (d.kind == "pickup")
                {
                    go.transform.Rotate(0f, 150f * dt, 0f, Space.Self);
                    p = go.transform.position;
                    p.y = 1.05f + Mathf.Sin(Time.time * 3f + d.phase) * 0.16f;
                    go.transform.position = p;
                }
                else
                {
                    float s = 1f + Mathf.Sin(Time.time * 5f + d.phase) * 0.035f;
                    go.transform.localScale = new Vector3(s, 1f, s);
                }

                if (d.prevZ < 0f && p.z >= 0f) ResolvePass(go, d);
                if (p.z > cfg.despawnBehind) pool.Release(go);
            }
        }

        void ResolvePass(GameObject go, ItemData d)
        {
            HitBox b = player.GetHitBox();
            float dx = Mathf.Abs(go.transform.position.x - b.x);

            if (d.kind == "pickup")
            {
                if (dx < b.halfWidth + 0.8f && Mathf.Abs(player.transform.position.y - go.transform.position.y) < 1.4f)
                {
                    gm.Collect(go.transform.position);
                    pickups.Release(go);
                }
                return;
            }

            if (player.Invulnerable > 0f || gm.State != GameState.Playing) return;
            float oyMin = d.kind == "block" ? 0f : 1.21f;
            float oyMax = d.kind == "block" ? 1.35f : 1.69f;
            float hw = d.kind == "block" ? 0.95f : 1.15f;
            if (dx < b.halfWidth + hw && b.maxY > oyMin && b.minY < oyMax)
                gm.Damage(go.transform.position);
        }
    }
}
