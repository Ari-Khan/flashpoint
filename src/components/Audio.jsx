import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export default function AmbientAudio({ enabled = true }) {
    const spaceRef = useRef(null);
    const groundRef = useRef(null);
    const targetVolumesRef = useRef({ space: 0, ground: 0 });
    const currentVolumesRef = useRef({ space: 0, ground: 0 });

    const initialFadeRef = useRef({ space: null, ground: null });
    const loadedOnceRef = useRef({ space: false, ground: false });

    function startInitialFade(kind, duration = 5000) {
        initialFadeRef.current[kind] = {
            start: performance.now(),
            duration,
            from: currentVolumesRef.current[kind] ?? 0,
            to: targetVolumesRef.current[kind] ?? 0,
        };
    }
    const { camera } = useThree();

    const MIN_DIST = 1.125;
    const MAX_DIST = 32;

    useEffect(() => {
        const space = new window.Audio("/audio/space.ogg");
        const ground = new window.Audio("/audio/ground.ogg");

        [space, ground].forEach((a) => {
            a.loop = true;
            a.volume = 0;
            a.preload = "auto";
            a.crossOrigin = "anonymous";
        });

        spaceRef.current = space;
        groundRef.current = ground;

        const scheduleResumeFor = (a, kind) => {
            const resume = () => {
                a.play()
                    .then(() => {
                        if (!loadedOnceRef.current[kind]) {
                            startInitialFade(kind);
                            loadedOnceRef.current[kind] = true;
                        }
                    })
                    .catch(() => {});
                window.removeEventListener("pointerdown", resume);
                window.removeEventListener("keydown", resume);
            };
            window.addEventListener("pointerdown", resume, { once: true });
            window.addEventListener("keydown", resume, { once: true });
        };

        const tryPlayBoth = () => {
            const p1 = space.play();
            const p2 = ground.play();

            if (p1 !== undefined) {
                p1
                    .then(() => {
                        if (!loadedOnceRef.current.space) {
                            startInitialFade("space");
                            loadedOnceRef.current.space = true;
                        }
                    })
                    .catch(() => scheduleResumeFor(space, "space"));
            } else {
                if (!loadedOnceRef.current.space) {
                    startInitialFade("space");
                    loadedOnceRef.current.space = true;
                }
            }

            if (p2 !== undefined) {
                p2
                    .then(() => {
                        if (!loadedOnceRef.current.ground) {
                            startInitialFade("ground");
                            loadedOnceRef.current.ground = true;
                        }
                    })
                    .catch(() => scheduleResumeFor(ground, "ground"));
            } else {
                if (!loadedOnceRef.current.ground) {
                    startInitialFade("ground");
                    loadedOnceRef.current.ground = true;
                }
            }
        };

        if (enabled) tryPlayBoth();

        return () => {
            space.pause();
            ground.pause();
            space.src = "";
            ground.src = "";
        };
    }, []);

    useFrame(() => {
        const space = spaceRef.current;
        const ground = groundRef.current;
        if (!space || !ground) return;

        const dist = camera.position.length();
        const n = Math.max(
            0,
            Math.min(1, (dist - MIN_DIST) / (MAX_DIST - MIN_DIST))
        );

        const CROSS_PORTION = 0.08;
        let targetSpace = 0;
        let targetGround = 0;
        if (n < CROSS_PORTION) {
            const t = n / CROSS_PORTION;
            targetSpace = t;
            targetGround = 1 - t;
        } else {
            targetSpace = 1;
            targetGround = 0;
        }

        targetVolumesRef.current.space = targetSpace;
        targetVolumesRef.current.ground = targetGround;

        const now = performance.now();

        const smoothing = 0.08;

        const processFadeOrSmooth = (kind, audio) => {
            const anim = initialFadeRef.current[kind];
            if (anim) {
                const elapsed = now - anim.start;
                const t = Math.min(1, elapsed / anim.duration);
                const eased = t * t * (3 - 2 * t);
                const val = anim.from + (anim.to - anim.from) * eased;
                currentVolumesRef.current[kind] = Math.max(0, Math.min(1, val));
                if (t >= 1) initialFadeRef.current[kind] = null;
            } else {
                currentVolumesRef.current[kind] +=
                    (targetVolumesRef.current[kind] - currentVolumesRef.current[kind]) *
                    smoothing;
                currentVolumesRef.current[kind] = Math.max(
                    0,
                    Math.min(1, currentVolumesRef.current[kind])
                );
            }
            audio.volume = currentVolumesRef.current[kind];
        };

        processFadeOrSmooth("space", space);
        processFadeOrSmooth("ground", ground);

        if (!enabled) {
            if (!space.paused) space.pause();
            if (!ground.paused) ground.pause();
        } else {
            if (space.paused) space.play().catch(() => {});
            if (ground.paused) ground.play().catch(() => {});
        }
    });

    return null;
}
