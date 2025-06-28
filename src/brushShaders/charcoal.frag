precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uPressure;

// Advanced noise for charcoal texture
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
    
    // Create dramatic charcoal texture
    vec2 uv = vTextureCoord * 300.0;
    float charcoalGrain = fbm(uv + uTime * 0.05);
    
    // Pressure affects charcoal density
    float pressureDensity = 0.2 + 0.8 * uPressure;
    
    // Create charcoal stick texture
    float stickTexture = noise(uv * 50.0) * 0.3;
    stickTexture += noise(uv * 25.0) * 0.2;
    
    // Dramatic contrast for charcoal
    float charcoalDarkness = 1.0 - (charcoalGrain * pressureDensity);
    charcoalDarkness = pow(charcoalDarkness, 1.5);
    charcoalDarkness = clamp(charcoalDarkness, 0.0, 0.98);
    
    // Add charcoal dust effect
    float dust = noise(uv * 200.0 + uTime * 0.1) * 0.15;
    dust *= (1.0 - pressureDensity);
    
    // Create smudging effect
    float smudge = sin(uv.x * 30.0 + uv.y * 20.0 + uTime * 0.02) * 0.1;
    smudge += cos(uv.y * 40.0 - uTime * 0.03) * 0.05;
    
    // Combine all effects
    float finalDarkness = charcoalDarkness + dust + smudge;
    finalDarkness = clamp(finalDarkness, 0.0, 1.0);
    
    // Charcoal color with slight blue tint
    vec3 charcoalColor = vec3(0.05, 0.05, 0.08);
    vec3 finalColor = mix(color.rgb, charcoalColor, 0.7);
    finalColor *= finalDarkness;
    
    // Add dramatic highlights
    float highlight = noise(uv * 100.0) * 0.1;
    highlight *= (1.0 - pressureDensity);
    finalColor += highlight;
    
    gl_FragColor = vec4(finalColor, color.a);
} 