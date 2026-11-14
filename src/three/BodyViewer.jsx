// 3D body: click parts to select them (multi-select). Reports mesh names to the parent.
// Loads /models/body.glb from Blender. Until that file exists, a simple body made of
// named shapes is shown, so the rest of the app can be built and tested.
import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';

const SELECTED = '#ff8a3d';
const HOVER = '#7fd1ff';
const BASE = '#d9dee8';

function PartMaterial({ name, selected, hovered }) {
  const color = selected.includes(name) ? SELECTED : hovered === name ? HOVER : BASE;
  return <meshStandardMaterial color={color} roughness={0.6} />;
}

// Placeholder body: every shape is named exactly like the meshes in body-parts.json
const PLACEHOLDER = [
  ['head', 'sphere', [0, 1.65, 0], [0.13]],
  ['neck', 'cyl', [0, 1.47, 0], [0.05, 0.08]],
  ['chest', 'box', [0, 1.28, 0.03], [0.36, 0.26, 0.16]],
  ['upper_back', 'box', [0, 1.28, -0.08], [0.34, 0.26, 0.05]],
  ['abdomen', 'box', [0, 1.04, 0.02], [0.3, 0.2, 0.15]],
  ['lower_back', 'box', [0, 1.04, -0.08], [0.28, 0.2, 0.05]],
  ['pelvis', 'box', [0, 0.88, 0], [0.32, 0.12, 0.18]],
  ['shoulder_L', 'sphere', [0.23, 1.38, 0], [0.06]],
  ['shoulder_R', 'sphere', [-0.23, 1.38, 0], [0.06]],
  ['arm_L', 'cyl', [0.26, 1.2, 0], [0.045, 0.28]],
  ['arm_R', 'cyl', [-0.26, 1.2, 0], [0.045, 0.28]],
  ['forearm_L', 'cyl', [0.27, 0.93, 0], [0.04, 0.26]],
  ['forearm_R', 'cyl', [-0.27, 0.93, 0], [0.04, 0.26]],
  ['hand_L', 'box', [0.27, 0.75, 0], [0.06, 0.1, 0.03]],
  ['hand_R', 'box', [-0.27, 0.75, 0], [0.06, 0.1, 0.03]],
  ['thigh_L', 'cyl', [0.09, 0.66, 0], [0.065, 0.34]],
  ['thigh_R', 'cyl', [-0.09, 0.66, 0], [0.065, 0.34]],
  ['knee_L', 'sphere', [0.09, 0.47, 0.01], [0.055]],
  ['knee_R', 'sphere', [-0.09, 0.47, 0.01], [0.055]],
  ['shin_L', 'cyl', [0.09, 0.27, 0], [0.05, 0.34]],
  ['shin_R', 'cyl', [-0.09, 0.27, 0], [0.05, 0.34]],
  ['foot_L', 'box', [0.09, 0.05, 0.04], [0.08, 0.06, 0.18]],
  ['foot_R', 'box', [-0.09, 0.05, 0.04], [0.08, 0.06, 0.18]],
];

function PlaceholderBody({ selected, hovered, onPick, onHover }) {
  return PLACEHOLDER.map(([name, shape, pos, size]) => (
    <mesh
      key={name}
      name={name}
      position={pos}
      onClick={(e) => { e.stopPropagation(); onPick(name); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(name); }}
      onPointerOut={() => onHover(null)}
    >
      {shape === 'sphere' && <sphereGeometry args={[size[0], 24, 16]} />}
      {shape === 'cyl' && <cylinderGeometry args={[size[0], size[0] * 0.85, size[1], 16]} />}
      {shape === 'box' && <boxGeometry args={size} />}
      <PartMaterial name={name} selected={selected} hovered={hovered} />
    </mesh>
  ));
}

// Real model from Blender: each body part must be its own object, named like body-parts.json
function GltfBody({ url, selected, hovered, onPick, onHover }) {
  const { scene } = useGLTF(url);
  useEffect(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.material = obj.material.clone();
      const c = selected.includes(obj.name) ? SELECTED : hovered === obj.name ? HOVER : BASE;
      obj.material.color.set(c);
    });
  }, [scene, selected, hovered]);
  return (
    <primitive
      object={scene}
      onClick={(e) => { e.stopPropagation(); onPick(e.object.name); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(e.object.name); }}
      onPointerOut={() => onHover(null)}
    />
  );
}

export default function BodyViewer({ selected, onToggle, modelUrl = '/models/body.glb' }) {
  const [hovered, setHovered] = useState(null);
  const [hasModel, setHasModel] = useState(false);

  useEffect(() => {
    fetch(modelUrl, { method: 'HEAD' })
      .then((r) => setHasModel(r.ok && !(r.headers.get('content-type') || '').includes('text/html')))
      .catch(() => setHasModel(false));
  }, [modelUrl]);

  const props = { selected, hovered, onPick: onToggle, onHover: setHovered };

  return (
    <Canvas camera={{ position: [0, 1.1, 2.4], fov: 40 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} />
      <Suspense fallback={<Html center>Loading body…</Html>}>
        {hasModel ? <GltfBody url={modelUrl} {...props} /> : <PlaceholderBody {...props} />}
      </Suspense>
      <OrbitControls target={[0, 0.95, 0]} enablePan={false} minDistance={1.2} maxDistance={4} />
    </Canvas>
  );
}
