import { useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Float,
  Sparkles,
  Environment,
  Html,
  useCursor,
} from "@react-three/drei";
import * as THREE from "three";
import { Model as CrystalSpinnerModel } from "@/components/CrystalSpinnerModel";

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C870";
const GOLD_PALE = "#F5E6B5";
const MAROON = "#6B0F1A";
const MAROON_DARK = "#3D0610";
const MAROON_LIGHT = "#8B1A2A";

// ─── Scroll progress hook (reads window scroll, no re-render) ─────────────────
function useScrollProgress() {
  const scrollRef = useRef(0);
  useFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollRef.current = max > 0 ? window.scrollY / max : 0;
  });
  return scrollRef;
}

// ─── Stage 0: Hero — Crystal + Particles ──────────────────────────────────────
function HeroStage({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const p = scrollRef.current;

    // Stage 0 visible: 0.0 - 0.15
    // Fade out & move away as we scroll past hero
    const visibility = THREE.MathUtils.clamp(1 - p / 0.15, 0, 1);
    groupRef.current.position.z = -p * 20; // move away as scroll
    groupRef.current.children.forEach((child) => {
      child.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.Material & { opacity: number; transparent: boolean };
          mat.transparent = true;
          mat.opacity = visibility;
        }
      });
    });

    // Auto-rotation
    groupRef.current.rotation.y += 0.005;
    // Pointer tilt
    const { pointer } = state;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      pointer.y * 0.3,
      0.05
    );
  });

  return (
    <group ref={groupRef} scale={3.5}>
      <Float speed={1.5} rotationIntensity={0.4} floatIntensity={1.2}>
        <CrystalSpinnerModel />
      </Float>
    </group>
  );
}

// ─── Stage 1: Services — Floating 3D cards ────────────────────────────────────
interface ServiceCard3DProps {
  position: [number, number, number];
  color: string;
  index: number;
  scrollRef: React.RefObject<number>;
}

function ServiceCard3D({ position, color, index, scrollRef }: ServiceCard3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame((state) => {
    if (!meshRef.current) return;
    const p = scrollRef.current;

    // Stage 1 visible: 0.15 - 0.35
    const stageProgress = THREE.MathUtils.clamp((p - 0.15) / 0.2, 0, 1);
    const visibility = THREE.MathUtils.clamp(1 - (p - 0.35) / 0.05, 0, 1);

    // Cards fly in from depth
    const targetZ = position[2] + (1 - stageProgress) * -10;
    meshRef.current.position.z = THREE.MathUtils.lerp(
      meshRef.current.position.z,
      targetZ,
      0.1
    );

    // Hover: scale up + rotate
    const targetScale = hovered ? 1.3 : 1;
    meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.15);
    meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScale, 0.15);
    meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale, 0.15);

    // Gentle rotation
    meshRef.current.rotation.y += 0.003;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.1;

    // Opacity
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.transparent = true;
    mat.opacity = visibility * (hovered ? 1 : 0.85);
    mat.emissiveIntensity = hovered ? 0.6 : 0.2;
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      castShadow
    >
      <boxGeometry args={[1.5, 2, 0.1]} />
      <meshStandardMaterial
        color={color}
        metalness={0.7}
        roughness={0.2}
        emissive={GOLD}
        emissiveIntensity={0.2}
      />
      {/* Label on card face */}
      <Html
        position={[0, 0, 0.06]}
        center
        distanceFactor={8}
        occlude
        style={{
          pointerEvents: "none",
          color: GOLD_PALE,
          fontSize: "24px",
          fontWeight: "bold",
          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          whiteSpace: "nowrap",
        }}
      >
        Service {index + 1}
      </Html>
    </mesh>
  );
}

function ServicesStage({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  const cards = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        position: [
          Math.cos((i / 6) * Math.PI * 2) * 4,
          Math.sin((i / 6) * Math.PI * 2) * 2.5,
          0,
        ] as [number, number, number],
        color: i % 2 === 0 ? MAROON : MAROON_LIGHT,
      })),
    []
  );

  useFrame(() => {
    if (groupRef.current) {
      const p = scrollRef.current;
      // Group slowly rotates during services stage
      const stageProgress = THREE.MathUtils.clamp((p - 0.15) / 0.2, 0, 1);
      groupRef.current.rotation.y = stageProgress * Math.PI * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -15]}>
      {cards.map((card, i) => (
        <ServiceCard3D
          key={i}
          position={card.position}
          color={card.color}
          index={i}
          scrollRef={scrollRef}
        />
      ))}
    </group>
  );
}

// ─── Stage 2: Gallery — 3D picture frames ─────────────────────────────────────
function GalleryStage({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  const frames = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        position: [
          (i - 2) * 3.5,
          Math.sin(i * 1.5) * 1.5,
          0,
        ] as [number, number, number],
        rotation: [0, (i - 2) * 0.15, 0] as [number, number, number],
      })),
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const p = scrollRef.current;

    // Stage 2 visible: 0.35 - 0.55
    const stageProgress = THREE.MathUtils.clamp((p - 0.35) / 0.2, 0, 1);
    const visibility = THREE.MathUtils.clamp(1 - (p - 0.55) / 0.05, 0, 1);

    // Group moves into view from the right
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      -15 + stageProgress * 15,
      0.1
    );

    // Subtle floating
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.3;

    groupRef.current.children.forEach((child, i) => {
      child.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = visibility;
        }
      });
    });
  });

  return (
    <group ref={groupRef} position={[-15, 0, -30]}>
      {frames.map((frame, i) => (
        <Float key={i} speed={1 + i * 0.2} floatIntensity={1.5}>
          <mesh position={frame.position} rotation={frame.rotation} castShadow>
            <planeGeometry args={[2.5, 3]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? GOLD : GOLD_LIGHT}
              metalness={0.6}
              roughness={0.3}
              emissive={MAROON_DARK}
              emissiveIntensity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

// ─── Stage 3: Promotions — 3D floating banners ────────────────────────────────
function PromotionsStage({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  const banners = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        position: [
          Math.sin((i / 4) * Math.PI * 2) * 5,
          Math.cos((i / 4) * Math.PI * 2) * 3,
          -i * 2,
        ] as [number, number, number],
      })),
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const p = scrollRef.current;

    // Stage 3 visible: 0.55 - 0.75
    const stageProgress = THREE.MathUtils.clamp((p - 0.55) / 0.2, 0, 1);
    const visibility = THREE.MathUtils.clamp(1 - (p - 0.75) / 0.05, 0, 1);

    // Spiral motion
    groupRef.current.rotation.y = stageProgress * Math.PI * 2;
    groupRef.current.position.z = -30 + stageProgress * 10;

    groupRef.current.children.forEach((child) => {
      child.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = visibility;
        }
      });
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, -30]}>
      {banners.map((banner, i) => (
        <Float key={i} speed={2} floatIntensity={2} rotationIntensity={0.5}>
          <mesh position={banner.position} castShadow>
            <planeGeometry args={[3, 1.5]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? MAROON : MAROON_LIGHT}
              metalness={0.5}
              roughness={0.3}
              emissive={GOLD}
              emissiveIntensity={0.25}
              side={THREE.DoubleSide}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

// ─── Scroll-driven camera — moves through all stages ──────────────────────────
function JourneyCamera({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  const { camera } = useThree();

  useFrame((state) => {
    const p = scrollRef.current;

    // Camera journey path — moves through Z depth as user scrolls
    // Stage 0 (0.00-0.15): z=8, looking at crystal
    // Stage 1 (0.15-0.35): z=0, moving toward services cards at z=-15
    // Stage 2 (0.35-0.55): z=-15, gallery frames at z=-30
    // Stage 3 (0.55-0.75): z=-30, promotions at z=-30
    // End    (0.75-1.00): z=-25, pull back slightly

    const stages = [
      { p: 0.0, z: 8, y: 0, x: 0 },
      { p: 0.15, z: 5, y: 0.5, x: 0 },
      { p: 0.35, z: -5, y: 0, x: 0 },
      { p: 0.55, z: -20, y: 0, x: 0 },
      { p: 0.75, z: -25, y: 1, x: 0 },
      { p: 1.0, z: -20, y: 0, x: 0 },
    ];

    // Find current stage segment and interpolate
    let targetZ = 8, targetY = 0, targetX = 0;
    for (let i = 0; i < stages.length - 1; i++) {
      if (p >= stages[i].p && p <= stages[i + 1].p) {
        const localP = (p - stages[i].p) / (stages[i + 1].p - stages[i].p);
        targetZ = THREE.MathUtils.lerp(stages[i].z, stages[i + 1].z, localP);
        targetY = THREE.MathUtils.lerp(stages[i].y, stages[i + 1].y, localP);
        targetX = THREE.MathUtils.lerp(stages[i].x, stages[i + 1].x, localP);
        break;
      }
    }

    // Smooth camera movement
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);

    // Slight mouse parallax on camera
    const { pointer } = state;
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, pointer.x * 0.1, 0.05);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, -pointer.y * 0.05, 0.05);
  });

  return null;
}

// ─── Main scene ───────────────────────────────────────────────────────────────
function Scene() {
  const scrollRef = useScrollProgress();

  return (
    <>
      {/* ⬇️ LIGHTING — pencahayaan scene */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color={GOLD_LIGHT} />
      <pointLight position={[-5, -3, -5]} intensity={0.5} color={MAROON} />
      <pointLight position={[0, 0, 3]} intensity={0.6} color={GOLD_PALE} />

      {/* ⬇️ STAGES — tiap stage adalah "ruang" 3D yang dilewati kamera saat scroll */}
      <HeroStage scrollRef={scrollRef} />
      <ServicesStage scrollRef={scrollRef} />
      <GalleryStage scrollRef={scrollRef} />
      <PromotionsStage scrollRef={scrollRef} />

      {/* ⬇️ PARTICLE FIELD — sparkle emas menyebar di seluruh scene */}
      <Sparkles count={200} scale={30} size={3} speed={0.3} opacity={0.6} color={GOLD_LIGHT} />
      <Sparkles count={100} scale={20} size={5} speed={0.15} opacity={0.4} color={GOLD_PALE} />

      <Environment preset="sunset" />
      <JourneyCamera scrollRef={scrollRef} />

      {/* ⬇️ FOG — kabut untuk efek kedalaman antar stage */}
      <fog attach="fog" args={[MAROON_DARK, 10, 40]} />
    </>
  );
}

// ─── Export — full screen fixed canvas ─────────────────────────────────────────
export default function Full3DScene() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        // ⬇️ KAMERA AWAL — position [x, y, z], fov = lensa
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
