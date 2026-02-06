import * as THREE from 'three'
import { sampleHeartPoint3D } from './heart'

export class PhotoCloud {
    constructor() {
        this.group = new THREE.Group();
        this.photos = []; // Array of meshes
        this.textures = [];
        this.loader = new THREE.TextureLoader();
        this.geometry = new THREE.PlaneGeometry(0.5, 0.5);
        this.maxPhotos = 40;
    }

    init(scene) {
        scene.add(this.group);
    }

    addPhotos(files) {
        Array.from(files).forEach(file => {
            if (this.photos.length >= this.maxPhotos) return;

            const url = URL.createObjectURL(file);
            this.loader.load(url, (texture) => {
                texture.minFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                this.textures.push(texture);

                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(this.geometry, material);

                const p = sampleHeartPoint3D({ surface: true });

                mesh.position.set(
                    p.x * 1.06,
                    p.y,
                    p.z * 1.06
                );

                mesh.lookAt(0, p.y, 0);
                mesh.rotation.z = Math.random() * 0.2; // Slight tilt

                // Interaction Metadata
                mesh.userData = {
                    originalPos: mesh.position.clone(),
                    originalScale: mesh.scale.clone(),
                    velocity: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.01)
                };

                this.group.add(mesh);
                this.photos.push(mesh);
            });
        });
    }

    explode() {
        this.photos.forEach((mesh, i) => {
            if (!mesh.userData.explodeTarget) {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const radius = 4 + Math.random() * 3;
                mesh.userData.explodeTarget = new THREE.Vector3(
                    radius * Math.sin(phi) * Math.cos(theta),
                    radius * Math.sin(phi) * Math.sin(theta),
                    radius * Math.cos(phi)
                );
            }
            mesh.userData.spin = 0.002 + (i % 7) * 0.0004;
        });
    }

    implode() {
        this.photos.forEach((mesh) => {
            mesh.userData.explodeTarget = null;
            mesh.userData.spin = 0;
        });
    }

    update(time, state) {
        // state: 0=TREE, 1=EXPLODE, 2=FOCUS

        this.photos.forEach((mesh, i) => {
            if (state === 0) {
                mesh.position.y += Math.sin(time + i) * 0.002;
                mesh.rotation.z += 0.0004;
            }

            if (state === 1 && mesh.userData.explodeTarget) {
                mesh.position.lerp(mesh.userData.explodeTarget, 0.03);
                mesh.rotation.z += mesh.userData.spin || 0.002;
            }
        });
    }
}
