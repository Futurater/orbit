import React, { useState, createContext } from 'react';

export const OrbitContext = createContext();

export const OrbitProvider = ({ children }) => {
  // We start with isPaused = true so your IDE shows up immediately for testing
  const [isPaused, setIsPaused] = useState(true);

  // This toggles the Voice Viva microphone phase
  const [vivaPhaseActive, setVivaPhaseActive] = useState(false);

  return (
    <OrbitContext.Provider value={{ isPaused, setIsPaused, vivaPhaseActive, setVivaPhaseActive }}>
      {children}
    </OrbitContext.Provider>
  );
};