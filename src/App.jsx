import { useMemo, Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Billboard, Line } from '@react-three/drei';
import gsap from 'gsap';
import Lenis from 'lenis';
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

function ParticleUniverse({ activeNode, setActiveNode, isMobile, isExpanding, isContracting }) {
  const groupRef = useRef();
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
        url: `/textures/thumbs/img${i + 1}.JPG`,
        position: [Math.cos(theta) * r, y * globeRadius, Math.sin(theta) * r]
      };
    });
  }, [globeRadius]);

  // Smooth continuous rotation via delta — never resets or snaps to an old timeline!
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (!activeNode && !isExpanding && !isContracting) {
      groupRef.current.rotation.y += delta * 0.048;
    }
  });

  useEffect(() => {
    if (!groupRef.current) return;
    if (isExpanding) {
      // Warp speed expansion: images expand outward past the camera and into the distance
      gsap.to(groupRef.current.scale, {
        x: 12,
        y: 12,
        z: 12,
        duration: 0.85,
        ease: 'power3.in',
      });
      gsap.to(groupRef.current.rotation, {
        y: groupRef.current.rotation.y + 0.8,
        duration: 0.85,
        ease: 'power2.in',
      });
      groupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          gsap.to(child.material, { opacity: 0, duration: 0.8, ease: 'power2.in' });
        }
      });
    } else if (isContracting) {
      // Animate inwards: from expanding (scale 12) down to smaller (scale 1)
      gsap.fromTo(groupRef.current.scale,
        { x: 12, y: 12, z: 12 },
        { x: 1, y: 1, z: 1, duration: 0.9, ease: 'power3.out' }
      );
      gsap.to(groupRef.current.rotation, {
        y: groupRef.current.rotation.y + 0.6,
        duration: 0.9,
        ease: 'power2.out',
      });
      groupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          gsap.fromTo(child.material,
            { opacity: 0 },
            { opacity: 1, duration: 0.75, ease: 'power2.out' }
          );
        }
      });
    } else {
      gsap.set(groupRef.current.scale, { x: 1, y: 1, z: 1 });
      groupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          gsap.set(child.material, { opacity: 1 });
        }
      });
    }
  }, [isExpanding, isContracting]);

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
  const [isClosing, setIsClosing] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setShowCredits(false);
    setTimeout(() => {
      onClose();
    }, 650); // Matches the CSS animation duration
  }, [isClosing, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (showCredits) {
          setShowCredits(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleClose, showCredits]);

  const toggleCredits = (e) => {
    e.stopPropagation();
    setShowCredits((prev) => !prev);
  };

  return (
    <div className={`info-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`info-panel ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>

        <div className="info-image-container">
          <img
            className="info-image"
            src="/textures/info-photo.jpeg"
            alt="idiotsbrain"
          />
          <button className="info-close-button" onClick={handleClose} aria-label="Close">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

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

          <button
            type="button"
            className={`info-glass info-glass--credits-btn ${showCredits ? 'active' : ''}`}
            onClick={toggleCredits}
          >
            <span className="info-text">Website Credits</span>
            <svg
              className="credits-btn-icon"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
          </button>

        </div>
      </div>

      {/* Website Credits Section sliding from right bottom screen */}
      <div
        className={`credits-drawer ${showCredits ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="credits-panel">
          <div className="credits-top-row">
            <button
              type="button"
              className="credits-close-btn"
              onClick={() => setShowCredits(false)}
              aria-label="Close Credits"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="credits-body-glass">
            <p className="info-text credits-item">
              <span>Art Direction: </span>
              <a
                href="https://www.instagram.com/bruis3s__/"
                target="_blank"
                rel="noopener noreferrer"
                className="credits-link"
              >
                Bruis3s
              </a>
            </p>
            <p className="info-text credits-item">
              <span>Design + Development : </span>
              <a
                href="https://www.instagram.com/bruis3s__/"
                target="_blank"
                rel="noopener noreferrer"
                className="credits-link"
              >
                Bruis3s
              </a>
              <span>,  </span>
              <a
                href="https://www.instagram.com/gabelnstudio/"
                target="_blank"
                rel="noopener noreferrer"
                className="credits-link"
              >
                Gabeln Studio
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const getGroupName = (id) => id === 1 ? "Analogue" : id === 2 ? "Campaign Aditya Tantra" : "Dongker";

export default function App() {
  const isMobile = useIsMobile();
  const [activeNode, setActiveNode] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [columns, setColumns] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 3 : 6));
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isContracting, setIsContracting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const animatingRef = useRef(false);
  const timelineRef = useRef(null);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) {
        setColumns((prev) => (prev === 6 ? 3 : prev));
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleSetColumns = (targetCols) => {
    if (columns === targetCols || animatingRef.current) return;
    animatingRef.current = true;
    
    let current = columns;
    const step = current < targetCols ? 1 : -1;
    
    const nextStep = () => {
      current += step;
      setColumns(current);
      if (current !== targetCols) {
        setTimeout(nextStep, 40);
      } else {
        animatingRef.current = false;
      }
    };
    
    setTimeout(nextStep, 40);
  };

  useEffect(() => {
    const onPopState = () => {
      if (timelineRef.current) timelineRef.current.kill();
      const path = window.location.pathname;
      setCurrentPath(path);
      setActiveLightboxIndex(null);
      setIsTransitioning(false);
      if (path === '/') {
        setIsExpanding(false);
        setIsContracting(false);
      } else if (path === '/gallery' || path === '/projects') {
        setIsExpanding(true);
        setIsContracting(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const startGalleryTransition = () => {
    if (isTransitioning) return;
    setActiveLightboxIndex(null);
    setIsTransitioning(true);
    setIsMenuOpen(false);
    setActiveNode(null);
    setIsExpanding(true);
    setIsContracting(false);

    const tl = gsap.timeline();
    timelineRef.current = tl;

    // The image universe expands until there is no image visible (0.85s)
    tl.to({}, { duration: 0.85 });

    // Switch to the gallery page once the universe has completely cleared
    tl.call(() => {
      window.history.pushState({}, '', '/gallery');
      setCurrentPath('/gallery');
      setIsTransitioning(false);
      // Keep universe expanded/hidden while on /gallery so it never flashes or blips
    });
  };

  const startHomeTransition = () => {
    if (isTransitioning) return;
    setActiveLightboxIndex(null);
    setIsTransitioning(true);
    setIsMenuOpen(false);

    const imgs = Array.from(document.querySelectorAll('.project-cell img'));
    if (imgs.length > 0) {
      // Sort images based on visible screen position (top-left to bottom-right)
      imgs.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        if (Math.abs(rectA.top - rectB.top) < 15) {
          return rectA.left - rectB.left;
        }
        return rectA.top - rectB.top;
      });

      // Clear fadeIn keyframes and animate opacity out to reveal #f0f0f0 background
      imgs.forEach((img) => {
        img.style.animation = 'none';
        img.style.opacity = '1';
      });

      gsap.to(imgs, {
        opacity: 0,
        duration: 0.18,
        stagger: {
          amount: 0.45,
          from: 'start'
        },
        ease: 'power2.in',
        onComplete: () => {
          goToHomeWithContract();
        }
      });
    } else {
      goToHomeWithContract();
    }
  };

  const goToHomeWithContract = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
    setIsContracting(true);
    setIsExpanding(false);

    setTimeout(() => {
      setIsContracting(false);
      setIsTransitioning(false);
    }, 900);
  };

  const showGallery = currentPath === '/gallery' || currentPath === '/projects';

  return (
    <div id="canvas-container">
      <Canvas
        camera={{ position: [0, 0, isMobile ? 95 : 80], fov: isMobile ? 50 : 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <fog attach="fog" args={['#f7f7f5', 50, isMobile ? 130 : 115]} />

        <OrbitControls enableDamping autoRotate={!activeNode} enabled={!isExpanding && !isContracting} autoRotateSpeed={0.5} />
        <Suspense fallback={null}>
          <ParticleUniverse
            activeNode={activeNode}
            setActiveNode={setActiveNode}
            isMobile={isMobile}
            isExpanding={isExpanding}
            isContracting={isContracting}
          />
        </Suspense>
      </Canvas>

      <div className="frosted-frame"></div>

      {/* ACCESSIBLE SEO HEADER */}
      <header className="sr-only">
        <h1>idiotsbrain — Director, Visual Artist &amp; Co-Founder of OUT OF FOCUS</h1>
        <p>
          Idiotsbrain is a Director, Visual Artist, Singer, and co-founder of OUT OF FOCUS, a production house based in Bandung. Crafting narrative visual experiences, music videos, and cinematic videography.
        </p>
      </header>

      {/* NAVIGATION */}
      <div className={`dropdown-nav-container ${isMenuOpen ? 'open' : ''}`}>
        <div className="dropdown-item dropdown-nav-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <span>{isMenuOpen ? 'Close' : 'Menu'}</span>
          {isMenuOpen ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          )}
        </div>
        <div className="dropdown-nav-items">
          <div className="dropdown-item" onClick={() => {
            if (showGallery) {
              startHomeTransition();
            } else {
              startGalleryTransition();
            }
          }}>
            <span>{showGallery ? 'Home' : 'Gallery'}</span>
          </div>
          <div className="dropdown-item" onClick={() => {
            setShowInfo(true);
            setIsMenuOpen(false);
          }}>
            <span>Information</span>
          </div>
        </div>
      </div>

      {activeNode && (
        <div className="fbc-container">
          <div className="fbc-row"><div className="fbc-info">Project</div><div className="fbc-data">{getGroupName(activeNode.groupId)}</div></div>
          <div className="fbc-row"><div className="fbc-info">Type</div><div className="fbc-data">Archive Core {activeNode.id}</div></div>
          <div className="fbc-row"><div className="fbc-info">Year</div><div className="fbc-data">2024</div></div>
        </div>
      )}

      {showGallery && (
        <ProjectsGrid
          columns={columns}
          onSelectImage={(idx) => setActiveLightboxIndex(idx)}
        />
      )}
      {showInfo && <InfoOverlay onClose={() => setShowInfo(false)} />}
      {showGallery && !showInfo && activeLightboxIndex === null && (
        <ViewNavigation columns={columns} setColumns={handleSetColumns} />
      )}
      {showGallery && activeLightboxIndex !== null && (
        <ProjectLightbox
          currentIndex={activeLightboxIndex}
          onClose={() => setActiveLightboxIndex(null)}
          onPrev={() => setActiveLightboxIndex((prev) => (prev - 1 + 48) % 48)}
          onNext={() => setActiveLightboxIndex((prev) => (prev + 1) % 48)}
        />
      )}
    </div>
  );
}

function ViewNavigation({ columns, setColumns }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`view-nav-container ${isOpen ? 'open' : ''}`}>
      <div className="view-nav-columns">
        <div className={`view-nav-btn ${columns === 1 ? 'active' : ''}`} onClick={() => setColumns(1)}>1</div>
        <div className={`view-nav-btn ${columns === 3 ? 'active' : ''}`} onClick={() => setColumns(3)}>3</div>
        <div className={`view-nav-btn ${columns === 6 ? 'active' : ''}`} onClick={() => setColumns(6)}>6</div>
      </div>
      <div className="dropdown-item view-nav-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span>{isOpen ? 'Close' : 'View'}</span>
        <span>+</span>
      </div>
    </div>
  );
}

function ProjectsGrid({ columns, onSelectImage }) {
  const count = 48;
  const scrollRef = useRef(null);

  const images = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const id = i + 1;
      const groupId = id <= 6 ? 1 : id <= 30 ? 2 : 3;
      return {
        id,
        title: getGroupName(groupId),
        src: `/textures/thumbs/img${id}.JPG`,
        delay: ((id * 37) % 35) / 10
      };
    });
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const lenis = new Lenis({
      wrapper: scrollRef.current,
      content: scrollRef.current.querySelector('.projects-grid'),
      smoothWheel: true,
    });
    let reqId;
    function raf(time) { lenis.raf(time); reqId = requestAnimationFrame(raf); }
    reqId = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(reqId); lenis.destroy(); };
  }, []);

  return (
    <div className="projects-grid-container" ref={scrollRef}>
      <div
        className="projects-grid"
        style={{ '--cols': columns }}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            className="project-cell"
            onClick={() => onSelectImage && onSelectImage(idx)}
          >
            <img
              src={img.src}
              alt={`Gallery image ${img.id}`}
              loading="lazy"
              decoding="async"
              style={{ animationDelay: `${img.delay}s` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectLightbox({ currentIndex, onClose, onPrev, onNext }) {
  const [isClosing, setIsClosing] = useState(false);
  const [prevIndexState, setPrevIndexState] = useState({ prev: null, current: currentIndex });

  if (currentIndex !== prevIndexState.current) {
    setPrevIndexState({ prev: prevIndexState.current, current: currentIndex });
  }

  const prevImg = prevIndexState.prev;
  const currentImg = prevIndexState.current;

  useEffect(() => {
    if (prevImg !== null) {
      const timer = setTimeout(() => {
        setPrevIndexState((s) => ({ prev: null, current: s.current }));
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [prevImg]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 250);
  }, [isClosing, onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, onPrev, onNext]);

  return (
    <div className={`project-lightbox ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className="lightbox-nav-bar" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-nav-group">
          <button className="lightbox-btn" onClick={onPrev} aria-label="Previous image">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button className="lightbox-btn" onClick={onNext} aria-label="Next image">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        <button className="lightbox-btn lightbox-btn--close" onClick={handleClose} aria-label="Close">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="lightbox-content" onClick={handleClose}>
        {prevImg !== null && prevImg !== currentImg && (
          <img
            key={`prev-${prevImg}`}
            className="lightbox-image is-prev"
            src={`/textures/img${prevImg + 1}.JPG`}
            alt={`Previous gallery image ${prevImg + 1}`}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <img
          key={`curr-${currentImg}`}
          className="lightbox-image is-current"
          src={`/textures/img${currentImg + 1}.JPG`}
          alt={`Gallery image ${currentImg + 1}`}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}