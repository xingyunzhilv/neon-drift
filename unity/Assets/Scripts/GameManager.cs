using UnityEngine;

namespace NeonDrift
{
    public enum GameState { Ready, Playing, Paused, Over }

    /// <summary>
    /// 单一入口：装配所有子系统、持有游戏状态机、计分 / 连击 / 护盾规则。
    /// 子系统之间通过构造参数注入依赖，不使用全局单例。
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public GameState State { get; private set; }
        public float Difficulty { get { return Mathf.Clamp01(distance / cfg.difficultyDistance); } }
        public float Speed { get { return speed; } }

        GameConfig cfg;
        WorldRefs refs;
        PlayerController player;
        TrackGenerator track;
        HUD hud;
        CameraRig rig;

        float elapsed, speed, distance, score, comboTimer;
        int combo, maxCombo, shield, best;

        static T FindAny<T>() where T : UnityEngine.Object
        {
#if UNITY_2022_2_OR_NEWER
            return UnityEngine.Object.FindFirstObjectByType<T>();
#else
            return UnityEngine.Object.FindObjectOfType<T>();
#endif
        }

        void Awake() { Initialize(); }

        void Initialize()
        {
            cfg = Resources.Load<GameConfig>("NeonDriftConfig");
            if (cfg == null) cfg = GameConfig.CreateDefault();

            // 若编辑器已烘焙出场景，复用其中的环境；否则运行时程序化搭建。
            refs = FindAny<WorldRefs>();
            if (refs == null) refs = WorldBuilder.BuildEnvironment(cfg);

            GameObject playerGo = new GameObject("Player");
            playerGo.transform.position = new Vector3(0f, cfg.playerBaseY, 0f);
            GameObject visual = WorldBuilder.CreateShip();
            visual.transform.SetParent(playerGo.transform, false);
            player = playerGo.AddComponent<PlayerController>();
            player.Setup(cfg, this, visual);

            if (refs.worldCamera == null)
            {
                Debug.LogWarning("NeonDrift: 场景中缺少 Main Camera，已自动补建。");
                GameObject cg = new GameObject("Main Camera");
                cg.tag = "MainCamera";
                refs.worldCamera = cg.AddComponent<Camera>();
            }
            rig = refs.worldCamera.GetComponent<CameraRig>();
            if (rig == null) rig = refs.worldCamera.gameObject.AddComponent<CameraRig>();
            rig.Setup(cfg, playerGo.transform);

            GameObject hudGo = new GameObject("HUD");
            hud = hudGo.AddComponent<HUD>();
            hud.Build(cfg);

            GameObject trackGo = new GameObject("Track Generator");
            track = trackGo.AddComponent<TrackGenerator>();
            track.Setup(cfg, this, player);

            best = PlayerPrefs.GetInt("NeonDrift_Best", 0);
            ResetRun();
            State = GameState.Ready;
            hud.ShowState(State, 0f, 0f, 0, best);
        }

        void ResetRun()
        {
            elapsed = 0f;
            speed = cfg.startSpeed;
            distance = 0f;
            score = 0f;
            combo = 0;
            maxCombo = 0;
            comboTimer = 0f;
            shield = cfg.maxShield;
            if (track != null) track.ResetState();
            if (player != null) player.ResetState();
            WorldBuilder.Reset(refs);
            if (rig != null) { rig.shake = 0f; rig.speed = speed; }
            if (hud != null) hud.UpdateValues(0f, 0f, speed, 0, 1f, shield);
        }

        void StartRun()
        {
            ResetRun();
            State = GameState.Playing;
            hud.ShowState(State, 0f, 0f, 0, best);
        }

        void TogglePause()
        {
            if (State == GameState.Playing)
            {
                State = GameState.Paused;
                hud.ShowState(State, score, distance, maxCombo, best);
            }
            else if (State == GameState.Paused)
            {
                State = GameState.Playing;
                hud.ShowState(State, score, distance, maxCombo, best);
            }
        }

        void Update()
        {
            NDInput.Poll();

            if (NDInput.Down(KeyCode.R)) { StartRun(); return; }
            if (NDInput.Down(KeyCode.P) || NDInput.Down(KeyCode.Escape)) { TogglePause(); return; }

            if (State == GameState.Ready || State == GameState.Over)
            {
                if (NDInput.Down(KeyCode.Return) || NDInput.Down(KeyCode.Space) || NDInput.Click)
                {
                    StartRun();
                    return;
                }
                float idleDt = Mathf.Min(Time.deltaTime, cfg.dtClamp);
                WorldBuilder.Animate(refs, idleDt, 9f);
                player.Tick(idleDt, 9f, false);
                rig.speed = 9f;
                return;
            }
            if (State == GameState.Paused) return;

            float dt = Mathf.Min(Time.deltaTime, cfg.dtClamp);
            elapsed += dt;
            speed = Mathf.Min(cfg.maxSpeed, cfg.startSpeed + cfg.speedRamp * elapsed);
            float move = speed * dt;
            distance += move;
            rig.speed = speed;

            WorldBuilder.Animate(refs, dt, speed);
            player.Tick(dt, speed, true);
            track.Tick(dt, speed, move);   // Damage 内部可能把状态切到 Over

            score += move * 2f * Multiplier();
            if (comboTimer > 0f)
            {
                comboTimer -= dt;
                if (comboTimer <= 0f) combo = 0;
            }
            hud.UpdateValues(score, distance, speed, combo, Multiplier(), shield);
        }

        public float Multiplier()
        {
            return Mathf.Min(1f + combo * cfg.comboStep, cfg.maxComboMultiplier);
        }

        public void Collect(Vector3 pos)
        {
            combo++;
            maxCombo = Mathf.Max(maxCombo, combo);
            comboTimer = cfg.comboWindow;
            score += cfg.pickupScore * Multiplier();
            WorldBuilder.SpawnBurst(pos, WorldBuilder.Cyan);
        }

        public void Damage(Vector3 pos)
        {
            if (State != GameState.Playing) return;
            shield--;
            combo = 0;
            comboTimer = 0f;
            player.Hit();
            rig.shake = 0.75f;
            WorldBuilder.SpawnBurst(pos, WorldBuilder.Danger);
            if (shield <= 0) GameOver();
        }

        void GameOver()
        {
            State = GameState.Over;
            best = Mathf.Max(best, Mathf.FloorToInt(score));
            PlayerPrefs.SetInt("NeonDrift_Best", best);
            PlayerPrefs.Save();
            WorldBuilder.SpawnBurst(player.transform.position, WorldBuilder.Pink);
            player.gameObject.SetActive(false);
            hud.ShowState(State, score, distance, maxCombo, best);
        }
    }
}
