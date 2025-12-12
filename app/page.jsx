"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from "../hooks/useAppContext";
import { useUserData } from "../hooks/useUserData";
import { useGameState } from "../hooks/useGameState";
import { useApi } from "../hooks/useApi";
import { SvgLeader } from "../components/svg";
import { UserComponent } from "../components/userComponent";
import { UpgradePanel } from "../components/upgradePanel";
import { GameStartModal } from "../components/gameStartModal";
import { LoadingScreen } from "../components/loadingScreen";
import { CurrencyDisplay } from "../components/currencyDisplay";
import { GameStartInfo } from "../components/gameStartInfo";
import Image from 'next/image';

export default function Menu() {
  const router = useRouter();
  const { user, setUser, isLoading } = useAppContext();
  const { ard, coins, levels, refreshUserData } = useUserData(user, setUser);
  const {
    imagesLoaded, loadingProgress, contentLoaded,
    gameStarting, startProgress, startStatus,
    updateGameState, setButtonAnimation,
    insufficientArd, showArdAlert
  } = useGameState();
  const { fetchWithAuth } = useApi();

  const upgradeCost = 100;
  const cleanupRef = useRef(null);

  useEffect(() => {
    updateGameState({ mounted: true });
    checkCachedImages();
  }, []);

  useEffect(() => {
    if (user) {
      setTimeout(() => updateGameState({ contentLoaded: true }), 300);
      const cleanup = startAutoRefresh();
      cleanupRef.current = cleanup;

      return () => {
        if (cleanupRef.current) {
          cleanupRef.current();
        }
      };
    }
  }, [user]);

  const checkCachedImages = () => {
    const cached = localStorage.getItem('gameImagesCached');
    if (cached === 'true') {
      updateGameState({ imagesLoaded: true });
      return;
    }
    preloadImages();
  };

  const preloadImages = () => {
    const imagesToLoad = ['/menu.png', '/player.png', '/ard.png'];
    let loadedCount = 0;

    imagesToLoad.forEach((src) => {
      const img = new window.Image();
      img.onload = img.onerror = () => {
        loadedCount++;
        const progress = Math.round((loadedCount / imagesToLoad.length) * 100);
        updateGameState({ loadingProgress: progress });

        if (loadedCount === imagesToLoad.length) {
          localStorage.setItem('gameImagesCached', 'true');
          setTimeout(() => updateGameState({ imagesLoaded: true }), 500);
        }
      };
      img.src = src;
    });
  };

  const startAutoRefresh = () => {
    if (!user || !user._id) return () => { };
    const setupMidnightRefresh = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();
      const currentMillisecond = now.getMilliseconds();

      let hoursUntilMidnight = (24 - currentHour) % 24;
      if (hoursUntilMidnight === 0 && (currentMinute > 0 || currentSecond > 0 || currentMillisecond > 0)) {
        hoursUntilMidnight = 24;
      }

      const minutesUntilMidnight = -currentMinute;
      const secondsUntilMidnight = -currentSecond;
      const millisecondsUntilMidnight = -currentMillisecond;

      const msUntilMidnight =
        (hoursUntilMidnight * 60 * 60 * 1000) +
        (minutesUntilMidnight * 60 * 1000) +
        (secondsUntilMidnight * 1000) +
        millisecondsUntilMidnight;

      const midnightTimeoutId = setTimeout(async () => {
        try {
          await refreshUserData();


          setupMidnightRefresh();
        } catch (error) {
          console.error('❌ Шөнийн 12 цагийн шинэчлэл амжилтгүй:', error);
          setTimeout(setupMidnightRefresh, 5 * 60 * 1000);
        }
      }, msUntilMidnight);

      return midnightTimeoutId;
    };

    const THREE_MINUTES = 3 * 60 * 1000;
    const threeMinuteIntervalId = setInterval(async () => {
      try {
        await refreshUserData();
      } catch (error) {
        console.error('❌ 3 минутын шинэчлэл амжилтгүй:', error);
      }
    }, THREE_MINUTES);

    const midnightTimeoutId = setupMidnightRefresh();

    return () => {
      if (midnightTimeoutId) {
        clearTimeout(midnightTimeoutId);
      }
      if (threeMinuteIntervalId) {
        clearInterval(threeMinuteIntervalId);
      }
    };
  };

  const handleUpgrade = async (type) => {
    const currentLevel = levels[type];
    const cost = upgradeCost * currentLevel;

    if (coins < cost) {
      setButtonAnimation(type, 'error');
      return false;
    }

    try {
      const newCoins = coins - cost;
      const newLevels = { ...levels, [type]: currentLevel + 1 };

      await saveGameData(newCoins, newLevels);
      return true;
    } catch (error) {
      console.error('Upgrade алдаа:', error);
      return false;
    }
  };

  const saveGameData = async (newCoins, newLevels) => {
    const data = {
      zoos: newCoins,
      stats: {
        hp: newLevels.health,
        earning: newLevels.coins,
        maxCapacity: newLevels.ammo
      }
    };

    const response = await fetchWithAuth(`/api/users/${user._id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (response.ok) {
      await refreshUserData();
    }
  };

  const handleGameStart = async () => {
    if (ard < 10) {
      updateGameState({
        insufficientArd: true,
        showArdAlert: true
      });

      setTimeout(() => {
        updateGameState({
          insufficientArd: false,
          showArdAlert: false
        });
      }, 3000);
      return;
    }

    updateGameState({
      gameStarting: true,
      startProgress: 10,
      startStatus: 'ТОГЛООМ ЭХЛЭХ ПРОЦЕСС...'
    });

    try {

      await updatePrizeData();

      const data = { ard: ard - 10 };
      const response = await fetchWithAuth(`/api/users/${user._id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await refreshUserData();
        updateGameState({
          startProgress: 100,
          startStatus: 'АМЖИЛТТАЙ ДУУССАН...'
        });

        setTimeout(() => {
          router.push('/game');
        }, 1000);
      }
    } catch (error) {
      console.error('Тоглоом эхлүүлэх алдаа:', error);
      updateGameState({
        startStatus: 'АЛДАА ГАРЛАА. ДАХИН ОРолдоно уу...'
      });

      setTimeout(() => {
        updateGameState({
          gameStarting: false,
          startProgress: 0,
          startStatus: ''
        });
      }, 3000);
    }
  };

  const updatePrizeData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const prizeResponse = await fetch('/api/prize', {
        headers: { 'Cache-Control': 'no-cache' }
      });

      let currentBet = 0;
      if (prizeResponse.ok) {
        const prizeData = await prizeResponse.json();
        currentBet = prizeData.prize?.bet || 0;
      }


      const newBet = currentBet + 10;
      await fetch('/api/prize', {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ bet: newBet })
      });

    } catch (error) {
      console.error('Prize өгөгдөл шинэчлэх алдаа:', error);
      throw error;
    }
  };

  if (isLoading || !imagesLoaded) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden cursor-pointer pixel-font">
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />

      {gameStarting && <GameStartModal progress={startProgress} status={startStatus} />}

      {showArdAlert && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-fade-in">
          <div className="bg-red-900/95 border-4 border-red-600 rounded-lg p-6 max-w-sm text-center pixel-corners">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-20 relative">
                <Image
                  src="/ard.png"
                  alt="ARD"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <h3 className="text-red-300 text-lg font-bold mb-2 pixel-text">
              ARD ДУУССАН!
            </h3>
            <p className="text-white text-sm mb-4 pixel-text">
              Таны ARD хангалтгүй байна.
              <br />
              Тоглоом эхлүүлэхийн тулд 10 ARD шаардагдана.
            </p>
            <div className="flex items-center justify-center gap-2 text-yellow-300 text-sm pixel-text">
              <span>Таны ARD:</span>
              <span className="font-bold">{ard}</span>
              <span>/ 10</span>
            </div>
          </div>
        </div>
      )}

      {showArdAlert && (
        <div
          className="absolute w-full h-full top-0 bg-black/50 z-40"
          onClick={() => updateGameState({ showArdAlert: false })}
        />
      )}

      <div className="fixed inset-0 -z-10">
        <Image
          src="/menu.png"
          alt="Menu Background"
          fill
          className="object-cover brightness-50 transition-opacity duration-1000"
          priority
        />
      </div>

      <div className="relative z-10 flex flex-col h-[94dvh]" onClick={handleGameStart}>
        <button
          className="fixed left-4 top-4 w-12 h-12 border-4 bg-yellow-500 rounded-md flex items-center justify-center text-xl shadow-lg z-40 transition-all duration-500 hover:scale-110 hover:bg-yellow-300 active:scale-95 pixel-corners"
          onClick={(e) => { e.stopPropagation(); router.push('/leader'); }}
        >
          <SvgLeader />
        </button>

        <CurrencyDisplay ard={ard} coins={coins} insufficientArd={insufficientArd} />

        <GameStartInfo user={user} contentLoaded={contentLoaded} ard={ard} />

        <UpgradePanel
          levels={levels}
          coins={coins}
          upgradeCost={upgradeCost}
          onUpgrade={handleUpgrade}
          contentLoaded={contentLoaded}
        />
      </div>

      <UserComponent user={user} setUser={setUser} />
    </div>
  );
}