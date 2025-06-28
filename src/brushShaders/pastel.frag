precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uPressure;

// Advanced noise for pastel effects
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
    
    // Create soft pastel texture
    vec2 uv = vTextureCoord * 280.0;
    float pastelTexture = fbm(uv + uTime * 0.06);
    
    // Pressure affects pastel application
    float pastelPressure = 0.4 + 0.6 * uPressure;
    
    // Create powdery effect
    float powder = noise(uv * 200.0 + uTime * 0.04) * 0.25;
    powder += noise(uv * 100.0 - uTime * 0.03) * 0.15;
    
    // Soft edge diffusion
    float softEdge = smoothstep(0.3, 0.7, length(vTextureCoord - 0.5));
    softEdge = 1.0 - softEdge;
    softEdge = pow(softEdge, 0.8);
    
    // Pastel layering effect
    float layering = noise(uv * 150.0 + uTime * 0.02) * 0.2;
    layering *= pastelPressure;
    
    // Color saturation for pastels
    float saturation = 1.3 + powder * 0.4;
    saturation *= pastelPressure;
    
    // Combine all pastel effects
    float pastelEffect = softEdge + powder + layering;
    pastelEffect = clamp(pastelEffect, 0.2, 0.9);
    
    // Soft pastel color
    vec3 pastelColor = color.rgb;
    pastelColor *= saturation;
    pastelColor += powder * 0.1;
    pastelColor *= pastelEffect;
    
    // Add subtle chalk-like texture
    float chalkTexture = noise(uv * 120.0) * 0.08;
    chalkTexture *= (1.0 - pastelPressure);
    pastelColor += chalkTexture;
    
    gl_FragColor = vec4(pastelColor, color.a * pastelEffect);
} 