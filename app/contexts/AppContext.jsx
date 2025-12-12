"use client";
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { jwtVerify } from 'jose';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const verifyToken = useCallback(async (token, userId) => {
    try {
      const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      return payload.user && payload.user._id === userId ? payload.user : null;
    } catch {
      return null;
    }
  }, []);

  const clearSession = useCallback(() => {
    ['authToken', 'cid', 'userPreferences', 'lastLogin'].forEach(key => 
      localStorage.removeItem(key)
    );
  }, []);

  const refreshUser = useCallback(async (userId, token) => {
    try {
      const headers = {
        'Cache-Control': 'no-cache',
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(`/api/users/${userId}`, {
        cache: "no-store",
        headers
      });

      if (response.ok) {
        const data = await response.json();
        return data.user || data.result;
      }
    } catch (error) {
      console.error('Хэрэглэгч шинэчлэх алдаа:', error);
    }
    return null;
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('cid');

        if (!token || !userId) {
          setUser(false);
          return;
        }

        let authenticatedUser = await verifyToken(token, userId);
        
        if (!authenticatedUser) {
          authenticatedUser = await refreshUser(userId, token);
        }

        setUser(authenticatedUser || false);
      } catch (error) {
        console.error('Auth эхлүүлэх алдаа:', error);
        setUser(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [verifyToken, refreshUser]);

  const setUserWithPersistence = useCallback((newUser) => {
    setUser(newUser);

    if (newUser && newUser._id) {
      localStorage.setItem('cid', newUser._id);
    } else if (newUser === false) {
      clearSession();
    }
  }, [clearSession]);

  return (
    <AppContext.Provider value={{
      user,
      setUser: setUserWithPersistence,
      isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};