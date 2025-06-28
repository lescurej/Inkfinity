precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uPressure;

// Advanced noise for highlighter effects
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
    
    // Create highlighter tip texture
    vec2 uv = vTextureCoord * 250.0;
    float tipTexture = noise(uv + uTime * 0.08);
    
    // Pressure affects ink flow
    float inkFlow = 0.3 + 0.7 * uPressure;
    
    // Create fluorescent glow effect
    float glow = 0.0;
    for(int i = 1; i <= 3; i++) {
        float offset = float(i) * 0.01;
        glow += noise(uv * 60.0 + vec2(offset, 0.0)) * 0.1;
        glow += noise(uv * 60.0 + vec2(0.0, offset)) * 0.1;
    }
    
    // Highlighter transparency
    float transparency = 0.3 + 0.4 * inkFlow;
    transparency += glow * 0.2;
    
    // Create soft edges
    float softEdge = smoothstep(0.3, 0.7, length(vTextureCoord - 0.5));
    softEdge = 1.0 - softEdge;
    softEdge = pow(softEdge, 0.7);
    
    // Ink bleeding effect
    float bleeding = noise(uv * 100.0 + uTime * 0.05) * 0.15;
    bleeding *= inkFlow;
    
    // Combine all highlighter effects
    float highlighterEffect = softEdge + glow + bleeding;
    highlighterEffect = clamp(highlighterEffect, 0.1, 0.8);
    
    // Bright fluorescent color
    vec3 highlighterColor = color.rgb;
    highlighterColor *= (1.0 + glow * 0.5);
    highlighterColor *= highlighterEffect;
    
    // Add fluorescent brightness
    highlighterColor += glow * 0.3;
    
    // Highlighter transparency
    float alpha = transparency * highlighterEffect;
    
    gl_FragColor = vec4(highlighterColor, color.a * alpha);
} 