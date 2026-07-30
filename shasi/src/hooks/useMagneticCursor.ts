import { useEffect, useRef, useState } from "react";

interface MagneticCursorState {
  /** Current cursor X position (px, from left). */
  x: number;
  /** Current cursor Y position (px, from top). */
  y: number;
  /** Normalized X (-1 to 1, left to right). */
  nx: number;
  /** Normalized Y (-1 to 1, top to bottom). */
  ny: number;
  /** Whether cursor is currently hovering a magnetic element. */
  isHovering: boolean;
}

/**
 * Magnetic cursor hook — tracks mouse position globally and provides
 * normalized values for parallax / magnetic effects.
 *
 * Usage:
 *   const cursor = useMagneticCursor();
 *   // cursor.nx = -1 (left edge) to 1 (right edge)
 *   // cursor.ny = -1 (top) to 1 (bottom)
 *
 * For 3D parallax: rotateX = cursor.ny * maxAngle, rotateY = cursor.nx * maxAngle
 * For magnetic pull: translateX = cursor.nx * maxDistance
 *
 * Disabled on touch devices (no mouse movement).
 */
export function useMagneticCursor(): MagneticCursorState {
  const [state, setState] = useState<MagneticCursorState>({
    x: 0,
    y: 0,
    nx: 0,
    ny: 0,
    isHovering: false,
  });

  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Skip on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      setState((prev) => ({
        ...prev,
        isHovering: !!target.closest("[data-magnetic]"),
      }));
    };

    // Smooth interpolation loop
    const animate = () => {
      const target = targetRef.current;
      const current = currentRef.current;

      // Lerp factor — lower = smoother/slower follow
      const lerp = 0.12;
      current.x += (target.x - current.x) * lerp;
      current.y += (target.y - current.y) * lerp;

      const nx = (current.x / window.innerWidth) * 2 - 1;
      const ny = (current.y / window.innerHeight) * 2 - 1;

      setState((prev) => {
        // Only update if changed significantly (avoid re-render spam)
        if (
          Math.abs(prev.x - current.x) < 0.5 &&
          Math.abs(prev.y - current.y) < 0.5
        ) {
          return prev;
        }
        return { ...prev, x: current.x, y: current.y, nx, ny };
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return state;
}
