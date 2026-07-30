import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface TiltCardProps {
  children: ReactNode;
  /** Max tilt angle in degrees. Default: 12 */
  maxTilt?: number;
  /** Scale on hover. Default: 1.02 */
  hoverScale?: number;
  /** Glow color on hover. Default: gold (#C9A84C) */
  glowColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Pseudo-3D tilt card with dramatic hover effects:
 * - Pointer-following tilt (rotateX/rotateY)
 * - Scale up on hover
 * - Gold glow shadow on hover
 * - data-magnetic attribute for useMagneticCursor detection
 *
 * On touch devices the tilt is disabled (card stays flat).
 */
export function TiltCard({
  children,
  maxTilt = 12,
  hoverScale = 1.02,
  glowColor = "#C9A84C",
  className = "",
  style,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Motion values for pointer position (-0.5 to 0.5)
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  // Smoothed springs so the tilt eases in/out naturally
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [maxTilt, -maxTilt]), {
    stiffness: 200,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-maxTilt, maxTilt]), {
    stiffness: 200,
    damping: 20,
  });

  // Glow position follows pointer (radial gradient)
  const glowX = useTransform(px, [-0.5, 0.5], ["0%", "100%"]);
  const glowY = useTransform(py, [-0.5, 0.5], ["0%", "100%"]);
  const glowOpacity = useSpring(0, { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
    glowOpacity.set(0.25);
  };

  const handleMouseEnter = () => {
    glowOpacity.set(0.25);
  };

  const handleMouseLeave = () => {
    px.set(0);
    py.set(0);
    glowOpacity.set(0);
  };

  return (
    <motion.div
      ref={ref}
      data-magnetic
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: hoverScale }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
        position: "relative",
        ...style,
      }}
      className={className}
    >
      {/* Dramatic glow overlay — radial gradient follows pointer */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: useTransform(
            [glowX, glowY],
            ([x, y]) =>
              `radial-gradient(circle at ${x} ${y}, ${glowColor}40 0%, transparent 60%)`
          ),
          opacity: glowOpacity,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Content above glow */}
      <div style={{ position: "relative", zIndex: 2, transform: "translateZ(20px)" }}>
        {children}
      </div>
    </motion.div>
  );
}
