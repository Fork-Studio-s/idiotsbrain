import { useMemo, Suspense, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture, Billboard, Line } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import './App.css';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function SmartImage({ data, activeNode, setActiveNode, isMobile }) {
  const texture = useTexture(data.url);
  const imageAspect = texture.image ? texture.image.width / texture.image.height : 1;
  const meshRef = useRef();
  const materialRef = useRef();
  const billboardRef = useRef();

  const imgWidth = isMobile ? 3.2 : 4.0;

  useEffect(() => {
    if (!billboardRef.current) return;
    const [tx, ty, tz] = data.position;
    gsap.fromTo(billboardRef.current.position,
      { x: tx * 0.1, y: ty * 0.1, z: tz * 0.1 },
      { x: tx, y: ty, z: tz, duration: 3.5, ease: "expo.out" }
    );
  }, [data.position]);

  const isClicked = activeNode !== null;
  const inActiveGroup = isClicked && activeNode.groupId === data.groupId;

  useEffect(() => {
    if (!meshRef.current) return;
    if (!isClicked) {
      gsap.to(meshRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.6 });
      gsap.to(materialRef.current, { opacity: 1, duration: 0.6 });
      gsap.to(materialRef.current.color, { r: 1, g: 1, b: 1, duration: 0.6 });
    } else if (inActiveGroup) {
      gsap.to(meshRef.current.scale, { x: 1.25, y: 1.25, z: 1.25, duration: 0.6 });
      gsap.to(materialRef.current, { opacity: 1, duration: 0.6 });
    } else {
      gsap.to(meshRef.current.scale, { x: 0.7, y: 0.7, z: 0.7, duration: 0.6 });
      gsap.to(materialRef.current, { opacity: 0.15, duration: 0.6 });
      gsap.to(materialRef.current.color, { r: 0.3, g: 0.3, b: 0.3, duration: 0.6 });
    }
  }, [isClicked, inActiveGroup]);

  return (
    <Billboard ref={billboardRef}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); setActiveNode(data); }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <planeGeometry args={[imgWidth, imgWidth / imageAspect]} />
        <meshBasicMaterial ref={materialRef} map={texture} transparent={true} />
      </mesh>
    </Billboard>
  );
}

function ParticleUniverse({ activeNode, setActiveNode, isMobile }) {
  const groupRef = useRef();
  const rotationAnim = useRef();
  const count = 48;
  const globeRadius = isMobile ? 28 : 35;

  const imageData = useMemo(() => {
    const phi = Math.PI * (3 - Math.sqrt(5));
    return Array.from({ length: count }, (_, i) => {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y) * globeRadius;
      const theta = phi * i;
      return {
        id: i + 1,
        groupId: (i + 1 <= 6) ? 1 : (i + 1 <= 30) ? 2 : 3,
        url: `/textures/img${i + 1}.jpg`,
        position: [Math.cos(theta) * r, y * globeRadius, Math.sin(theta) * r]
      };
    });
  }, [globeRadius]);

  useEffect(() => {
    rotationAnim.current = gsap.to(groupRef.current.rotation, { y: Math.PI * 2, duration: 130, repeat: -1, ease: "none" });
    return () => rotationAnim.current.kill();
  }, []);

  useEffect(() => {
    activeNode ? rotationAnim.current.pause() : rotationAnim.current.play();
  }, [activeNode]);

  return (
    <group ref={groupRef} onPointerMissed={() => setActiveNode(null)}>
      {imageData.map((d) => (
        <SmartImage key={d.id} data={d} activeNode={activeNode} setActiveNode={setActiveNode} isMobile={isMobile} />
      ))}
      {activeNode && imageData
        .filter(img => img.groupId === activeNode.groupId && img.id !== activeNode.id)
        .map(relatedImg => (
          <Line
            key={`line-${activeNode.id}-${relatedImg.id}`}
            points={[activeNode.position, relatedImg.position]}
            color="#555555"
            lineWidth={0.6}
            transparent opacity={0.4}
          />
        ))
      }
    </group>
  );
}

function InfoOverlay({ onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="info-overlay" onClick={onClose}>
      <div className="info-panel" onClick={(e) => e.stopPropagation()}>

        <img
          className="info-image"
          src="/textures/info-photo.jpeg"
          alt="idiotsbrain"
        />

        <div className="info-text-parent">

          <div className="info-glass info-glass--title">
            <p className="info-text">Information</p>
          </div>

          <div className="info-glass info-glass--body">
            <p className="info-text info-text--body">
              "idiotsbrain" simply comes out as a nickname game when i was 11
              and i dont even know what that means, for me it just cool at that
              time. but then i realize idiotsbrain not just a nickname, it is
              the whole expression and passion, its an another side of myself
              that can just express anything as an art without being scared to
              be judge or seen.
            </p>
          </div>

          <div className="info-glass info-glass--works-title">
            <p className="info-text">Works</p>
          </div>

          <div className="info-works-row">
            <div className="info-works-cell">
              <p className="info-text">Director</p>
            </div>
            <div className="info-works-cell info-works-cell--project">
              <p className="info-text info-text--body">MV - UH HUH - Davidbeatt</p>
            </div>
          </div>

          <div className="info-works-row">
            <div className="info-works-cell">
              <p className="info-text">Director</p>
            </div>
            <div className="info-works-cell info-works-cell--project">
              <p className="info-text info-text--body">MV - Little Plastic Dinosaur - Rickran</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeNode, setActiveNode] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const isMobile = useIsMobile();

  const getGroupName = (id) => id === 1 ? "Analogue" : id === 2 ? "Campaign Aditya Tantra" : "Dongker";

  return (
    <div id="canvas-container">
      <Canvas
        camera={{ position: [0, 0, isMobile ? 95 : 80], fov: isMobile ? 50 : 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <fog attach="fog" args={['#f7f7f5', 50, isMobile ? 130 : 115]} />

        <OrbitControls enableDamping autoRotate={!activeNode} autoRotateSpeed={0.5} />
        <Suspense fallback={null}>
          <ParticleUniverse activeNode={activeNode} setActiveNode={setActiveNode} isMobile={isMobile} />
        </Suspense>
      </Canvas>

      <div className="frosted-frame"></div>

      <div className="nav-container">
        <div className="nav-item selected">Idiotsbrain</div>
        <div className="nav-item">Projects</div>
        <div className={`nav-item${showInfo ? ' active' : ''}`} onClick={() => setShowInfo(prev => !prev)}>
          {showInfo ? 'Close' : 'Information'}
        </div>
      </div>

      {activeNode && (
        <div className="fbc-container">
          <div className="fbc-row"><div className="fbc-info">Project</div><div className="fbc-data">{getGroupName(activeNode.groupId)}</div></div>
          <div className="fbc-row"><div className="fbc-info">Type</div><div className="fbc-data">Archive Core {activeNode.id}</div></div>
          <div className="fbc-row"><div className="fbc-info">Year</div><div className="fbc-data">2024</div></div>
        </div>
      )}

      {showInfo && <InfoOverlay onClose={() => setShowInfo(false)} />}
    </div>
  );
}