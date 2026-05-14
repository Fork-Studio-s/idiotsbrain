import { useMemo, Suspense, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture, Billboard, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import './App.css';

// --- 1. THE INTERACTIVE SMART IMAGE (Cleaned of all text!) ---
function SmartImage({ data, index, activeNode, setActiveNode }) {
  const texture = useTexture(data.url);
  const imageAspect = texture.image ? texture.image.width / texture.image.height : 1;

  const fixedWidth = 4.0;
  const calculatedHeight = fixedWidth / imageAspect;

  const billboardRef = useRef();
  const meshRef = useRef();
  const materialRef = useRef();

  const isClicked = activeNode !== null;
  const inActiveGroup = isClicked && activeNode.groupId === data.groupId;
  const isUnrelated = isClicked && activeNode.groupId !== data.groupId;

  // ENTRANCE ANIMATION
  useEffect(() => {
    if (!billboardRef.current || !meshRef.current) return;

    const [targetX, targetY, targetZ] = data.position;
    const startX = targetX * 0.1;
    const startY = targetY * 0.1;
    const startZ = targetZ * 0.1;

    gsap.fromTo(billboardRef.current.position,
      { x: startX, y: startY, z: startZ },
      { x: targetX, y: targetY, z: targetZ, duration: 4.0, delay: 0.8, ease: "expo.out" }
    );

    gsap.fromTo(meshRef.current.scale,
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1, duration: 3.0, delay: 0.8, ease: "elastic.out(1, 0.8)" }
    );
  }, [data.position]);

  // FOCUS / "BLUR" ANIMATION
  useEffect(() => {
    if (!meshRef.current || !materialRef.current) return;

    if (!isClicked) {
      gsap.to(meshRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: "power3.out" });
      gsap.to(materialRef.current, { opacity: 1, duration: 0.8, ease: "power2.out" });
      gsap.to(materialRef.current.color, { r: 1, g: 1, b: 1, duration: 0.8 });
    } else if (inActiveGroup) {
      gsap.to(meshRef.current.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 0.8, ease: "back.out(1.5)" });
      gsap.to(materialRef.current, { opacity: 1, duration: 0.8, ease: "power2.out" });
      gsap.to(materialRef.current.color, { r: 1, g: 1, b: 1, duration: 0.8 });
    } else if (isUnrelated) {
      gsap.to(meshRef.current.scale, { x: 0.7, y: 0.7, z: 0.7, duration: 0.8, ease: "power3.out" });
      gsap.to(materialRef.current, { opacity: 0.15, duration: 0.8, ease: "power2.out" });
      gsap.to(materialRef.current.color, { r: 0.3, g: 0.3, b: 0.3, duration: 0.8 });
    }
  }, [isClicked, inActiveGroup, isUnrelated]);

  const handlePointerOver = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    if (!inActiveGroup && !isUnrelated) {
      gsap.to(meshRef.current.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.4, ease: "back.out(1.5)" });
    }
  };

  const handlePointerOut = (e) => {
    document.body.style.cursor = 'auto';
    if (!inActiveGroup && !isUnrelated) {
      gsap.to(meshRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "power2.out" });
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (activeNode && activeNode.id === data.id) {
      setActiveNode(null);
    } else {
      setActiveNode(data);
    }
  };

  return (
    <Billboard ref={billboardRef} position={[0, 0, 0]}>
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <planeGeometry args={[fixedWidth, calculatedHeight]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          side={THREE.DoubleSide}
          transparent={true}
        />
      </mesh>
    </Billboard>
  );
}

// --- 2. THE GLOBE UNIVERSE COMPONENT ---
// Notice we pass activeNode and setActiveNode in as props now!
function ParticleUniverse({ activeNode, setActiveNode }) {
  const groupRef = useRef();

  // NEW: A ref to hold the rotating animation so we can pause it
  const rotationAnim = useRef(null);

  const imageCount = 48;
  const globeRadius = 35;

  const imageData = useMemo(() => {
    let images = Array.from({ length: imageCount }, (_, i) => {
      const id = i + 1;
      let groupId = 3;

      if (id >= 1 && id <= 6) groupId = 1;
      else if (id >= 7 && id <= 30) groupId = 2;
      else if (id >= 31 && id <= 48) groupId = 3;

      return { id, groupId, url: `/textures/img${id}.jpg` };
    });

    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }

    const phi = Math.PI * (3 - Math.sqrt(5));
    return images.map((img, i) => {
      const y = 1 - (i / (imageCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const posX = Math.cos(theta) * radiusAtY * globeRadius;
      const posY = y * globeRadius;
      const posZ = Math.sin(theta) * radiusAtY * globeRadius;

      return { ...img, position: [posX, posY, posZ] };
    });
  }, []);

  // INIT GLOBE ROTATION
  useEffect(() => {
    if (!groupRef.current) return;

    groupRef.current.rotation.z = 0.2;
    groupRef.current.rotation.x = 0.1;

    // We assign the GSAP animation to our ref
    rotationAnim.current = gsap.to(groupRef.current.rotation, {
      y: `+=${Math.PI * 2}`, // Using relative math makes pausing/playing smoother
      duration: 120,
      repeat: -1,
      ease: "none",
    });

    return () => {
      if (rotationAnim.current) rotationAnim.current.kill();
    }
  }, []);

  // NEW: PAUSE OR PLAY BASED ON CLICK
  useEffect(() => {
    if (!rotationAnim.current) return;

    if (activeNode !== null) {
      // Something is clicked, freeze the globe!
      rotationAnim.current.pause();
    } else {
      // Nothing is clicked, keep spinning!
      rotationAnim.current.play();
    }
  }, [activeNode]);

  const handleMissedClick = () => {
    setActiveNode(null);
  };

  return (
    <group ref={groupRef} onPointerMissed={handleMissedClick}>
      {imageData.map((data, index) => (
        <SmartImage
          key={data.id}
          data={data}
          index={index}
          activeNode={activeNode}
          setActiveNode={setActiveNode}
        />
      ))}

      {activeNode && imageData
        .filter(img => img.groupId === activeNode.groupId && img.id !== activeNode.id)
        .map(relatedImg => (
          <Line
            key={`line-${activeNode.id}-${relatedImg.id}`}
            points={[activeNode.position, relatedImg.position]}
            color="#555555"
            lineWidth={0.8}
            transparent={true}
            opacity={0.5}
          />
        ))
      }
    </group>
  );
}

// --- 3. THE MAIN APP WRAPPER ---
export default function App() {
  const [activeNode, setActiveNode] = useState(null);

  // Helper function to figure out the title based on the group
  const getGroupName = (groupId) => {
    if (groupId === 1) return "Analogue";
    if (groupId === 2) return "Campaign Aditya Tantra";
    if (groupId === 3) return "Dongker";
    return "Archive";
  };

  return (
    {/* 1. REMOVED 'isolation: isolate' from this wrapper */ }
    < div id = "canvas-container" style = {{ width: '100vw', height: '100dvh', position: 'relative' }
}>

  {/* 2. ADDED absolute positioning and a strict zIndex of 1 */ }
  < Canvas
style = {{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
camera = {{ position: [0, 0, 70] }}
gl = {{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
      > 
        <color attach="background" args={['#ffffff']} /> 
        <fog attach="fog" args={['#ffffff', 30, 90]} />
        <OrbitControls
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.5} 
          autoRotate={activeNode === null} 
          autoRotateSpeed={0.5}
        />
        <Suspense fallback={null}>
          <ParticleUniverse activeNode={activeNode} setActiveNode={setActiveNode} />
        </Suspense>
      </Canvas >

  <div className="frosted-frame"></div>

{/* TOP LEFT: THE STUDIO NAVIGATION */ }
<div className="nav-container">
  <div className="nav-item selected">Idiotsbrain</div>
  <div className="nav-item">Projects</div>
  <div className="nav-item">Information</div>
</div>

{/* BOTTOM LEFT: THE STRUCTURAL DETAILS CARD */ }
{
  activeNode && (
    <div className="fbc-container">

      {/* Row 1: Project */}
      <div className="fbc-row">
        <div className="fbc-info">Project</div>
        <div className="fbc-data">{getGroupName(activeNode.groupId)}</div>
      </div>

      {/* Row 2: Type */}
      <div className="fbc-row">
        <div className="fbc-info">Type</div>
        <div className="fbc-data">Archive Core {activeNode.id}</div>
      </div>

      {/* Row 3: Year */}
      <div className="fbc-row">
        <div className="fbc-info">Year</div>
        <div className="fbc-data">2024</div>
      </div>

    </div>
  )
}

    </div >
  );
}