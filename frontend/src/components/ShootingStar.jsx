// src/components/ShootingStar.jsx
import React from 'react';
import { motion } from 'framer-motion';

const ShootingStar = () => {
    return (
        <motion.div
            className="shooting-star-wrapper"
            style={{
                position: 'absolute',
                zIndex: 1,
                pointerEvents: 'none',
            }}
            initial={{ top: '-5%', left: '80%' }}
            animate={{ top: '105%', left: '20%' }}
            transition={{
                duration: 3,
                ease: 'linear',
                repeat: Infinity,
                repeatDelay: 5,
            }}
        >
            {/* The glowing head */}
            <div
                className="shooting-star-blink"
                style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 0 12px 4px rgba(255,255,255,0.8), 0 0 30px 8px rgba(6,182,212,0.3)',
                }}
            />

            {/* The gradient tail */}
            <div
                style={{
                    position: 'absolute',
                    top: '-2px',
                    left: '6px',
                    width: '150px',
                    height: '2px',
                    background: 'linear-gradient(to right, rgba(255,255,255,0.6), rgba(255,255,255,0.1), transparent)',
                    transform: 'rotate(-40deg)',
                    transformOrigin: 'left center',
                    borderRadius: '2px',
                }}
            />
        </motion.div>
    );
};

export default ShootingStar;
