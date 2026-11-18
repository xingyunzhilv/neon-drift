using UnityEngine;

namespace NeonDrift
{
    /// <summary>玩家的简化碰撞盒，规避 UnityEngine.Bounds 命名冲突。</summary>
    public struct HitBox
    {
        public float minY;
        public float maxY;
        public float x;
        public float halfWidth;
    }

    /// <summary>
    /// 三轨道移动 + 跃升 / 下沉状态机。所有运动按 deltaTime 积分，
    /// 横向用指数插值，保证 30 / 60 / 144 Hz 下手感一致。
    /// </summary>
    public class PlayerController : MonoBehaviour
    {
        GameConfig cfg;
        GameManager gm;
        GameObject visual;

        int lane;
        float targetX;
        float offsetY;
        float vy;
        float slideTimer;
        float bob;
        float roll;
        bool grounded;
        bool sliding;

        public int Lane { get { return lane; } }
        public float Invulnerable { get; private set; }
        public bool Sliding { get { return sliding; } }

        public void Setup(GameConfig config, GameManager manager, GameObject shipVisual)
        {
            cfg = config;
            gm = manager;
            visual = shipVisual;
            ResetState();
        }

        public void ResetState()
        {
            lane = cfg.laneCount / 2;
            targetX = cfg.LaneX(lane);
            transform.position = new Vector3(targetX, cfg.playerBaseY, 0f);
            transform.rotation = Quaternion.identity;
            transform.localScale = Vector3.one;
            offsetY = 0f;
            vy = 0f;
            bob = 0f;
            roll = 0f;
            grounded = true;
            sliding = false;
            slideTimer = 0f;
            Invulnerable = 0f;
            gameObject.SetActive(true);
            if (visual != null) visual.SetActive(true);
        }

        public void Tick(float dt, float speed, bool allowInput)
        {
            if (allowInput) HandleInput();

            bob += dt;
            float prevX = transform.position.x;
            float nx = Mathf.Lerp(prevX, targetX, 1f - Mathf.Exp(-cfg.laneLerp * dt));
            float vx = (nx - prevX) / Mathf.Max(dt, 0.0001f);
            roll = Mathf.Lerp(roll, Mathf.Clamp(-vx * 2.6f, -28f, 28f), 0.18f);

            if (!grounded)
            {
                vy -= cfg.gravity * dt;
                offsetY += vy * dt;
                if (offsetY <= 0f) { offsetY = 0f; vy = 0f; grounded = true; }
            }
            if (sliding)
            {
                slideTimer -= dt;
                if (slideTimer <= 0f) sliding = false;
            }

            float baseY = cfg.playerBaseY + (sliding ? -0.34f : 0f);
            Vector3 p = transform.position;
            p.x = nx;
            p.y = baseY + offsetY + Mathf.Sin(bob * 4.2f) * 0.045f;
            transform.position = p;
            transform.rotation = Quaternion.Euler(0f, 0f, roll);
            transform.localScale = new Vector3(1f, sliding ? 0.62f : 1f, 1f);

            if (Invulnerable > 0f)
            {
                Invulnerable -= dt;
                if (visual != null) visual.SetActive(Mathf.FloorToInt(Invulnerable * 14f) % 2 == 0);
            }
            else if (visual != null) visual.SetActive(true);
        }

        void HandleInput()
        {
            if (NDInput.Down(KeyCode.A) || NDInput.Down(KeyCode.LeftArrow) || NDInput.Swipe == NDInput.SwipeLeft) Move(-1);
            if (NDInput.Down(KeyCode.D) || NDInput.Down(KeyCode.RightArrow) || NDInput.Swipe == NDInput.SwipeRight) Move(1);
            if (NDInput.Down(KeyCode.W) || NDInput.Down(KeyCode.UpArrow) || NDInput.Down(KeyCode.Space) || NDInput.Swipe == NDInput.SwipeUp) Jump();
            if (NDInput.Down(KeyCode.S) || NDInput.Down(KeyCode.DownArrow) || NDInput.Swipe == NDInput.SwipeDown) Slide();
        }

        public bool Move(int dir)
        {
            int next = Mathf.Clamp(lane + dir, 0, cfg.laneCount - 1);
            if (next == lane) return false;
            lane = next;
            targetX = cfg.LaneX(lane);
            return true;
        }

        public bool Jump()
        {
            if (!grounded || sliding) return false;
            vy = cfg.jumpVelocity;
            grounded = false;
            return true;
        }

        public bool Slide()
        {
            if (sliding || !grounded) return false;
            sliding = true;
            slideTimer = cfg.slideDuration;
            return true;
        }

        public void Hit() { Invulnerable = cfg.invulnerable; }

        public HitBox GetHitBox()
        {
            float h = sliding ? cfg.slideHeight : cfg.playerHeight;
            float cy = transform.position.y;
            HitBox b;
            b.minY = cy - h * 0.5f;
            b.maxY = cy + h * 0.5f;
            b.x = transform.position.x;
            b.halfWidth = cfg.playerHalfWidth;
            return b;
        }
    }
}
