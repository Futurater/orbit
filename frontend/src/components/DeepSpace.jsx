// src/components/DeepSpace.jsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

const Starfield = () => {
    const groupRef = useRef();

    useFrame(({ clock }) => {
        groupRef.current.rotation.y = clock.getElapsedTime() * 0.002;
        groupRef.current.rotation.x = clock.getElapsedTime() * 0.001;
    });

    return (
        <group ref={groupRef} rotation={[0, 0, Math.PI / 4]}>
            <Stars
                radius={100}
                depth={50}
                count={3500}
                factor={3}
                saturation={0}
                fade
                speed={0.5}
            />
            <Stars
                radius={200}
                depth={100}
                count={4000}
                factor={1.5}
                saturation={0.2}
                fade
                speed={0.2}
            />
        </group>
    );
};

const DeepSpace = () => {
    return (
        <div className="absolute inset-0 z-0 bg-black pointer-events-none opacity-90">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <Starfield />
            </Canvas>
        </div>
    );
};

export default DeepSpace;
