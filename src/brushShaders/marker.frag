precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uPressure;

// Advanced noise for marker effects
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
    
    // Create marker tip texture
    vec2 uv = vTextureCoord * 200.0;
    float tipTexture = noise(uv + uTime * 0.1);
    
    // Pressure affects marker flow
    float markerFlow = 0.4 + 0.6 * uPressure;
    
    // Create alcohol-based bleeding
    float bleed = 0.0;
    for(int i = 1; i <= 4; i++) {
        float offset = float(i) * 0.008;
        bleed += noise(uv * 80.0 + vec2(offset, 0.0)) * 0.08;
        bleed += noise(uv * 80.0 + vec2(0.0, offset)) * 0.08;
    }
    
    // Marker saturation effect
    float saturation = 1.2 + tipTexture * 0.3;
    saturation *= markerFlow;
    
    // Create marker edge feathering
    float edgeFeather = smoothstep(0.35, 0.65, length(vTextureCoord - 0.5));
    edgeFeather = 1.0 - edgeFeather;
    edgeFeather *= markerFlow;
    
    // Marker tip wear simulation
    float tipWear = noise(uv * 150.0 + uTime * 0.05) * 0.15;
    tipWear *= (1.0 - markerFlow);
    
    // Combine all marker effects
    float markerEffect = edgeFeather + bleed + tipWear;
    markerEffect = clamp(markerEffect, 0.1, 0.95);
    
    // Enhance color saturation
    vec3 markerColor = color.rgb;
    markerColor *= saturation;
    
    // Add marker texture
    markerColor += tipTexture * 0.1;
    markerColor *= markerEffect;
    
    // Add subtle alcohol evaporation effect
    float evaporation = noise(uv * 100.0 - uTime * 0.02) * 0.05;
    evaporation *= (1.0 - markerFlow);
    markerColor += evaporation;
    
    gl_FragColor = vec4(markerColor, color.a * markerEffect);
} 