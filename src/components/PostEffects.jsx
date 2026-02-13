import { useEffect, useRef, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Noise, Scanline, Vignette, Glitch, DepthOfField } from "@react-three/postprocessing";
import { BlendFunction, GlitchMode } from "postprocessing";

const GLITCH_CONFIG = {
    ambient: { strength: [0.04, 0.2], mode: GlitchMode.CONSTANT_MILD, duration: 300 },
    launch: { strength: [0.18, 0.6], mode: GlitchMode.CONSTANT_WILD, duration: 600 },
};

const STARTUP_GRACE = 7000;
const BLUR_MEAN_SECONDS = 30;
const BLUR_DURATION_MS = 3000;
const BLUR_RISE_PORTION = 0.03;
const BLUR_SCALE = 15.0;

const sampleDelayMs = (meanSeconds) => {
    const u1 = Math.random();
    const u2 = Math.random();
    const u3 = Math.random();
    const scale = Math.max(0, meanSeconds * 1000) / 3;
    return -Math.log(u1 * u2 * u3) * scale;
};

const PostEffects = memo(({ dataRef, meanIntervalSeconds = 30, enabled = true, multisampling = 0 }) => {
    const glitchRef = useRef();
    const blurRef = useRef();
    const blurTimerRef = useRef(null);
    const blurAnimRef = useRef(null);
    const minIntervalMs = Math.max(0, meanIntervalSeconds * 1000);
    
    const internal = useRef({
        lastLaunch: -Infinity,
        lastTrigger: 0,
        timer: null,
        spawnTime: Date.now()
    });

    const trigger = (type) => {
        const now = Date.now();
        const config = GLITCH_CONFIG[type];
        
        if (!glitchRef.current || now - internal.current.lastTrigger < minIntervalMs) return;
        if (now - internal.current.spawnTime < STARTUP_GRACE) return;

        internal.current.lastTrigger = now;
        
        glitchRef.current.mode = config.mode;
        if (glitchRef.current.strength) {
            glitchRef.current.strength.set(config.strength[0], config.strength[1]);
        }

        setTimeout(() => {
            if (glitchRef.current) glitchRef.current.mode = GlitchMode.DISABLED;
        }, config.duration);
    };

    useEffect(() => {
        if (!enabled) return;

        const schedule = () => {
            const delay = sampleDelayMs(meanIntervalSeconds);
            internal.current.timer = setTimeout(() => {
                trigger("ambient");
                schedule();
            }, delay);
        };

        schedule();
        return () => clearTimeout(internal.current.timer);
    }, [enabled, meanIntervalSeconds]);

    useEffect(() => {
        if (!enabled) return;

        const animateBlur = (startTime) => {
            if (!blurRef.current) return;
            const elapsed = performance.now() - startTime;
            const t = Math.min(1, elapsed / BLUR_DURATION_MS);
            const ramp = t < BLUR_RISE_PORTION
                ? t / BLUR_RISE_PORTION
                : 1 - (t - BLUR_RISE_PORTION) / (1 - BLUR_RISE_PORTION);
            blurRef.current.bokehScale = BLUR_SCALE * ramp;
            if (t < 1) {
                blurAnimRef.current = requestAnimationFrame(() => animateBlur(startTime));
            } else {
                blurRef.current.bokehScale = 0;
                blurAnimRef.current = null;
            }
        };

        const scheduleBlur = () => {
            const delay = sampleDelayMs(BLUR_MEAN_SECONDS);
            blurTimerRef.current = setTimeout(() => {
                if (blurAnimRef.current) cancelAnimationFrame(blurAnimRef.current);
                animateBlur(performance.now());
                scheduleBlur();
            }, delay);
        };

        scheduleBlur();
        return () => {
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
            if (blurAnimRef.current) cancelAnimationFrame(blurAnimRef.current);
            if (blurRef.current) blurRef.current.bokehScale = 0;
        };
    }, [enabled]);

    useFrame((state) => {
        if (!enabled) return;

        const data = dataRef?.current;
        if (!data?.events?.length) return;

        if (data.currentTime < internal.current.lastLaunch - 1) {
            internal.current.lastLaunch = -Infinity;
        }

        const latest = data.events[data.events.length - 1];
        if (latest?.type === "launch" && latest.t > internal.current.lastLaunch && latest.t <= Math.ceil(data.currentTime)) {
            internal.current.lastLaunch = latest.t;
            trigger("launch");
        }
    });

    if (!enabled) return null;

    return (
        <EffectComposer multisampling={multisampling} disableNormalPass>
            <Noise
                opacity={0.4}
                blendFunction={BlendFunction.NORMAL}
                premultiply
            />
            <DepthOfField
                ref={blurRef}
                focusDistance={0}
                focusRange={1}
                bokehScale={0}
                focalLength={0.02}
            />
            <Scanline density={1.2} opacity={0.015} />
            <Vignette eskil={false} offset={0.15} darkness={0.35} />
            <Glitch
                ref={glitchRef}
                mode={GlitchMode.DISABLED}
                delay={[10, 60]}
                duration={[0.1, 0.4]}
                strength={[0.04, 0.2]}
                ratio={0.28}
            />
        </EffectComposer>
    );
});

export default PostEffects;