precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uPressure;

// Advanced noise for calligraphic effects
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
    
    // Create calligraphic nib texture
    vec2 uv = vTextureCoord * 350.0;
    float nibTexture = noise(uv + uTime * 0.03);
    
    // Pressure affects stroke width
    float strokeWidth = 0.2 + 0.8 * uPressure;
    
    // Create elegant stroke variation
    float strokeVariation = sin(uv.x * 45.0 + uTime * 0.01) * 0.12;
    strokeVariation += cos(uv.y * 50.0 - uTime * 0.015) * 0.1;
    strokeVariation *= strokeWidth;
    
    // Calligraphic edge definition
    float edgeDefinition = smoothstep(0.4, 0.6, length(vTextureCoord - 0.5));
    edgeDefinition = 1.0 - edgeDefinition;
    edgeDefinition = pow(edgeDefinition, 1.8);
    
    // Ink flow variation
    float inkFlow = noise(uv * 200.0 + uTime * 0.02) * 0.15;
    inkFlow *= strokeWidth;
    
    // Nib wear simulation
    float nibWear = noise(uv * 150.0 - uTime * 0.01) * 0.1;
    nibWear *= (1.0 - strokeWidth);
    
    // Combine all calligraphic effects
    float calligraphicEffect = edgeDefinition + strokeVariation + inkFlow + nibWear;
    calligraphicEffect = clamp(calligraphicEffect, 0.1, 0.95);
    
    // Deep black calligraphic ink
    vec3 calligraphicColor = color.rgb;
    calligraphicColor = mix(calligraphicColor, vec3(0.01, 0.01, 0.02), 0.9);
    calligraphicColor *= calligraphicEffect;
    
    // Add subtle ink shine
    float inkShine = noise(uv * 100.0 + uTime * 0.04) * 0.08;
    inkShine *= strokeWidth;
    calligraphicColor += inkShine;
    
    gl_FragColor = vec4(calligraphicColor, color.a * calligraphicEffect);
} 