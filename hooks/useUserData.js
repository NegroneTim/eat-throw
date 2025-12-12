"use client";

import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';

export const useUserData = (user, setUser) => {
  const { fetchWithAuth, refreshAuthToken } = useApi();
  const [userData, setUserData] = useState({
    ard: -1,
    coins: -1,
    levels: { health: 0, coins: 0, ammo: 0 }
  });

  const updateUserData = useCallback((user) => {
    if (user) {
      setUserData({
        ard: user.ard || 0,
        coins: user.zoos || 0,
        levels: {
          health: user.stats?.hp || 0,
          coins: user.stats?.earning || 0,
          ammo: user.stats?.maxCapacity || 0
        }
      });
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      const userId = user?._id;
      if (!userId) return false;

      const response = await fetchWithAuth(`/api/users/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        const updatedUser = data.result || data.user || data;
        
        if (updatedUser) {
          const newToken = await refreshAuthToken(updatedUser);
          if (newToken) {
            localStorage.setItem('authToken', newToken);
          }
          
          setUser(updatedUser);
          updateUserData(updatedUser);
          return true;
        }
      }
    } catch (error) {
      console.error('User мэдээлэл шинэчлэх алдаа:', error);
    }
    return false;
  }, [user, setUser, fetchWithAuth, refreshAuthToken, updateUserData]);

  useEffect(() => {
    if (user) {
      updateUserData(user);
    }
  }, [user, updateUserData]);

  return { 
    ard: userData.ard, 
    coins: userData.coins, 
    levels: userData.levels, 
    setUserData, 
    refreshUserData,
    updateUserData 
  };
};