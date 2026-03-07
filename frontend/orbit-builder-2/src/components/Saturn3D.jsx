// src/components/Saturn3D.jsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Torus, Float } from '@react-three/drei';

const Saturn = () => {
    const groupRef = useRef();

    useFrame(({ clock }) => {
        groupRef.current.rotation.y = clock.getElapsedTime() * 0.15;
        groupRef.current.rotation.x = clock.getElapsedTime() * 0.05 + 0.5;
    });

    return (
        <Float speed={2} rotationIntensity={1.5} floatIntensity={1.5}>
            <group ref={groupRef} scale={0.85}>
                {/* The Planet Core - Vivid Purple/Lavender (matching the reference) */}
                <Sphere args={[1.2, 32, 32]}>
                    <meshStandardMaterial
                        color="#8b5cf6" // Violet 500
                        roughness={0.4}
                        metalness={0.5}
                    />
                </Sphere>

                {/* The Primary Ring - Silver/White solid ring */}
                <Torus args={[2.2, 0.4, 2, 64]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.05]}>
                    <meshStandardMaterial
                        color="#e2e8f0" // Slate 200
                        transparent
                        opacity={0.9}
                        wireframe={true}
                    />
                </Torus>

                {/* Outer faint thin ring - Golden Amber */}
                <Torus args={[2.8, 0.08, 16, 64]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.05]}>
                    <meshStandardMaterial
                        color="#fbbf24" // Amber 400
                        transparent
                        opacity={0.6}
                    />
                </Torus>
            </group>
        </Float>
    );
};

const Saturn3D = () => {
    return (
        <div className="absolute -bottom-20 -right-20 w-[600px] h-[600px] z-0 pointer-events-none opacity-70 mix-blend-screen">
            <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                <ambientLight intensity={2.5} color="#ffffff" />
                <directionalLight position={[-5, 5, 5]} intensity={4} color="#c084fc" /> {/* Purple light */}
                <spotLight position={[5, -5, -10]} intensity={5} color="#fbbf24" angle={0.5} penumbra={1} /> {/* Amber rim */}
                <pointLight position={[10, -10, -10]} intensity={3} color="#06b6d4" /> {/* Teal accent */}
                <Saturn />
            </Canvas>
        </div>
    );
};

export default Saturn3D;
