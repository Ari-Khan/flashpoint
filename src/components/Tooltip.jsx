import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ text, x, y, fadeDuration = 300 }) {
    const [renderText, setRenderText] = useState(null);
    const [active, setActive] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    if (text) {
        lastPos.current = { x, y };
    }

    useEffect(() => {
        let timeout;
        if (text) {
            setRenderText(text);
            const raf = requestAnimationFrame(() => setActive(true));
            return () => cancelAnimationFrame(raf);
        } else {
            setActive(false);
            timeout = setTimeout(() => setRenderText(null), fadeDuration);
        }
        return () => clearTimeout(timeout);
    }, [text, fadeDuration]);

    if (!renderText) return null;

    return createPortal(
        <div
            className={`floating-tooltip ${active ? "show" : ""}`}
            style={{
                position: "fixed",
                left: 0,
                top: 0,
                transform: `translate3d(${lastPos.current.x}px, ${lastPos.current.y}px, 0)`,
                opacity: active ? 1 : 0,
                transition: `opacity ${fadeDuration}ms ease-in-out`,
                pointerEvents: "none",
                zIndex: 9999,
            }}
            role="tooltip"
        >
            {renderText}
        </div>,
        document.body
    );
}
