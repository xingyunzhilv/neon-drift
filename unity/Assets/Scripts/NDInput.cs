using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace NeonDrift
{
    /// <summary>
    /// 输入适配层：同时兼容旧 Input Manager 与新 Input System，
    /// 并把键盘 / 鼠标拖拽 / 触屏滑动归一成四种动作，平台差异不泄漏到玩法代码。
    /// 每帧由 GameManager 调用 Poll() 统一采样。
    /// </summary>
    public static class NDInput
    {
        static Vector2 pointerStart;
        static bool dragging;
        static int swipe;
        static bool click;

        public const int SwipeLeft = -1;
        public const int SwipeRight = 1;
        public const int SwipeUp = 2;
        public const int SwipeDown = -2;

        public static void Poll()
        {
            swipe = 0;
            click = false;
#if ENABLE_INPUT_SYSTEM
            Mouse mouse = Mouse.current;
            if (mouse != null)
            {
                Vector2 p = mouse.position.ReadValue();
                if (mouse.leftButton.wasPressedThisFrame) { pointerStart = p; dragging = true; }
                if (mouse.leftButton.wasReleasedThisFrame && dragging)
                {
                    Resolve(p - pointerStart);
                    dragging = false;
                }
            }
            Touchscreen ts = Touchscreen.current;
            if (ts != null)
            {
                var t = ts.primaryTouch;
                Vector2 p = t.position.ReadValue();
                if (t.press.wasPressedThisFrame) { pointerStart = p; dragging = true; }
                if (t.press.wasReleasedThisFrame && dragging)
                {
                    Resolve(p - pointerStart);
                    dragging = false;
                }
            }
#else
            if (Input.GetMouseButtonDown(0)) { pointerStart = Input.mousePosition; dragging = true; }
            if (Input.GetMouseButtonUp(0) && dragging)
            {
                Resolve((Vector2)Input.mousePosition - pointerStart);
                dragging = false;
            }
            if (Input.touchCount > 0)
            {
                Touch t = Input.GetTouch(0);
                if (t.phase == TouchPhase.Began) { pointerStart = t.position; dragging = true; }
                if (t.phase == TouchPhase.Ended && dragging)
                {
                    Resolve(t.position - pointerStart);
                    dragging = false;
                }
            }
#endif
        }

        static void Resolve(Vector2 d)
        {
            if (d.magnitude < 24f) { click = true; return; }
            swipe = Mathf.Abs(d.x) > Mathf.Abs(d.y)
                ? (d.x > 0 ? SwipeRight : SwipeLeft)
                : (d.y > 0 ? SwipeUp : SwipeDown);
        }

        public static int Swipe { get { return swipe; } }
        public static bool Click { get { return click; } }

        public static bool Down(KeyCode code)
        {
#if ENABLE_INPUT_SYSTEM
            Keyboard kb = Keyboard.current;
            if (kb == null) return false;
            switch (code)
            {
                case KeyCode.A: return kb.aKey.wasPressedThisFrame;
                case KeyCode.D: return kb.dKey.wasPressedThisFrame;
                case KeyCode.W: return kb.wKey.wasPressedThisFrame;
                case KeyCode.S: return kb.sKey.wasPressedThisFrame;
                case KeyCode.LeftArrow: return kb.leftArrowKey.wasPressedThisFrame;
                case KeyCode.RightArrow: return kb.rightArrowKey.wasPressedThisFrame;
                case KeyCode.UpArrow: return kb.upArrowKey.wasPressedThisFrame;
                case KeyCode.DownArrow: return kb.downArrowKey.wasPressedThisFrame;
                case KeyCode.Space: return kb.spaceKey.wasPressedThisFrame;
                case KeyCode.P: return kb.pKey.wasPressedThisFrame;
                case KeyCode.R: return kb.rKey.wasPressedThisFrame;
                case KeyCode.Return: return kb.enterKey.wasPressedThisFrame;
                case KeyCode.Escape: return kb.escapeKey.wasPressedThisFrame;
                default: return false;
            }
#else
            return Input.GetKeyDown(code);
#endif
        }
    }
}
