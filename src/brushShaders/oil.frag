precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uPressure;

// Advanced noise for oil paint effects
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

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < 5; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

void main(void) {
    vec4 color = texture2D(uSampler, vTextureCoord);
    
    // Create thick oil paint texture
    vec2 uv = vTextureCoord * 400.0;
    float paintTexture = fbm(uv + uTime * 0.02);
    
    // Pressure affects paint thickness (impasto)
    float paintThickness = 0.2 + 0.8 * uPressure;
    
    // Create impasto effect (thick paint buildup)
    float impasto = noise(uv * 120.0 + uTime * 0.01) * 0.3;
    impasto += noise(uv * 60.0 - uTime * 0.015) * 0.2;
    impasto *= paintThickness;
    
    // Paint brush stroke texture
    float brushStroke = sin(uv.x * 25.0 + uTime * 0.005) * 0.15;
    brushStroke += cos(uv.y * 30.0 - uTime * 0.008) * 0.12;
    brushStroke *= paintThickness;
    
    // Oil paint shine and gloss
    float paintShine = noise(uv * 80.0 + uTime * 0.03) * 0.2;
    paintShine *= paintThickness;
    
    // Paint edge definition with thickness
    float edgeDefinition = smoothstep(0.35, 0.65, length(vTextureCoord - 0.5));
    edgeDefinition = 1.0 - edgeDefinition;
    edgeDefinition = pow(edgeDefinition, 0.8);
    
    // Combine all oil paint effects
    float oilEffect = edgeDefinition + impasto + brushStroke + paintShine;
    oilEffect = clamp(oilEffect, 0.4, 0.98);
    
    // Rich oil paint color
    vec3 oilColor = color.rgb;
    oilColor *= (1.0 + paintShine * 0.3);
    oilColor *= oilEffect;
    
    // Add paint texture and thickness
    oilColor += paintTexture * 0.15;
    oilColor += impasto * 0.1;
    
    // Oil paint opacity
    float opacity = 0.9 + paintThickness * 0.1;
    
    gl_FragColor = vec4(oilColor, color.a * opacity);
} 