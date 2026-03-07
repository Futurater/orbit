// src/components/Planet3D.jsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const GasGiant = () => {
    const planetRef = useRef();
    const glowRef = useRef();

    // Load the vibrant teal/blue planet texture
    const texture = useTexture('/textures/jupiter.png');

    useFrame(({ clock }) => {
        planetRef.current.rotation.y = clock.getElapsedTime() * 0.03;
        glowRef.current.rotation.y = clock.getElapsedTime() * 0.015;
    });

    return (
        <group position={[-1.5, 1.5, 0]}>
            {/* The main textured planet */}
            <Sphere ref={planetRef} args={[3, 64, 64]}>
                <meshStandardMaterial
                    map={texture}
                    roughness={0.5}
                    metalness={0.15}
                />
            </Sphere>

            {/* Atmospheric glow: teal halo */}
            <Sphere ref={glowRef} args={[3.1, 64, 64]}>
                <meshPhongMaterial
                    color="#06b6d4"
                    transparent
                    opacity={0.08}
                    side={THREE.FrontSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </Sphere>
        </group>
    );
};

const Planet3D = () => {
    return (
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] z-[1] pointer-events-none">
            <Canvas camera={{ position: [0, 0, 9], fov: 45 }}>
                <ambientLight intensity={0.15} color="#ffffff" />

                {/* Warm white crescent rim light */}
                <directionalLight position={[8, -6, 4]} intensity={3} color="#ffffff" />

                {/* Teal fill from behind to bring out the blue/green tones */}
                <pointLight position={[5, -5, -3]} intensity={2} color="#06b6d4" distance={30} />

                {/* Warm amber accent from below-right */}
                <pointLight position={[-3, 3, 5]} intensity={1} color="#fbbf24" distance={20} />

                <GasGiant />
            </Canvas>
        </div>
    );
};

export default Planet3D;
