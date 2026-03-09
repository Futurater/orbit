import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Html, useGLTF, Gltf } from '@react-three/drei'; // 🔥 Removed Stars import
import * as THREE from 'three';
import gsap from 'gsap';

const PLANETS = [
  { id: 0, position: [0, 0, -10], orbitPosition: [0, 2.5, -10], label: "Planet Arrays", model: "/planet1.glb", scale: 1 },
  { id: 1, position: [100, 0, -10], orbitPosition: [100, 2.5, -10], label: "Planet Linked Lists", model: "/planet2.glb", scale: 1 },
  { id: 2, position: [200, 0, -10], orbitPosition: [200, 2.5, -10], label: "Planet Trees", model: "/planet3.glb", scale: 1 },
  { id: 3, position: [300, 0, -10], orbitPosition: [300, 2.5, -10], label: "Planet Graphs (Soon)", model: "/planet4.glb", scale: 0.038 },
];

const SpaceshipModel = () => {
  const { scene } = useGLTF('/spaceship.glb');
  return (
    <primitive
      object={scene}
      scale={[0.2, 0.2, 0.2]}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
    />
  );
};

const PlanetModel = ({ modelPath, scale = 1 }) => {
  return <Gltf src={modelPath} scale={[scale, scale, scale]} />;
};

const Spaceship = ({ currentTopicIndex, isFlying, onNearPlanet }) => {
  const shipRef = useRef();
  const engineLightRef = useRef();
  const exhaustCoreRef = useRef();
  const exhaustGlowRef = useRef();
  const shipScaleRef = useRef(); // new ref for dynamic size

  const [keys, setKeys] = useState({ w: false, s: false });
  const [animating, setAnimating] = useState(true);
  const lockedPlanetRef = useRef(null);

  // Keyboard controls for free roam
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'w') setKeys(k => ({ ...k, w: true }));
      if (e.key.toLowerCase() === 's') setKeys(k => ({ ...k, s: true }));
    };
    const handleKeyUp = (e) => {
      if (e.key.toLowerCase() === 'w') {
        setKeys(k => ({ ...k, w: false }));
        lockedPlanetRef.current = null;
      }
      if (e.key.toLowerCase() === 's') {
        setKeys(k => ({ ...k, s: false }));
        lockedPlanetRef.current = null;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!shipRef.current || !isFlying) return;

    setAnimating(true);
    const targetPos = PLANETS[currentTopicIndex].orbitPosition;
    const startPos = shipRef.current.position;

    const tl = gsap.timeline({
      onComplete: () => {
        setAnimating(false);
      }
    });

    const dx = targetPos[0] - startPos.x;
    const dy = targetPos[1] - startPos.y;
    const dz = targetPos[2] - startPos.z;
    const targetAngle = Math.atan2(dx, dz);

    // ACT 1: THE MILLENNIUM FALCON SWOOP
    tl.to(shipRef.current.rotation, {
      x: -0.2,
      y: targetAngle,
      z: 0.3,
      duration: 1.5,
      ease: "power2.inOut"
    }, 0)
      .to(shipRef.current.position, {
        x: startPos.x + dx * 0.4,
        y: startPos.y + dy * 0.4,
        z: startPos.z + dz * 0.4,
        duration: 1.5,
        ease: "power2.in"
      }, 0)
      .to(engineLightRef.current, { intensity: 15, duration: 1.5 }, 0);

    // ACT 2: THE WARP JUMP 
    tl.to(shipRef.current.position, {
      x: startPos.x + dx * 0.9,
      y: startPos.y + dy * 0.9,
      z: startPos.z + dz * 0.9,
      duration: 0.6,
      ease: "none"
    }, 1.5);

    // ACT 3: THE CLOSE-UP HOVER
    tl.to(shipRef.current.rotation, { x: 0, y: targetAngle + Math.PI, z: 0, duration: 1.5, ease: "power2.out" }, 2.1)
      .to(shipRef.current.position, {
        x: targetPos[0],
        y: targetPos[1],
        z: targetPos[2],
        duration: 4.5,
        ease: "power3.out"
      }, 2.1)
      .to(engineLightRef.current, { intensity: 2, duration: 2 }, 3.0)
      .to(shipRef.current.rotation, { x: 0, y: targetAngle + (Math.PI / 2), duration: 2.5, ease: "power2.inOut" }, 3.5);

  }, [currentTopicIndex, isFlying]);

  useFrame((state, delta) => {
    if (shipRef.current) {
      // 1. FREE ROAM LOGIC
      if (!animating && isFlying) {
        const speed = 70 * delta; // Increased speed for free roam

        let moving = false;
        let prevX = shipRef.current.position.x;

        // Boundaries
        const MIN_X = PLANETS[0].orbitPosition[0];
        const MAX_X = PLANETS[PLANETS.length - 1].orbitPosition[0];

        if (keys.w && lockedPlanetRef.current !== 'w') {
          if (shipRef.current.position.x < MAX_X) {
            shipRef.current.position.x += speed;
            // Face forward (right) and pitch down
            const targetYRotation = Math.PI / 2;
            shipRef.current.rotation.y = THREE.MathUtils.lerp(shipRef.current.rotation.y, targetYRotation, 0.1);
            shipRef.current.rotation.z = THREE.MathUtils.lerp(shipRef.current.rotation.z, -0.2, 0.1);
            moving = true;

            // Stop correctly over the planet and require pressing 'W' again
            for (const planet of PLANETS) {
              const px = planet.orbitPosition[0];
              if (prevX < px && shipRef.current.position.x >= px) {
                shipRef.current.position.x = px;
                lockedPlanetRef.current = 'w';
                break;
              }
            }
          }
        } else if (keys.s && lockedPlanetRef.current !== 's') {
          if (shipRef.current.position.x > MIN_X) {
            shipRef.current.position.x -= speed;
            // Face backward (left) and pitch up
            const targetYRotation = -Math.PI / 2;
            shipRef.current.rotation.y = THREE.MathUtils.lerp(shipRef.current.rotation.y, targetYRotation, 0.1);
            shipRef.current.rotation.z = THREE.MathUtils.lerp(shipRef.current.rotation.z, 0.2, 0.1);
            moving = true;

            // Stop correctly over the planet and require pressing 'S' again
            for (const planet of PLANETS) {
              const px = planet.orbitPosition[0];
              if (prevX > px && shipRef.current.position.x <= px) {
                shipRef.current.position.x = px;
                lockedPlanetRef.current = 's';
                break;
              }
            }
          }
        } else {
          // Flatten out when stopping
          shipRef.current.rotation.z = THREE.MathUtils.lerp(shipRef.current.rotation.z, 0, 0.1);
          shipRef.current.rotation.y = THREE.MathUtils.lerp(shipRef.current.rotation.y, 0, 0.1); // Reset Y rotation when not moving
        }

        // Increase engine light and exhaust flame when flying
        const isThrusting = moving;
        const targetIntensity = isThrusting ? 8 : 2;

        const targetCoreOpacity = isThrusting ? 0.9 : 0.0;
        const targetGlowOpacity = isThrusting ? 0.5 : 0.0;
        const targetScaleZ = isThrusting ? 1.5 + Math.random() * 0.5 : 0.5; // Flicker effect

        engineLightRef.current.intensity = THREE.MathUtils.lerp(engineLightRef.current.intensity, targetIntensity, 0.1);

        if (exhaustCoreRef.current) {
          exhaustCoreRef.current.scale.x = THREE.MathUtils.lerp(exhaustCoreRef.current.scale.x, 1, 0.3);
          exhaustCoreRef.current.scale.y = THREE.MathUtils.lerp(exhaustCoreRef.current.scale.y, targetScaleZ, 0.3); // y is length because of rotation
          exhaustCoreRef.current.scale.z = THREE.MathUtils.lerp(exhaustCoreRef.current.scale.z, 1, 0.3);
          exhaustCoreRef.current.material.opacity = THREE.MathUtils.lerp(exhaustCoreRef.current.material.opacity, targetCoreOpacity, 0.2);
        }
        if (exhaustGlowRef.current) {
          exhaustGlowRef.current.scale.x = THREE.MathUtils.lerp(exhaustGlowRef.current.scale.x, 1, 0.3);
          exhaustGlowRef.current.scale.y = THREE.MathUtils.lerp(exhaustGlowRef.current.scale.y, targetScaleZ * 1.2, 0.3);
          exhaustGlowRef.current.scale.z = THREE.MathUtils.lerp(exhaustGlowRef.current.scale.z, 1, 0.3);
          exhaustGlowRef.current.material.opacity = THREE.MathUtils.lerp(exhaustGlowRef.current.material.opacity, targetGlowOpacity, 0.2);
        }

        // Check distance to ALL planets (not just current) so player can revisit
        let nearPlanetIndex = null;
        for (let i = 0; i < PLANETS.length; i++) {
          const px = PLANETS[i].orbitPosition[0];
          const dist = Math.abs(shipRef.current.position.x - px);
          if (dist < 12) {
            nearPlanetIndex = i;
            break;
          }
        }
        if (onNearPlanet) onNearPlanet(nearPlanetIndex);

        // Dynamically scale spaceship: 1.0 when near a planet, 1.8 when flying between them
        if (shipScaleRef.current) {
          const targetScale = nearPlanetIndex !== null ? 1.0 : 1.8;
          shipScaleRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);
        }
      }

      // 2. CAMERA LOGIC
      state.camera.position.lerp(
        new THREE.Vector3(
          shipRef.current.position.x - 3,
          shipRef.current.position.y + 2,
          shipRef.current.position.z + 10
        ),
        0.02
      );

      const lookTarget = new THREE.Vector3(
        shipRef.current.position.x,
        shipRef.current.position.y - 1.5,
        shipRef.current.position.z
      );
      state.camera.lookAt(lookTarget);
    }
  });

  return (
    <group ref={shipRef} position={[15, 20, 30]}>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
        <group ref={shipScaleRef}>
          <pointLight ref={engineLightRef} position={[0, 0.4, -2.5]} color="#38bdf8" intensity={2} distance={15} />

          {/* EXHAUST PLUME */}
          <group position={[0, 0.4, -1.8]} rotation={[Math.PI / 2, 0, 0]}>
            {/* Inner bright core of the flame */}
            <mesh ref={exhaustCoreRef}>
              <cylinderGeometry args={[0.08, 0.01, 1.5, 8]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent={true}
                opacity={0.0}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            {/* Outer blue/cyan glow of the flame */}
            <mesh ref={exhaustGlowRef}>
              <cylinderGeometry args={[0.2, 0.05, 1.5, 8]} />
              <meshBasicMaterial
                color="#38bdf8"
                transparent={true}
                opacity={0.0}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>

          <SpaceshipModel />
        </group>
      </Float>
    </group>
  );
};

export default function SpaceTimeline({ currentTopicIndex, topics = [], isFlying, onNearPlanet }) {
  return (
    // 🔥 FIX 1: Changed 'bg-slate-950' to 'bg-transparent'
    <div className="w-full h-full bg-transparent absolute inset-0 z-0 overflow-hidden">

      {/* Set alpha to true so the canvas itself doesn't render a default background */}
      <Canvas shadows camera={{ position: [0, 2, 15], fov: 45 }} gl={{ alpha: true }}>
        <Suspense fallback={<Html center><div className="text-white font-mono tracking-widest text-xl">INITIALIZING GALAXY...</div></Html>}>
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 20, 5]} intensity={1.5} />

          {/* 🔥 FIX 2: Completely deleted the local <Stars /> component here */}

          <Spaceship currentTopicIndex={currentTopicIndex} isFlying={isFlying} onNearPlanet={onNearPlanet} />

          {PLANETS.map((planet, index) => {
            const isSoon = planet.label.includes("(Soon)");
            // FIX: Ensure Planet 0 (Arrays) is ALWAYS unlocked visually, 
            // regardless of API timing
            const isLocked = !isSoon && index !== 0 && topics[index] && !topics[index].isUnlocked;

            return (
              <group key={planet.id} position={planet.position}>
                {/* Render locked planets with severe opacity to indicate they cannot be visited */}
                <group style={{ opacity: isLocked ? 0.3 : 1 }}>
                  <PlanetModel modelPath={planet.model} scale={planet.scale} />
                </group>

                <Html position={[0, -3.2, 0]} center zIndexRange={[100, 0]}>
                  <div className="flex flex-col items-center gap-1.5 opacity-90">
                    <div className={`px-3 py-1.5 rounded-md border border-white/10 transition-all duration-1000 backdrop-blur-sm
                      ${currentTopicIndex === index
                        ? 'bg-indigo-900/80 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                        : isLocked
                          ? 'bg-red-900/40 border-red-900/20 opacity-40 scale-90'
                          : 'bg-slate-900/50 border-slate-600/50 opacity-60 scale-90'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap
                        ${isLocked ? 'text-red-300/40' : 'text-slate-200'}`}>
                        {planet.label.replace(" (Soon)", "")}
                        {isLocked && " (Locked)"}
                      </p>
                    </div>
                    {isSoon && (
                      <span className="text-[9px] font-bold text-amber-500/80 tracking-[0.3em] uppercase bg-black/40 px-2 py-0.5 rounded">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </Html>
              </group>
            );
          })}
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload('/spaceship.glb');
useGLTF.preload('/planet1.glb');
useGLTF.preload('/planet2.glb');
useGLTF.preload('/planet3.glb');
useGLTF.preload('/planet4.glb');