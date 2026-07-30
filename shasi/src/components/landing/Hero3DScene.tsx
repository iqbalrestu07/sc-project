import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Model as CrystalSpinnerModel } from "@/components/CrystalSpinnerModel";

// ─── Design tokens (sync with HeroSection) ────────────────────────────────────
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C870";
const GOLD_PALE = "#F5E6B5";
const MAROON = "#6B0F1A";
const MAROON_DARK = "#3D0610";

// ─── Crystal model (from Sketchfab — crystal_spinner) ─────────────────────────
function Crystal() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    // ⬇️ AUTO-ROTATION — putar otomatis di sumbu Y (horizontal)
    // 0.005 = derajat per frame. Naikkan untuk putar lebih cepat.
    groupRef.current.rotation.y += 0.005;

    // ⬇️ TILT MENGIKUTI POINTER — kristal miring mengikuti mouse
    // pointer.y = posisi mouse vertikal (-1 atas, +1 bawah)
    // pointer.x = posisi mouse horizontal (-1 kiri, +1 kanan)
    // 0.3 & 0.2 = max tilt angle (radian). Naikkan untuk tilt lebih ekstrem.
    // 0.05 = smoothing speed (0-1). Kecilkan untuk respons lebih lambat/halus.
    const { pointer } = state;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      pointer.y * 0.3,   // tilt atas-bawah
      0.05
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      -pointer.x * 0.2,  // tilt kiri-kanan (negatif supaya natural)
      0.05
    );
  });

  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={1.2}>
      {/* ⬇️ SCALE KRISTAL UTAMA
          scale = ukuran keseluruhan model. Naikkan untuk kristal lebih besar.
          Default: 3.5. Range umum: 1 (kecil) - 5 (sangat besar) */}
      <group ref={groupRef} scale={1.5}>
        <CrystalSpinnerModel />
      </group>
    </Float>
  );
}

// ─── Orbiting smaller crystals ────────────────────────────────────────────────
function OrbitingCrystals() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // ⬇️ ROTASI GROUP ORBIT — seluruh grup kristal kecil berputar bersama
      // delta = waktu antar frame (detik). 0.15 = kecepatan sudut per detik.
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  const orbiters = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        angle: (i / 6) * Math.PI * 2,    // sudut awal tiap kristal (tersebar merata)
        radius: 3.5 + Math.random() * 0.5, // ⬇️ JARAK ORBIT dari tengah. Naikkan = kristal kecil makin jauh
        size: 0.2 + Math.random() * 0.02,  // ⬇️ UKURAN kristal kecil. Naikkan = lebih besar
        speed: 0.5 + Math.random(),        // kecepatan Float (melayang naik-turun)
      })),
    []
  );

  return (
    <group ref={groupRef}>
      {orbiters.map((o, i) => (
        <Float key={i} speed={o.speed} floatIntensity={2}>
          <mesh
            // ⬇️ POSISI KRYSTAL KECIL [x, y, z] — sumbu 3D
            // x = kiri/kanan (negatif=kiri, positif=kanan)
            // y = atas/bawah (negatif=bawah, positif=atas)
            // z = depan/belakang (negatif=lebih jauh dari kamera, positif=lebih dekat)
            position={[
              Math.cos(o.angle) * o.radius,    // x: gerakan melingkar horizontal
              Math.sin(o.angle * 2) * 1.2,      // y: naik-turun dengan pola sinus ganda
              Math.sin(o.angle) * o.radius,    // z: gerakan melingkar kedalaman
            ]}
            scale={o.size}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? GOLD_LIGHT : GOLD_PALE}
              metalness={0.9}    // 0 = tidak logam, 1 = full logam (reflektif)
              roughness={0.1}    // 0 = halus/mengkilap, 1 = kasar/mat
              emissive={GOLD}   // warna cahaya yang dipancarkan sendiri
              emissiveIntensity={0.3}  // intensitas cahaya sendiri (0 = tidak menyala)
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

// ─── Scroll-driven camera ─────────────────────────────────────────────────────
function ScrollCamera({ scrollProgress }: { scrollProgress: () => number }) {
  const { camera } = useThree();

  useFrame(() => {
    const p = scrollProgress();  // 0 = posisi paling atas, 1 = sudah scroll penuh
    // ⬇️ ZOOM SAAT SCROLL — kamera bergerak maju & naik seiring scroll
    // lerp(nilaiAwal, nilaiAkhir, progress) — interpolasi linier
    camera.position.z = THREE.MathUtils.lerp(8, 4, p);   // z: 8 (jauh) → 4 (dekat) = zoom in
    camera.position.y = THREE.MathUtils.lerp(0, 0.8, p); // y: 0 (tengah) → 0.8 (naik sedikit)
    camera.lookAt(0, 0, 0);  // kamera selalu melihat ke titik tengah (0,0,0)
  });

  return null;
}

// ─── Main scene ───────────────────────────────────────────────────────────────
interface Hero3DSceneProps {
  scrollProgress: () => number;
  /** Tampilkan kristal utama (CrystalSpinnerModel). Default: true.
   *  Set false untuk mode "orbit only" — orbiting crystals + particles tetap ada,
   *  tapi model GLB yang berat di-skip. */
  showCrystal?: boolean;
}

function Scene({ scrollProgress, showCrystal = true }: Hero3DSceneProps) {
  return (
    <>
      {/* ⬇️ LIGHTING — pencahayaan scene. Tanpa ini, semua objek gelap.
          ambientLight = cahaya merata dari segala arah (intensity 0-1)
          directionalLight = cahaya seperti matahari (satu arah, ada bayangan)
          pointLight = cahaya seperti bohlam (menyebar ke segala arah dari titik) */}
      <ambientLight intensity={0.3} />
      {/* position [x, y, z]: x=kanan(+)/kiri(-), y=atas(+)/bawah(-), z=depan(+)/belakang(-) */}
      <directionalLight position={[5, 5, 5]} intensity={0.8} color={GOLD_LIGHT} />
      <pointLight position={[-5, -3, -5]} intensity={0.5} color={MAROON} />
      <pointLight position={[0, 0, 3]} intensity={0.6} color={GOLD_PALE} />

      {/* ⬇️ KRISTAL UTAMA — hanya muncul jika showCrystal=true
          (mode hero3d). Di mode 2d/orbit-only, kristal di-skip untuk hemat
          bundle (CrystalSpinnerModel GLB tidak di-load). */}
      {showCrystal && <Crystal />}
      <OrbitingCrystals />

      {/* ⬇️ PARTICLE FIELD — sparkle emas yang melayang di sekitar kristal
          count = jumlah particle (naikkan = lebih ramai, tapi lebih berat GPU)
          scale = area sebaran 3D (naikkan = menyebar lebih luas)
          size = ukuran tiap particle (naikkan = sparkle lebih besar)
          speed = kecepatan gerak (naikkan = lebih cepat bergerak)
          opacity = transparansi (0 = tidak terlihat, 1 = solid) */}
      <Sparkles
        count={120}
        scale={12}
        size={3}
        speed={0.4}
        opacity={0.7}
        color={GOLD_LIGHT}
      />
      <Sparkles
        count={60}
        scale={8}
        size={5}
        speed={0.2}
        opacity={0.5}
        color={GOLD_PALE}
      />

      <Environment preset="sunset" />
      <ScrollCamera scrollProgress={scrollProgress} />

      {/* ⬇️ FOG — kabut untuk efek kedalaman, menyatu dengan background hero
          args=[warna, jarakMulai, jarakAkhir]
          warna = warna fog (MAROON_DARK supaya blend dengan hero)
          jarakMulai = jarak kamera mulai fog (kecil = fog mulai lebih dekat)
          jarakAkhir = jarak kamera objek hilang sepenuhnya (kecil = fog lebih tebal) */}
      <fog attach="fog" args={[MAROON_DARK, 6, 18]} />
    </>
  );
}

export default function Hero3DScene({
  scrollProgress,
  showCrystal = true,
}: Hero3DSceneProps) {
  return (
    <Canvas
      // ⬇️ PENGATURAN KAMERA — posisi awal & lensa
      // position [x, y, z]:
      //   x = geser kamera kiri(-)/kanan(+) — 0 = tengah
      //   y = geser kamera bawah(-)/atas(+) — 0 = sejajar objek
      //   z = jarak kamera ke objek — KECILKAN = zoom in (objek lebih besar), BESARKAN = zoom out
      // fov = field of view (derajat) — naikkan = wide angle (objek tampak lebih kecil, area terlihat lebih luas)
      camera={{ position: [0, 0, 15], fov: 150 }}
      // dpr = device pixel ratio [min, max] — turunkan max untuk hemat GPU di HP (mis. [1, 1.5])
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}  // antialias = haluskan tepi, alpha = background transparan
      style={{ background: "transparent" }}
    >
      <Scene scrollProgress={scrollProgress} showCrystal={showCrystal} />
    </Canvas>
  );
}
