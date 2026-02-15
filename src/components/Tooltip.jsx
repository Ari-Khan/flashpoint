import { useEffect, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ text, x, y, fadeDuration = 200 }) {
    const [visible, setVisible] = useState(false);
    const [content, setContent] = useState(null);
    const [pos, setPos] = useState({ x, y });

    useLayoutEffect(() => {
        if (text) {
            setPos({ x, y });
        }
    }, [text, x, y]);

    useEffect(() => {
        if (text) {
            setContent(text);
            const raf = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(raf);
        } else {
            setVisible(false);
            const timer = setTimeout(() => setContent(null), fadeDuration);
            return () => clearTimeout(timer);
        }
    }, [text, fadeDuration]);

    if (!content) return null;

    return createPortal(
        <div
            className="floating-tooltip"
            style={{
                position: "fixed",
                left: 0,
                top: 0,
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                opacity: visible ? 1 : 0,
                transition: `opacity ${fadeDuration}ms ease-out`,
                pointerEvents: "none",
                zIndex: 9999,
                willChange: "transform, opacity",
            }}
            role="tooltip"
        >
            {content}
        </div>,
        document.body
    );
}
