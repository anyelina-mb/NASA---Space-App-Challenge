// 3D body: click parts to select them. Reports mesh names to the parent.
// Loads the Blender models from /public/models (23 parts, named like body-parts.json).
// Props:
//   selected   mesh names to highlight
//   colors     optional { meshName: 'green' | 'yellow' | 'red' } to tint parts by status
//   facing     'front' | 'back'  (Front / Back buttons)
//   autoRotate spin slowly (Rotate button)
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Box3, Vector3 } from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, Bounds } from '@react-three/drei';

const SELECTED = '#ff8a3d';
const HOVER = '#7fd1ff';
const BASE = '#d9dee8';
const STATUS = { green: '#2bb673', yellow: '#f2b705', red: '#e5383b' };

function Body({ url, selected, colors, hovered, onPick, onHover, facing, autoRotate }) {
  const { scene } = useGLTF(url);
  // Clone (each screen gets its own colors) and move the body so its center is exactly at 0,0,0
  const model = useMemo(() => {
    const m = scene.clone(true);
    m.updateMatrixWorld(true);
    const c = new Box3().setFromObject(m).getCenter(new Vector3());
    m.position.sub(c);
    return m;
  }, [scene]);
  const group = useRef();
  const target = facing === 'back' ? Math.PI : 0;

  useEffect(() => {
    model.traverse((obj) => {
      if (!obj.isMesh) return;
      if (!obj.userData.ownMaterial) { obj.material = obj.material.clone(); obj.userData.ownMaterial = true; }
      const c = selected.includes(obj.name) ? SELECTED
        : hovered === obj.name ? HOVER
          : colors?.[obj.name] ? (STATUS[colors[obj.name]] ?? colors[obj.name]) : BASE;
      obj.material.color.set(c);
      obj.material.roughness = 0.55;
      obj.material.metalness = 0;
    });
  }, [model, selected, hovered, colors]);

  useFrame((_, dt) => {
    if (!group.current) return;
    if (autoRotate) { group.current.rotation.y += dt * 0.6; return; }
    // turn smoothly to front or back
    const r = group.current.rotation.y % (Math.PI * 2);
    group.current.rotation.y = r + (target - r) * Math.min(1, dt * 6);
  });

  return (
    <group ref={group}>
      <primitive
          object={model}
          onClick={(e) => { e.stopPropagation(); onPick?.(e.object.name); }}
          onPointerOver={(e) => { e.stopPropagation(); onHover(e.object.name); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { onHover(null); document.body.style.cursor = ''; }}
      />
    </group>
  );
}

export default function BodyViewer({ selected = [], onToggle, colors, modelUrl = '/models/body.glb', facing = 'front', autoRotate = false, zoom = 1 }) {
  const [hovered, setHovered] = useState(null);
  return (
    <Canvas resize={{ offsetSize: true }} camera={{ position: [0, 0, 3], fov: 30 }} gl={{ alpha: true, antialias: true }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 3, 3]} intensity={1.2} />
      <directionalLight position={[-2, 1, -2]} intensity={0.5} color="#7fd1ff" />
      <Suspense fallback={<Html center><span className="viewer-loading">Loading body…</span></Html>}>
        {/* Bounds moves the camera so the whole body is centered and fills the view */}
        <Bounds fit clip observe margin={1.08 / zoom}>
          <Body url={modelUrl} selected={selected} colors={colors} hovered={hovered} onPick={onToggle} onHover={setHovered} facing={facing} autoRotate={autoRotate} />
        </Bounds>
      </Suspense>
      <OrbitControls makeDefault enablePan={false} enableRotate={false} enableZoom={false} />
    </Canvas>
  );
}

useGLTF.preload('/models/body.glb');
useGLTF.preload('/models/body_female.glb');
