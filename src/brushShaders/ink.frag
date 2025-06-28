precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uPressure;

// Advanced noise for ink effects
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main(void) {
    vec4 color = texture2D(uSampler, vTextureCoord);
    
    // Create ink flow texture
    vec2 uv = vTextureCoord * 300.0;
    float inkFlow = noise(uv + uTime * 0.05);
    
    // Pressure affects ink density
    float inkDensity = 0.2 + 0.8 * uPressure;
    
    // Create ink feathering effect
    float feathering = 0.0;
    for(int i = 1; i <= 5; i++) {
        float offset = float(i) * 0.006;
        feathering += noise(uv * 120.0 + vec2(offset, 0.0)) * 0.06;
        feathering += noise(uv * 120.0 + vec2(0.0, offset)) * 0.06;
    }
    
    // Calligraphic stroke variation
    float strokeVariation = sin(uv.x * 40.0 + uTime * 0.02) * 0.08;
    strokeVariation += cos(uv.y * 35.0 - uTime * 0.03) * 0.06;
    
    // Ink pooling effect
    float inkPooling = noise(uv * 80.0 + uTime * 0.01) * 0.15;
    inkPooling *= inkDensity;
    
    // Create sharp ink edges
    float edgeSharpness = smoothstep(0.45, 0.55, length(vTextureCoord - 0.5));
    edgeSharpness = 1.0 - edgeSharpness;
    edgeSharpness = pow(edgeSharpness, 1.5);
    
    // Combine all ink effects
    float inkEffect = edgeSharpness + feathering + strokeVariation + inkPooling;
    inkEffect = clamp(inkEffect, 0.1, 0.98);
    
    // Deep black ink color
    vec3 inkColor = color.rgb;
    inkColor = mix(inkColor, vec3(0.02, 0.02, 0.03), 0.8);
    inkColor *= inkEffect;
    
    // Add ink shine
    float inkShine = noise(uv * 60.0 + uTime * 0.03) * 0.05;
    inkShine *= inkDensity;
    inkColor += inkShine;
    
    gl_FragColor = vec4(inkColor, color.a * inkEffect);
} 