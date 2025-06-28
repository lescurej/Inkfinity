precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uPressure;

// Advanced noise functions for realistic pencil texture
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
    
    // Create realistic graphite texture
    vec2 uv = vTextureCoord * 400.0;
    float graphiteGrain = fbm(uv + uTime * 0.1);
    
    // Pressure-sensitive stroke variation
    float pressureVariation = 0.3 + 0.7 * uPressure;
    
    // Create directional pencil strokes
    float strokeDirection = sin(uv.x * 20.0 + uv.y * 15.0 + uTime * 0.05) * 0.1;
    
    // Graphite layering effect
    float graphiteLayer = graphiteGrain * pressureVariation;
    graphiteLayer += strokeDirection;
    graphiteLayer += noise(uv * 100.0) * 0.05;
    
    // Realistic pencil darkness based on pressure
    float pencilDarkness = 1.0 - (graphiteLayer * pressureVariation);
    pencilDarkness = clamp(pencilDarkness, 0.1, 0.95);
    
    // Add subtle color variation to simulate graphite
    vec3 graphiteColor = vec3(0.2, 0.2, 0.25);
    vec3 finalColor = mix(color.rgb, graphiteColor, 0.3);
    finalColor *= pencilDarkness;
    
    // Add paper texture interaction
    float paperInteraction = noise(uv * 200.0) * 0.1;
    finalColor += paperInteraction * (1.0 - pressureVariation);
    
    gl_FragColor = vec4(finalColor, color.a);
} 