import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ text, x, y, fadeDuration = 150 }) {
  const [visibleText, setVisibleText] = useState(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [show, setShow] = useState(false);

  useEffect(() => {
    let t;
    if (text) {
      setVisibleText(text);
      setPos({ x, y });
      // use rAF to show immediately, letting the transition perform the fade
      requestAnimationFrame(() => setShow(true));
      return () => clearTimeout(t);
    }
    if (visibleText) {
      setShow(false);
      t = setTimeout(() => setVisibleText(null), fadeDuration + 10);
    }
    return () => clearTimeout(t);
  }, [text, x, y, fadeDuration]);

  if (!visibleText) return null;

  return createPortal(
    <div
      className={`floating-tooltip ${show ? "show" : ""}`}
      style={{ left: `${pos.x}px`, top: `${pos.y}px`, transitionDuration: `${fadeDuration}ms` }}
      role="tooltip"
    >
      {visibleText}
    </div>,
    document.body
  );
}
