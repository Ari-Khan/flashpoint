import { createPortal } from "react-dom";

export default function Tooltip({ text, x, y }) {
  if (!text) return null;

  return createPortal(
    <div
      className="floating-tooltip"
      style={{ left: `${x}px`, top: `${y}px` }}
      role="tooltip"
    >
      {text}
    </div>,
    document.body
  );
}
