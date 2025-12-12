"use client";

import { useState, useCallback } from 'react';

export const useGameState = () => {
  const [gameState, setGameState] = useState({
    imagesLoaded: false,
    loadingProgress: 0,
    contentLoaded: false,
    buttonAnimations: {},
    insufficientArd: false,
    gameStarting: false,
    startProgress: 0,
    startStatus: ''
  });

  const updateGameState = useCallback((updates) => {
    setGameState(prev => ({ ...prev, ...updates }));
  }, []);

  const setButtonAnimation = useCallback((type, animation) => {
    setGameState(prev => ({
      ...prev,
      buttonAnimations: { ...prev.buttonAnimations, [type]: animation }
    }));
    
    if (animation) {
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          buttonAnimations: { ...prev.buttonAnimations, [type]: '' }
        }));
      }, animation === 'success' ? 1500 : 600);
    }
  }, []);

  return { 
    ...gameState, 
    updateGameState, 
    setButtonAnimation 
  };
};