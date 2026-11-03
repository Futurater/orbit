import React from 'react';
import { motion } from 'framer-motion';

export default function TextReveal({ text, className = '', delay = 0 }) {
  if (!text) return null;

  const characters = Array.from(text);

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
        delayChildren: delay,
      },
    },
  };

  const child = {
    hidden: {
      opacity: 0,
      y: '100%',
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 18,
        stiffness: 220,
      },
    },
  };

  return (
    <motion.span
      className={`inline-flex flex-wrap overflow-hidden ${className}`}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {characters.map((char, index) => (
        <span key={index} className="inline-block overflow-hidden">
          <motion.span variants={child} className="inline-block">
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
