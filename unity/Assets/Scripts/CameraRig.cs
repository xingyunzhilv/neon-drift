using UnityEngine;

namespace NeonDrift
{
    /// <summary>
    /// 第三人称阻尼跟随：X 轴指数插值、速度感 FOV、受击抖动。
    /// 放在 LateUpdate，确保跟随的是本帧玩家最终位置。
    /// </summary>
    public class CameraRig : MonoBehaviour
    {
        public Transform target;
        public GameConfig cfg;
        public float shake;
        public float speed;

        Camera cam;

        void Awake() { cam = GetComponent<Camera>(); }

        public void Setup(GameConfig config, Transform followTarget)
        {
            cfg = config;
            target = followTarget;
            shake = 0f;
            speed = cfg.startSpeed;
        }

        void LateUpdate()
        {
            if (cfg == null || target == null) return;
            float dt = Time.deltaTime;

            Vector3 p = transform.position;
            p.x = Mathf.Lerp(p.x, target.position.x * 0.35f, 1f - Mathf.Exp(-cfg.cameraLag * dt));
            p.y = cfg.cameraHeight + Mathf.Sin(Time.time * 62f) * shake * 0.24f;
            p.z = cfg.cameraBack + Mathf.Sin(Time.time * 78f) * shake * 0.16f;
            transform.position = p;
            transform.LookAt(new Vector3(target.position.x * 0.22f, 1.15f, -14f));

            if (cam != null)
            {
                float boost = Mathf.Clamp01((speed - cfg.startSpeed) / (cfg.maxSpeed - cfg.startSpeed));
                float fov = 68f + boost * 9f - shake * 3f;
                if (Mathf.Abs(fov - cam.fieldOfView) > 0.08f) cam.fieldOfView = fov;
            }
            shake = Mathf.Max(0f, shake - dt * 2.4f);
        }
    }
}
