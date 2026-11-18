using System.Collections.Generic;
using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace NeonDrift
{
    /// <summary>
    /// 全部美术资源由代码程序化生成：无外部模型 / 贴图 / 预制体依赖。
    /// 同时负责编辑器烘焙场景时把运行时材质持久化为 .mat 资源。
    /// </summary>
    public static class WorldBuilder
    {
        public static readonly Color Cyan = new Color(0.22f, 0.96f, 0.88f);
        public static readonly Color Purple = new Color(0.63f, 0.42f, 1.0f);
        public static readonly Color Pink = new Color(1.0f, 0.31f, 0.64f);
        public static readonly Color Amber = new Color(1.0f, 0.62f, 0.19f);
        public static readonly Color Danger = new Color(1.0f, 0.22f, 0.38f);
        public static readonly Color Dark = new Color(0.02f, 0.024f, 0.055f);

        static readonly List<Material> createdMaterials = new List<Material>();
        static readonly Dictionary<Color, Material> burstMats = new Dictionary<Color, Material>();

        public static void ClearMaterialCache() { createdMaterials.Clear(); }

        static Material Register(Material m, bool track)
        {
            if (track) createdMaterials.Add(m);
            return m;
        }

#if UNITY_EDITOR
        /// <summary>把内存材质落盘，使烘焙的场景序列化时引用不丢失。</summary>
        public static void PersistMaterials()
        {
            const string root = "Assets/NeonDrift";
            const string dir = root + "/Materials";
            if (!AssetDatabase.IsValidFolder(root)) AssetDatabase.CreateFolder("Assets", "NeonDrift");
            if (!AssetDatabase.IsValidFolder(dir)) AssetDatabase.CreateFolder(root, "Materials");
            for (int i = 0; i < createdMaterials.Count; i++)
            {
                Material m = createdMaterials[i];
                if (m == null) continue;
                string path = dir + "/Mat_" + i.ToString("00") + ".mat";
                if (AssetDatabase.LoadAssetAtPath<Material>(path) != null) AssetDatabase.DeleteAsset(path);
                AssetDatabase.CreateAsset(m, path);
            }
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }
#endif

        public static Material Unlit(Color c) { return Unlit(c, true); }

        public static Material Unlit(Color c, bool track)
        {
            Shader s = Shader.Find("Universal Render Pipeline/Unlit");
            Material m;
            if (s != null)
            {
                m = new Material(s);
                if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            }
            else
            {
                s = Shader.Find("Unlit/Color");
                if (s == null) s = Shader.Find("Standard");
                m = new Material(s);
                if (m.HasProperty("_Color")) m.SetColor("_Color", c);
            }
            return Register(m, track);
        }

        public static Material Lit(Color baseCol, Color emission)
        {
            Shader s = Shader.Find("Universal Render Pipeline/Lit");
            Material m;
            if (s != null)
            {
                m = new Material(s);
                if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", baseCol);
            }
            else
            {
                s = Shader.Find("Standard");
                if (s == null) return Unlit(baseCol);
                m = new Material(s);
                if (m.HasProperty("_Color")) m.SetColor("_Color", baseCol);
            }
            if (m.HasProperty("_EmissionColor"))
            {
                m.EnableKeyword("_EMISSION");
                m.SetColor("_EmissionColor", emission);
            }
            return Register(m, true);
        }

        static T[] FindAll<T>() where T : UnityEngine.Object
        {
#if UNITY_2022_2_OR_NEWER
            return UnityEngine.Object.FindObjectsByType<T>(FindObjectsSortMode.None);
#else
            return UnityEngine.Object.FindObjectsOfType<T>();
#endif
        }

        static GameObject Prim(PrimitiveType type, string name, Transform parent)
        {
            GameObject go = GameObject.CreatePrimitive(type);
            go.name = name;
            if (parent != null) go.transform.SetParent(parent, true);
            Collider col = go.GetComponent<Collider>();
            if (col != null)
            {
                if (Application.isPlaying) UnityEngine.Object.Destroy(col);
                else UnityEngine.Object.DestroyImmediate(col);
            }
            return go;
        }

        static GameObject Cube(string name, Transform parent, Vector3 localPos, Vector3 scale, Material mat)
        {
            GameObject go = Prim(PrimitiveType.Cube, name, parent);
            go.transform.localPosition = localPos;
            go.transform.localScale = scale;
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            return go;
        }

        static GameObject Sphere(string name, Transform parent, Vector3 localPos, Vector3 scale, Material mat)
        {
            GameObject go = Prim(PrimitiveType.Sphere, name, parent);
            go.transform.localPosition = localPos;
            go.transform.localScale = scale;
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            return go;
        }

        public static WorldRefs BuildEnvironment(GameConfig cfg)
        {
            GameObject root = new GameObject("NeonDrift_Environment");
            WorldRefs refs = root.AddComponent<WorldRefs>();
            refs.segmentLength = cfg.segmentLength;
            refs.totalLength = cfg.segmentLength * cfg.segmentCount;

            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogColor = Dark;
            RenderSettings.fogDensity = 0.0058f;
            RenderSettings.ambientLight = new Color(0.25f, 0.32f, 0.50f);

            /* 网格地面：Plane 默认 10x10，用缩放得到 80 x groundLength */
            GameObject ground = Prim(PrimitiveType.Plane, "Grid Ground", root.transform);
            ground.transform.position = new Vector3(0f, -0.02f, -cfg.groundLength * 0.5f + 30f);
            ground.transform.localScale = new Vector3(8f, 1f, cfg.groundLength / 10f);
            Shader gridShader = Shader.Find("NeonDrift/Grid");
            Material gridMat;
            if (gridShader != null)
            {
                gridMat = new Material(gridShader);
                gridMat.SetColor("_Cyan", Cyan);
                gridMat.SetColor("_Purple", Purple);
                gridMat.SetColor("_Base", new Color(0.014f, 0.019f, 0.045f, 1f));
                Register(gridMat, true);
            }
            else gridMat = Unlit(Dark);
            ground.GetComponent<MeshRenderer>().sharedMaterial = gridMat;
            refs.gridMaterial = gridMat;

            Material railMat = Unlit(Purple);
            Material pillarA = Unlit(Cyan);
            Material pillarB = Unlit(Purple);
            Material capMat = Unlit(Pink);

            Transform[] segs = new Transform[cfg.segmentCount];
            for (int i = 0; i < cfg.segmentCount; i++)
            {
                GameObject seg = new GameObject("Segment_" + i);
                seg.transform.SetParent(root.transform, true);
                seg.transform.position = new Vector3(0f, 0f, 10f - i * cfg.segmentLength);

                for (int s = -1; s <= 1; s += 2)
                {
                    Cube("Rail", seg.transform,
                        new Vector3(s * 5.7f, 0.12f, -cfg.segmentLength * 0.5f),
                        new Vector3(0.09f, 0.09f, cfg.segmentLength), railMat);
                    for (int j = 0; j < 2; j++)
                    {
                        float z = -j * cfg.segmentLength * 0.5f - 1f;
                        Cube("Pillar", seg.transform,
                            new Vector3(s * 5.7f, 1.8f, z),
                            new Vector3(0.14f, 3.6f, 0.14f),
                            ((i + j) % 2 == 0) ? pillarA : pillarB);
                        Cube("Cap", seg.transform,
                            new Vector3(s * 5.7f, 3.66f, z),
                            new Vector3(0.34f, 0.12f, 0.34f), capMat);
                    }
                }
                segs[i] = seg.transform;
            }
            refs.segments = segs;

            /* 复用模板场景里已有的 Main Camera / Light，避免多相机叠加和多光源过曝 */
            Camera cam = Camera.main;
            GameObject camGo;
            if (cam == null)
            {
                camGo = new GameObject("Main Camera");
                camGo.tag = "MainCamera";
                cam = camGo.AddComponent<Camera>();
                camGo.AddComponent<AudioListener>();
            }
            else
            {
                camGo = cam.gameObject;
                if (camGo.GetComponent<AudioListener>() == null) camGo.AddComponent<AudioListener>();
            }
            Camera[] cams = Camera.allCameras;
            if (cams != null)
                foreach (Camera other in cams)
                    if (other != cam) other.enabled = false;
            cam.enabled = true;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Dark;
            cam.fieldOfView = 68f;
            cam.nearClipPlane = 0.1f;
            cam.farClipPlane = 600f;
            camGo.transform.position = new Vector3(0f, cfg.cameraHeight, cfg.cameraBack);
            camGo.transform.LookAt(new Vector3(0f, 1.15f, -14f));
            refs.worldCamera = cam;

            GameObject lightGo = new GameObject("Key Light");
            Light light = lightGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(0.80f, 0.91f, 1f);
            light.intensity = 1.2f;
            lightGo.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
            foreach (Light other in FindAll<Light>())
                if (other != light) other.enabled = false;
            refs.keyLight = light;

            return refs;
        }

        public static void Animate(WorldRefs refs, float dt, float speed)
        {
            if (refs == null) return;
            refs.time += dt;
            refs.scroll += speed * dt;
            if (refs.gridMaterial != null)
            {
                if (refs.gridMaterial.HasProperty("_Scroll")) refs.gridMaterial.SetFloat("_Scroll", refs.scroll);
                if (refs.gridMaterial.HasProperty("_PulseTime")) refs.gridMaterial.SetFloat("_PulseTime", refs.time);
            }
            float move = speed * dt;
            if (refs.segments == null) return;
            for (int i = 0; i < refs.segments.Length; i++)
            {
                Transform seg = refs.segments[i];
                if (seg == null) continue;
                Vector3 p = seg.position;
                p.z += move;
                if (p.z > 34f) p.z -= refs.totalLength;
                seg.position = p;
            }
        }

        public static void Reset(WorldRefs refs)
        {
            if (refs == null) return;
            refs.scroll = 0f;
            refs.time = 0f;
            if (refs.gridMaterial != null)
            {
                if (refs.gridMaterial.HasProperty("_Scroll")) refs.gridMaterial.SetFloat("_Scroll", 0f);
                if (refs.gridMaterial.HasProperty("_PulseTime")) refs.gridMaterial.SetFloat("_PulseTime", 0f);
            }
            if (refs.segments == null) return;
            for (int i = 0; i < refs.segments.Length; i++)
            {
                if (refs.segments[i] != null)
                    refs.segments[i].position = new Vector3(0f, 0f, 10f - i * refs.segmentLength);
            }
        }

        public static GameObject CreateShip()
        {
            GameObject root = new GameObject("Ship Visual");
            Material hull = Lit(new Color(0.04f, 0.16f, 0.23f), new Color(0.06f, 0.45f, 0.58f));
            Material bright = Lit(new Color(0.04f, 0.23f, 0.23f), Cyan * 0.9f);
            Material engine = Unlit(Pink);
            Material trail = Unlit(Cyan);

            Cube("Hull", root.transform, Vector3.zero, new Vector3(0.72f, 0.50f, 1.90f), hull);
            Sphere("Nose", root.transform, new Vector3(0f, 0f, -0.95f), new Vector3(0.36f, 0.26f, 0.50f), bright);
            Sphere("Cockpit", root.transform, new Vector3(0f, 0.18f, -0.15f), new Vector3(0.30f, 0.20f, 0.50f), bright);

            for (int s = -1; s <= 1; s += 2)
            {
                GameObject fin = Cube("Wing", root.transform,
                    new Vector3(s * 0.68f, -0.03f, 0.25f),
                    new Vector3(1.0f, 0.09f, 0.62f), hull);
                fin.transform.localRotation = Quaternion.Euler(0f, 0f, -s * 11f);
                Sphere("WingTip", root.transform,
                    new Vector3(s * 1.16f, 0.02f, 0.25f),
                    new Vector3(0.16f, 0.16f, 0.16f), bright);

                GameObject en = Prim(PrimitiveType.Cylinder, "Engine", root.transform);
                en.transform.localPosition = new Vector3(s * 0.28f, -0.05f, 0.92f);
                en.transform.localScale = new Vector3(0.17f, 0.22f, 0.17f);
                en.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
                en.GetComponent<MeshRenderer>().sharedMaterial = engine;

                Cube("Trail", root.transform,
                    new Vector3(s * 0.28f, -0.05f, 1.95f),
                    new Vector3(0.16f, 0.06f, 1.8f), trail);
            }
            return root;
        }

        public static GameObject CreateBlockTemplate()
        {
            GameObject root = new GameObject("Block_Template");
            Material body = Lit(new Color(0.16f, 0.04f, 0.09f), new Color(0.95f, 0.10f, 0.26f));
            Cube("Body", root.transform, new Vector3(0f, 0.675f, 0f), new Vector3(1.9f, 1.35f, 1.6f), body);
            Cube("Top", root.transform, new Vector3(0f, 1.36f, 0f), new Vector3(1.9f, 0.10f, 1.6f), Unlit(Danger));
            Cube("Glow", root.transform, new Vector3(0f, 0.02f, 0f), new Vector3(2.4f, 0.03f, 2.1f), Unlit(Danger * 0.45f));
            root.SetActive(false);
            return root;
        }

        public static GameObject CreateGateTemplate()
        {
            GameObject root = new GameObject("Gate_Template");
            Material mat = Lit(new Color(0.23f, 0.11f, 0f), Amber);
            Cube("Beam", root.transform, new Vector3(0f, 1.45f, 0f), new Vector3(2.35f, 0.48f, 0.62f), mat);
            for (int s = -1; s <= 1; s += 2)
                Cube("Post", root.transform, new Vector3(s * 1.16f, 0.72f, 0f), new Vector3(0.15f, 1.45f, 0.15f), mat);
            root.SetActive(false);
            return root;
        }

        public static GameObject CreatePickupTemplate()
        {
            GameObject root = new GameObject("Pickup_Template");
            Material core = Lit(new Color(0.03f, 0.23f, 0.23f), Cyan);
            Sphere("Core", root.transform, Vector3.zero, new Vector3(0.50f, 0.68f, 0.50f), core);
            GameObject ring = Prim(PrimitiveType.Cylinder, "Ring", root.transform);
            ring.transform.localPosition = Vector3.zero;
            ring.transform.localScale = new Vector3(0.75f, 0.02f, 0.75f);
            ring.GetComponent<MeshRenderer>().sharedMaterial = Unlit(Cyan * 0.8f);
            root.SetActive(false);
            return root;
        }

        /// <summary>低频特效用粒子系统 + 定时销毁；高频障碍才用对象池。</summary>
        public static void SpawnBurst(Vector3 pos, Color color)
        {
            GameObject go = new GameObject("Burst");
            go.transform.position = pos;
            ParticleSystem ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);

            ParticleSystem.MainModule main = ps.main;
            main.duration = 0.35f;
            main.loop = false;
            main.startLifetime = 0.55f;
            main.startSpeed = 6f;
            main.startSize = 0.16f;
            main.maxParticles = 32;
            main.startColor = color;
            main.gravityModifier = 0.6f;
            main.simulationSpace = ParticleSystemSimulationSpace.World;

            ParticleSystem.EmissionModule emission = ps.emission;
            emission.rateOverTime = 0f;
            emission.SetBursts(new ParticleSystem.Burst[] { new ParticleSystem.Burst(0f, (short)18) });

            ParticleSystem.ShapeModule shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 0.25f;

            Material mat;
            if (!burstMats.TryGetValue(color, out mat) || mat == null)
            {
                mat = Unlit(color, false);
                burstMats[color] = mat;
            }
            go.GetComponent<ParticleSystemRenderer>().material = mat;
            ps.Play();
            UnityEngine.Object.Destroy(go, 1.2f);
        }
    }
}
