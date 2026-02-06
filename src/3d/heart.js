function heartField(x, y, z) {
    // Volumetric heart implicit function.
    // y is vertical axis (top lobes up, tip down).
    const core = x * x + y * y + z * z - 1.0;
    return core * core * core - x * x * y * y * y - 0.08 * z * z * y * y * y;
}

function rand(min, max) {
    return min + Math.random() * (max - min);
}

const HEART_Y_OFFSET = 0.15;

export function sampleHeartPoint3D(options = {}) {
    const surface = Boolean(options.surface);

    for (let i = 0; i < 90; i++) {
        const x = rand(-1.25, 1.25);
        const y = rand(-1.25, 1.2);
        const z = rand(-1.15, 1.15);

        if (heartField(x, y, z) <= 0) {
            // Interior particles: bias outward for fuller silhouette.
            // Surface particles: keep close to shell for better readability (photos).
            const shellBias = surface
                ? 0.92 + Math.random() * 0.12
                : 0.68 + Math.pow(Math.random(), 0.35) * 0.32;

            let px = x * shellBias;
            let py = y * shellBias;
            let pz = z * shellBias;

            // Roundness compensation to avoid a "flat-slab" look.
            const radial = Math.sqrt(px * px + pz * pz);
            const belly = 1.0 + (1.0 - Math.min(radial, 1.0)) * 0.18;
            pz *= belly;

            // World scale (larger, fuller heart)
            return {
                x: px * 2.9,
                y: py * 2.8 + HEART_Y_OFFSET,
                z: pz * 2.55
            };
        }
    }

    // Fallback point in case rejection sampling misses.
    return { x: 0, y: HEART_Y_OFFSET, z: 0 };
}
