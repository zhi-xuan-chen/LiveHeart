import * as THREE from 'three'
import { sampleHeartPoint3D } from './heart'

export class ParticleTree {
    constructor(count = 8000) {
        this.count = count;
        this.mesh = null;
        this.uniforms = {
            uTime: { value: 0 },
            uInteract: { value: 0 },
            uBeat: { value: 0 },
            uColor: { value: new THREE.Color(0xfff2fb) }
        };
    }

    init(scene) {
        // 1. Geometry - small tetrahedrons for glitter shards
        const geometry = new THREE.TetrahedronGeometry(0.018);

        // 2. Create custom attributes for explosion
        // aTarget: where particles explode to (sphere distribution)
        // aRandom: random values for noise animation
        const targets = new Float32Array(this.count * 3);
        const randoms = new Float32Array(this.count * 3);
        const originalPositions = new Float32Array(this.count * 3);

        const dummy = new THREE.Object3D();

        for (let i = 0; i < this.count; i++) {
            const heartPoint = sampleHeartPoint3D();
            const x = heartPoint.x;
            const y = heartPoint.y;
            const z = heartPoint.z;

            // Store original position
            originalPositions[i * 3] = x;
            originalPositions[i * 3 + 1] = y;
            originalPositions[i * 3 + 2] = z;

            // Set up dummy for instance matrix
            dummy.position.set(x, y, z);
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            const scale = Math.random() * 0.5 + 0.5;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            // Generate explosion target (sphere distribution)
            const explodeTheta = Math.random() * Math.PI * 2;
            const explodePhi = Math.acos(2 * Math.random() - 1);
            const explodeRadius = 4 + Math.random() * 4; // 4-8 units away

            targets[i * 3] = explodeRadius * Math.sin(explodePhi) * Math.cos(explodeTheta);
            targets[i * 3 + 1] = explodeRadius * Math.sin(explodePhi) * Math.sin(explodeTheta);
            targets[i * 3 + 2] = explodeRadius * Math.cos(explodePhi);

            // Random values for animation
            randoms[i * 3] = Math.random();
            randoms[i * 3 + 1] = Math.random();
            randoms[i * 3 + 2] = Math.random();
        }

        // Create colors array for shader
        const colors = new Float32Array(this.count * 3);
        
        // Generate colors
        for (let i = 0; i < this.count; i++) {
            const palette = [0xff3f97, 0xff6fc4, 0xff95da, 0xffd18e, 0xff82b8];
            const color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        // Add all attributes to geometry BEFORE creating InstancedMesh
        geometry.setAttribute('aTarget', new THREE.InstancedBufferAttribute(targets, 3));
        geometry.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randoms, 3));
        geometry.setAttribute('aOriginalPos', new THREE.InstancedBufferAttribute(originalPositions, 3));
        geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));

        // Create ShaderMaterial
        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: this.getVertexShader(),
            fragmentShader: this.getFragmentShader(),
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        // InstancedMesh
        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);

        // Set initial matrices (identity for shader to handle)
        for (let i = 0; i < this.count; i++) {
            dummy.position.set(0, 0, 0);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            this.mesh.setMatrixAt(i, dummy.matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;

        scene.add(this.mesh);
    }

    getVertexShader() {
        return `
            uniform float uTime;
            uniform float uInteract;
            uniform float uBeat;
            
            attribute vec3 aTarget;
            attribute vec3 aRandom;
            attribute vec3 aOriginalPos;
            attribute vec3 aColor;
            
            varying vec3 vColor;
            varying float vRandom;
            varying float vBurst;
            varying float vHeight;
            
            void main() {
                vRandom = aRandom.x;
                vColor = aColor;
                
                // Base position (Heart volume)
                vec3 pos = aOriginalPos;
                
                // Add "Gold Dust" shimmer movement
                float shimmer = sin(uTime * 3.0 + aRandom.y * 10.0) * 0.03;
                pos.x += shimmer * (1.0 + uBeat);
                pos.z += cos(uTime * 2.0 + aRandom.x * 10.0) * 0.03 * (1.0 + uBeat);
                pos.y += sin(uTime * 1.5 + aRandom.z * 5.0) * 0.02 * uBeat;
                
                vec3 fallbackTarget = normalize(aOriginalPos + vec3(
                    aRandom.x - 0.5,
                    aRandom.y - 0.5,
                    aRandom.z - 0.5
                )) * (4.0 + aRandom.x * 4.0);
                vec3 validTarget = length(aTarget) > 0.001 ? aTarget : fallbackTarget;

                float t = smoothstep(0.0, 1.0, uInteract);
                float burst = sin(t * 3.14159265);
                vBurst = burst;

                vec3 dir = normalize(validTarget - pos + vec3(0.0001));
                vec3 tangent = normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
                if (length(tangent) < 0.001) tangent = vec3(1.0, 0.0, 0.0);

                // Core transition path
                vec3 finalPos = mix(pos, validTarget, t);

                // Mid-transition shard spread (works both explode and regroup)
                float shardSpread = burst * (0.45 + aRandom.z * 0.85);
                finalPos += dir * shardSpread;
                finalPos += tangent * sin(uTime * 7.0 + aRandom.y * 22.0) * shardSpread * 0.28;

                // Fine debris noise at transition peak
                float debris = sin(uTime * 11.0 + aRandom.x * 30.0) * burst * 0.08;
                finalPos += vec3(debris);
                vHeight = finalPos.y;
                
                // Beat-based scale pulse
                float scale = 1.0 + uBeat * 0.3 + burst * 0.1;
                vec3 scaledPosition = position * scale;
                
                vec4 mvPosition = modelViewMatrix * vec4(finalPos + scaledPosition, 1.0);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
    }
    
    getFragmentShader() {
        return `
            uniform float uTime;
            uniform vec3 uColor;
            
            varying vec3 vColor;
            varying float vRandom;
            varying float vBurst;
            varying float vHeight;
            
            void main() {
                // Sparkle effect
                float sparkle = abs(sin(uTime * 5.0 + vRandom * 10.0));
                float heightMix = smoothstep(-2.2, 4.8, vHeight);
                float shimmerBand = 0.5 + 0.5 * sin(uTime * 0.9 + vRandom * 18.0 + heightMix * 6.0);
                float brightness = 0.55 + 0.35 * sparkle + vBurst * 0.45;
                float alpha = 0.8 + vBurst * 0.2;

                vec3 rose = vec3(1.0, 0.30, 0.62);
                vec3 blush = vec3(1.0, 0.60, 0.84);
                vec3 champagne = vec3(1.0, 0.84, 0.64);
                vec3 orchid = vec3(0.93, 0.54, 0.98);
                vec3 romantic = mix(rose, blush, heightMix);
                romantic = mix(romantic, champagne, 0.32 * shimmerBand);
                romantic = mix(romantic, orchid, 0.18 * (1.0 - heightMix));
                
                vec3 tone = (romantic * 0.85 + vColor * 0.5) * brightness * uColor;
                gl_FragColor = vec4(tone, alpha);
            }
        `;
    }

    update(time, beat, interactState) {
        this.uniforms.uTime.value = time;
        this.uniforms.uBeat.value = beat;
        // uInteract logic handled by JS Tweens on the mesh directly
    }
}
