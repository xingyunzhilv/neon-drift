using UnityEngine;
using UnityEngine.UI;

namespace NeonDrift
{
    /// <summary>
    /// 运行时构建完整 UGUI：不依赖预制体、不依赖 TextMeshPro、不依赖 EventSystem。
    /// 交互统一走键盘 / 点击（由 GameManager 采样），避免 UI 输入模块的版本差异。
    /// </summary>
    public class HUD : MonoBehaviour
    {
        Font font;
        Text scoreText, distanceText, speedText, comboText;
        Text titleText, subtitleText, hintText, bestText, footerText;
        Image[] shields;
        GameObject centerPanel;

        static Font GetFont()
        {
            Font f = null;
            try { f = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); }
            catch (System.Exception) { }
            if (f == null)
            {
                try { f = Resources.GetBuiltinResource<Font>("Arial.ttf"); }
                catch (System.Exception) { }
            }
            if (f == null) Debug.LogWarning("NeonDrift: 未找到内置字体，HUD 文字可能不显示。");
            return f;
        }

        Text MakeText(Transform parent, string name, Vector2 anchor, Vector2 pivot,
                      Vector2 pos, Vector2 size, int fontSize, Color color, TextAnchor align)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent, false);
            Text t = go.AddComponent<Text>();
            t.font = font;
            t.fontSize = fontSize;
            t.color = color;
            t.alignment = align;
            t.horizontalOverflow = HorizontalWrapMode.Overflow;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false;
            RectTransform rt = t.rectTransform;
            rt.anchorMin = anchor; rt.anchorMax = anchor; rt.pivot = pivot;
            rt.anchoredPosition = pos; rt.sizeDelta = size;
            return t;
        }

        Image MakePanel(Transform parent, string name, Vector2 anchor, Vector2 pivot,
                        Vector2 pos, Vector2 size, Color color)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent, false);
            Image img = go.AddComponent<Image>();
            img.color = color;
            img.raycastTarget = false;
            RectTransform rt = img.rectTransform;
            rt.anchorMin = anchor; rt.anchorMax = anchor; rt.pivot = pivot;
            rt.anchoredPosition = pos; rt.sizeDelta = size;
            return img;
        }

        public void Build(GameConfig cfg)
        {
            font = GetFont();
            GameObject canvasGo = new GameObject("HUD Canvas");
            canvasGo.transform.SetParent(transform, false);
            Canvas canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            CanvasScaler scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280f, 720f);
            scaler.matchWidthOrHeight = 0.5f;

            Transform root = canvasGo.transform;
            Color panelBg = new Color(0.035f, 0.06f, 0.12f, 0.78f);
            Color cyan = WorldBuilder.Cyan;
            Color muted = new Color(0.50f, 0.60f, 0.72f);
            Color amber = WorldBuilder.Amber;

            Image left = MakePanel(root, "Score Panel", new Vector2(0f, 1f), new Vector2(0f, 1f),
                new Vector2(24f, -24f), new Vector2(230f, 112f), panelBg);
            MakeText(left.transform, "Label", new Vector2(0f, 1f), new Vector2(0f, 1f),
                new Vector2(16f, -14f), new Vector2(200f, 20f), 12, muted, TextAnchor.UpperLeft).text = "SCORE / 得分";
            scoreText = MakeText(left.transform, "Score", new Vector2(0f, 1f), new Vector2(0f, 1f),
                new Vector2(16f, -38f), new Vector2(200f, 46f), 34, cyan, TextAnchor.UpperLeft);
            comboText = MakeText(left.transform, "Combo", new Vector2(0f, 1f), new Vector2(0f, 1f),
                new Vector2(16f, -86f), new Vector2(200f, 22f), 14, amber, TextAnchor.UpperLeft);

            Image right = MakePanel(root, "Status Panel", new Vector2(1f, 1f), new Vector2(1f, 1f),
                new Vector2(-24f, -24f), new Vector2(230f, 148f), panelBg);
            MakeText(right.transform, "DistLabel", new Vector2(0f, 1f), new Vector2(0f, 1f),
                new Vector2(16f, -14f), new Vector2(200f, 20f), 12, muted, TextAnchor.UpperLeft).text = "DISTANCE / 距离";
            distanceText = MakeText(right.transform, "Distance", new Vector2(0f, 1f), new Vector2(0f, 1f),
                new Vector2(16f, -36f), new Vector2(200f, 28f), 22, Color.white, TextAnchor.UpperLeft);
            MakeText(right.transform, "SpeedLabel", new Vector2(0f, 1f), new Vector2(0f, 1f),
                new Vector2(16f, -70f), new Vector2(200f, 20f), 12, muted, TextAnchor.UpperLeft).text = "SPEED / 速度";
            speedText = MakeText(right.transform, "Speed", new Vector2(0f, 1f), new Vector2(0f, 1f),
                new Vector2(16f, -92f), new Vector2(200f, 28f), 22, Color.white, TextAnchor.UpperLeft);
            shields = new Image[cfg.maxShield];
            for (int i = 0; i < shields.Length; i++)
            {
                shields[i] = MakePanel(right.transform, "Shield_" + i,
                    new Vector2(1f, 0f), new Vector2(1f, 0f),
                    new Vector2(-16f - (shields.Length - 1 - i) * 32f, 14f),
                    new Vector2(26f, 8f), WorldBuilder.Pink);
            }

            Image center = MakePanel(root, "Center Panel", new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                Vector2.zero, new Vector2(620f, 270f), panelBg);
            centerPanel = center.gameObject;
            titleText = MakeText(center.transform, "Title", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f),
                new Vector2(0f, -34f), new Vector2(560f, 66f), 46, Color.white, TextAnchor.MiddleCenter);
            subtitleText = MakeText(center.transform, "Subtitle", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f),
                new Vector2(0f, -108f), new Vector2(560f, 50f), 16, muted, TextAnchor.MiddleCenter);
            hintText = MakeText(center.transform, "Hint", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f),
                new Vector2(0f, -168f), new Vector2(560f, 46f), 14, cyan, TextAnchor.MiddleCenter);
            bestText = MakeText(center.transform, "Result", new Vector2(0.5f, 0f), new Vector2(0.5f, 0f),
                new Vector2(0f, 18f), new Vector2(560f, 44f), 16, amber, TextAnchor.MiddleCenter);

            footerText = MakeText(root, "Footer", new Vector2(0.5f, 0f), new Vector2(0.5f, 0f),
                new Vector2(0f, 18f), new Vector2(900f, 30f), 12, muted, TextAnchor.MiddleCenter);
            footerText.text = "A / D 变轨　·　W / 空格 跃升　·　S 下沉　·　P 暂停　·　R 重开";
        }

        public void ShowState(GameState state, float finalScore, float finalDistance, int maxCombo, int best)
        {
            centerPanel.SetActive(state != GameState.Playing);
            if (state == GameState.Ready)
            {
                titleText.text = "NEON DRIFT";
                subtitleText.text = "三轨道无尽飞行 · 程序化赛道生成 · 自研霓虹网格着色器";
                hintText.text = "按 Enter / 空格 / 点击开始";
                bestText.text = "历史最佳  " + best;
                footerText.gameObject.SetActive(true);
            }
            else if (state == GameState.Paused)
            {
                titleText.text = "PAUSED";
                subtitleText.text = "游戏已暂停";
                hintText.text = "按 P 继续";
                bestText.text = "";
                footerText.gameObject.SetActive(true);
            }
            else if (state == GameState.Over)
            {
                titleText.text = "RUN COMPLETE";
                subtitleText.text = "最终得分 " + Mathf.FloorToInt(finalScore) + "　·　距离 " +
                                    Mathf.FloorToInt(finalDistance) + " m　·　最高连击 " + maxCombo + " x";
                hintText.text = "按 R / Enter / 点击 重新挑战";
                bestText.text = "历史最佳  " + best;
                footerText.gameObject.SetActive(true);
            }
        }

        public void UpdateValues(float score, float distance, float speed, int combo, float multiplier, int shield)
        {
            scoreText.text = Mathf.FloorToInt(score).ToString("D6");
            distanceText.text = Mathf.FloorToInt(distance) + " m";
            speedText.text = Mathf.RoundToInt(speed) + " u/s";
            comboText.text = combo > 1 ? "COMBO " + combo + " x  ·  " + multiplier.ToString("F2") + " 倍率" : "";
            for (int i = 0; i < shields.Length; i++)
                shields[i].color = i < shield ? WorldBuilder.Pink : new Color(0.20f, 0.23f, 0.30f, 0.7f);
        }
    }
}
