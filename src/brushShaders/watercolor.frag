precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uPressure;

// Advanced noise for watercolor effects
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
    
    for(int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

void main(void) {
    vec4 color = texture2D(uSampler, vTextureCoord);
    
    // Create watercolor paper texture
    vec2 uv = vTextureCoord * 250.0;
    float paperGrain = fbm(uv + uTime * 0.02);
    
    // Watercolor bleeding effect
    float bleed = 0.0;
    for(int i = 1; i <= 3; i++) {
        float offset = float(i) * 0.01;
        bleed += noise(uv * 100.0 + vec2(offset, 0.0)) * 0.1;
        bleed += noise(uv * 100.0 + vec2(0.0, offset)) * 0.1;
    }
    
    // Granulation effect (pigment settling)
    float granulation = noise(uv * 300.0 + uTime * 0.01) * 0.2;
    granulation += noise(uv * 150.0 - uTime * 0.015) * 0.15;
    
    // Wet-on-wet diffusion
    float diffusion = sin(uv.x * 50.0 + uTime * 0.05) * 0.05;
    diffusion += cos(uv.y * 60.0 - uTime * 0.03) * 0.05;
    
    // Pressure affects water content
    float waterContent = 0.3 + 0.7 * uPressure;
    
    // Create watercolor transparency
    float transparency = 0.4 + 0.6 * waterContent;
    transparency += paperGrain * 0.2;
    transparency += granulation * 0.3;
    
    // Edge bleeding based on pressure
    float edgeBleed = smoothstep(0.4, 0.6, length(vTextureCoord - 0.5));
    edgeBleed = 1.0 - edgeBleed;
    edgeBleed *= waterContent;
    
    // Combine all watercolor effects
    float watercolorEffect = transparency + bleed + granulation + diffusion;
    watercolorEffect = clamp(watercolorEffect, 0.1, 0.9);
    
    // Watercolor color blending
    vec3 watercolorColor = color.rgb;
    watercolorColor += granulation * 0.1;
    watercolorColor *= watercolorEffect;
    
    // Add paper texture interaction
    watercolorColor += paperGrain * 0.05;
    
    // Edge bleeding effect
    watercolorColor *= (1.0 - edgeBleed * 0.3);
    
    gl_FragColor = vec4(watercolorColor, color.a * watercolorEffect);
} 