precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uPressure;

// Advanced noise for crayon texture
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
    
    // Create wax crayon texture
    vec2 uv = vTextureCoord * 350.0;
    float waxTexture = fbm(uv + uTime * 0.08);
    
    // Pressure affects crayon application
    float crayonPressure = 0.3 + 0.7 * uPressure;
    
    // Create wax layering effect
    float waxLayer = waxTexture * crayonPressure;
    waxLayer += noise(uv * 200.0) * 0.1;
    
    // Crayon stroke direction
    float strokeDirection = sin(uv.x * 25.0 + uv.y * 20.0 + uTime * 0.03) * 0.08;
    strokeDirection += cos(uv.y * 30.0 - uTime * 0.04) * 0.05;
    
    // Wax buildup effect
    float waxBuildup = noise(uv * 100.0 + uTime * 0.02) * 0.2;
    waxBuildup *= crayonPressure;
    
    // Create crayon color variation
    float colorVariation = noise(uv * 120.0 - uTime * 0.01) * 0.15;
    colorVariation *= crayonPressure;
    
    // Combine all crayon effects
    float crayonEffect = waxLayer + strokeDirection + waxBuildup + colorVariation;
    crayonEffect = clamp(crayonEffect, 0.1, 0.9);
    
    // Crayon color with wax characteristics
    vec3 crayonColor = color.rgb;
    crayonColor += colorVariation * 0.1;
    crayonColor *= crayonEffect;
    
    // Add wax shine effect
    float waxShine = noise(uv * 80.0 + uTime * 0.05) * 0.1;
    waxShine *= crayonPressure;
    crayonColor += waxShine;
    
    // Add subtle paper texture interaction
    float paperInteraction = noise(uv * 250.0) * 0.05;
    paperInteraction *= (1.0 - crayonPressure);
    crayonColor += paperInteraction;
    
    gl_FragColor = vec4(crayonColor, color.a * crayonEffect);
} 