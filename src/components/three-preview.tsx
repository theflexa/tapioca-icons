"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { getAnimation } from "@/lib/animations";
import type { AnimationType } from "@/lib/style-prompt";

interface IconPlaneProps {
  texture: THREE.Texture;
  animationType: AnimationType;
  playing: boolean;
  speed: number;
  duration: number;
}

function IconPlane({ texture, animationType, playing, speed, duration }: IconPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const animFn = getAnimation(animationType);

  useFrame((state, delta) => {
    if (!meshRef.current || !playing) return;
    timeRef.current += (delta * speed) / duration;
    if (timeRef.current >= 1) timeRef.current -= 1;
    const anim = animFn(timeRef.current);
    meshRef.current.position.set(...anim.position);
    meshRef.current.rotation.set(...anim.rotation);
    meshRef.current.scale.set(...anim.scale);
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1.5, 1.5]} />
      <meshStandardMaterial map={texture} transparent alphaTest={0.01} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface DynamicShadowProps {
  animationType: AnimationType;
  playing: boolean;
  speed: number;
  duration: number;
}

function DynamicShadow({ animationType, playing, speed, duration }: DynamicShadowProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const animFn = getAnimation(animationType);

  useFrame((_, delta) => {
    if (!groupRef.current || !playing) return;
    timeRef.current += (delta * speed) / duration;
    if (timeRef.current >= 1) timeRef.current -= 1;
    const anim = animFn(timeRef.current);
    groupRef.current.scale.setScalar(anim.shadowScale);
  });

  return (
    <group ref={groupRef}>
      <ContactShadows position={[0, -0.8, 0]} opacity={0.4} scale={3} blur={2.5} far={2} />
    </group>
  );
}

interface CameraControllerProps {
  animationType: AnimationType;
  playing: boolean;
  speed: number;
  duration: number;
  controlsRef: React.RefObject<any>;
}

function CameraController({ animationType, playing, speed, duration, controlsRef }: CameraControllerProps) {
  const { camera } = useThree();
  const timeRef = useRef(0);
  const animFn = getAnimation(animationType);

  useFrame((_, delta) => {
    if (animationType !== "orbit" || !playing) return;
    timeRef.current += (delta * speed) / duration;
    if (timeRef.current >= 1) timeRef.current -= 1;
    const anim = animFn(timeRef.current);
    if (anim.cameraPosition) {
      camera.position.set(...anim.cameraPosition);
      camera.lookAt(0, 0, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
  });

  return null;
}

interface ThreePreviewProps {
  textureUrl: string | null;
  animationType: AnimationType;
  duration: number;
  fps: number;
}

export function ThreePreview({ textureUrl, animationType, duration }: ThreePreviewProps) {
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const controlsRef = useRef(null);

  useEffect(() => {
    if (!textureUrl) { setTexture(null); return; }
    const loader = new THREE.TextureLoader();
    loader.load(textureUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      setTexture(tex);
    });
  }, [textureUrl]);

  if (!textureUrl || !texture) {
    return (
      <div className="flex items-center justify-center w-[400px] h-[400px] bg-zinc-900 rounded-lg border border-zinc-800">
        <p className="text-zinc-500">Generate an icon to preview</p>
      </div>
    );
  }

  const handleResetCamera = () => {
    if (controlsRef.current) {
      (controlsRef.current as any).reset();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="rounded-lg border border-zinc-800 overflow-hidden"
        style={{
          width: 400, height: 400,
          backgroundImage: "repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%)",
          backgroundSize: "20px 20px",
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 3], fov: 50 }}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 4]} intensity={0.8} />
          <IconPlane texture={texture} animationType={animationType} playing={playing} speed={speed} duration={duration} />
          <DynamicShadow animationType={animationType} playing={playing} speed={speed} duration={duration} />
          <CameraController animationType={animationType} playing={playing} speed={speed} duration={duration} controlsRef={controlsRef} />
          <OrbitControls ref={controlsRef} enablePan={false} minDistance={1.5} maxDistance={6} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI * 3 / 4} />
        </Canvas>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => setPlaying(!playing)} className="px-3 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700">
          {playing ? "Pause" : "Play"}
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          Speed
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="bg-zinc-800 rounded px-2 py-1 text-zinc-100">
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>
        </label>
        <button onClick={handleResetCamera} className="px-3 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700">
          Reset Camera
        </button>
      </div>
    </div>
  );
}
