varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uGrainIntensity;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec4 color = texture2D(uSampler, vTextureCoord);
    
    vec2 uv = vTextureCoord * 200.0;
    float grain = noise(uv + uTime * 0.1) * 0.1 * uGrainIntensity;
    
    color.rgb += grain;
    
    gl_FragColor = color;
} 