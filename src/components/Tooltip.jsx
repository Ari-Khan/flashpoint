import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ text, x, y, fadeDuration = 300 }) {
    const [renderText, setRenderText] = useState(null);
    const [active, setActive] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (text) setPos({ x, y });
    }, [text, x, y]);

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
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
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
