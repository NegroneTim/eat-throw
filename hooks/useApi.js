"use client";

import { useCallback } from 'react';
import { SignJWT } from 'jose';

export const useApi = () => {
  const refreshAuthToken = useCallback(async (userData) => {
    try {
      if (!userData) return null;

      const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET);
      const tokenPayload = {
        user: {
          _id: userData._id,
          uid: userData.uid,
          user: userData.user,
          unicode: userData.unicode || 1,
          dailyScore: userData.dailyScore,
          zoos: userData.zoos,
          ard: userData.ard,
          stats: userData.stats
        }
      };

      return await new SignJWT(tokenPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('2h')
        .setIssuedAt()
        .sign(secret);
    } catch (error) {
      console.error('AuthToken шинэчлэхэд алдаа:', error);
      return null;
    }
  }, []);

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    try {
      let token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...options.headers
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
        cache: 'no-store'
      });

      if (response.ok) return response;

      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          return await fetch(url, { ...options, headers });
        }
      }

      return response;
    } catch (error) {
      console.error('API дуудалт алдаа:', error);
      throw error;
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const userId = localStorage.getItem('cid');
      const oldToken = localStorage.getItem('authToken');
      
      if (!userId || !oldToken) return null;

      const response = await fetch(`/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${oldToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.result || data.user;
        
        if (userData) {
          const newToken = await refreshAuthToken(userData);
          localStorage.setItem('authToken', newToken);
          return newToken;
        }
      }
    } catch (error) {
      console.error('Token refresh алдаа:', error);
    }
    return null;
  }, [refreshAuthToken]);

  return { fetchWithAuth, refreshAuthToken, refreshToken };
};