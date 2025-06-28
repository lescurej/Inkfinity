precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uPressure;

// Advanced noise for gouache effects
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
    
    for(int i = 0; i < 3; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

void main(void) {
    vec4 color = texture2D(uSampler, vTextureCoord);
    
    // Create gouache paint texture
    vec2 uv = vTextureCoord * 320.0;
    float paintTexture = fbm(uv + uTime * 0.04);
    
    // Pressure affects paint thickness
    float paintThickness = 0.3 + 0.7 * uPressure;
    
    // Create matte finish effect
    float matteFinish = noise(uv * 180.0 + uTime * 0.03) * 0.2;
    matteFinish += noise(uv * 90.0 - uTime * 0.02) * 0.15;
    
    // Paint brush stroke texture
    float brushStroke = sin(uv.x * 35.0 + uTime * 0.01) * 0.1;
    brushStroke += cos(uv.y * 40.0 - uTime * 0.015) * 0.08;
    
    // Opaque paint coverage
    float opacity = 0.8 + paintThickness * 0.2;
    opacity += matteFinish * 0.1;
    
    // Paint edge definition
    float edgeDefinition = smoothstep(0.4, 0.6, length(vTextureCoord - 0.5));
    edgeDefinition = 1.0 - edgeDefinition;
    edgeDefinition = pow(edgeDefinition, 1.2);
    
    // Combine all gouache effects
    float gouacheEffect = edgeDefinition + matteFinish + brushStroke;
    gouacheEffect = clamp(gouacheEffect, 0.3, 0.95);
    
    // Opaque gouache color
    vec3 gouacheColor = color.rgb;
    gouacheColor *= (1.0 + matteFinish * 0.2);
    gouacheColor *= gouacheEffect;
    
    // Add paint texture
    gouacheColor += paintTexture * 0.1;
    
    // Matte surface effect
    float matteSurface = noise(uv * 100.0) * 0.05;
    matteSurface *= paintThickness;
    gouacheColor += matteSurface;
    
    gl_FragColor = vec4(gouacheColor, color.a * opacity);
} 