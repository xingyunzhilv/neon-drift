// 程序化霓虹网格地面
// 用世界坐标直接计算网格线，_Scroll 由脚本按行进距离推进，几何体本身不移动。
// Pass 打上 SRPDefaultUnlit 标签，Built-in / URP / HDRP 均可渲染。
Shader "NeonDrift/Grid"
{
    Properties
    {
        _Cyan ("Cyan", Color) = (0.22, 0.96, 0.88, 1)
        _Purple ("Purple", Color) = (0.63, 0.42, 1.0, 1)
        _Base ("Base", Color) = (0.014, 0.019, 0.045, 1)
        _Scroll ("Scroll", Float) = 0
        _PulseTime ("Time", Float) = 0
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "Queue" = "Geometry" }
        Pass
        {
            Tags { "LightMode" = "SRPDefaultUnlit" }
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0
            #include "UnityCG.cginc"

            float4 _Cyan;
            float4 _Purple;
            float4 _Base;
            float _Scroll;
            float _PulseTime;

            struct appdata { float4 vertex : POSITION; };
            struct v2f
            {
                float4 pos : SV_POSITION;
                float3 world : TEXCOORD0;
            };

            v2f vert(appdata v)
            {
                v2f o;
                float4 wp = mul(unity_ObjectToWorld, v.vertex);
                o.world = wp.xyz;
                o.pos = UnityObjectToClipPos(v.vertex);
                return o;
            }

            float lineMask(float value, float period, float thickness)
            {
                float f = abs(frac(value / period - 0.5) - 0.5) * period;
                return 1.0 - smoothstep(0.0, thickness, f);
            }

            fixed4 frag(v2f i) : SV_Target
            {
                float z = i.world.z + _Scroll;
                float x = i.world.x;
                float gx = lineMask(x, 2.7, 0.075);
                float gz = lineMask(z, 3.0, 0.055);
                float grid = max(gx, gz * 0.7);

                float distFade = 1.0 - smoothstep(55.0, 210.0, length(float2(x, i.world.z)));
                float edgeFade = 1.0 - smoothstep(16.0, 38.0, abs(x));
                float pulse = 0.82 + 0.18 * sin(_PulseTime * 2.2 + z * 0.09);

                float3 col = lerp(_Purple.rgb, _Cyan.rgb, saturate((x + 14.0) / 28.0));
                float lane = 1.0 - smoothstep(4.0, 5.8, abs(x));
                float3 outc = _Base.rgb
                            + float3(0.025, 0.05, 0.10) * lane * distFade
                            + col * grid * distFade * edgeFade * 1.25 * pulse;
                return fixed4(outc, 1.0);
            }
            ENDCG
        }
    }
    FallBack "Unlit/Color"
}
