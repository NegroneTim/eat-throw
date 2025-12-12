"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../hooks/useAppContext';
import { Timer } from '../../components/component';
import Image from 'next/image';

export default function Leaderboard() {
    const { user, setUser, isLoading } = useAppContext();
    const [leaderBoard, setLeaderBoard] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const router = useRouter();

    const [leaderboardData, setLeaderboardData] = useState({
        prizePool: 0,
        targetDate: "2025-12-02T16:00:00.000Z",
    });

    const prizeDistribution = [50, 25, 15, 5, 5];

    const imagesToLoad = [
        '/menu.png',
        '/player.png',
        '/ard.png'
    ];

    const getPrizeData = async () => {
        try {
            const token = localStorage.getItem('authToken');

            const headers = {
                'Cache-Control': 'no-cache'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`/api/prize`, {
                cache: "no-store",
                headers: headers
            });

            if (!response.ok) {
                if (response.status === 401) {

                    localStorage.removeItem('authToken');
                    localStorage.removeItem('cid');
                    setUser(null);
                    return null;
                }
                throw new Error('Prize API error');
            }

            const data = await response.json();


            if (data.prize) {
                setLeaderboardData({
                    prizePool: data.prize.bet || 0,
                    targetDate: data.prize.resetAt || data.prize.expiresAt || "2025-12-02T16:00:00.000Z",
                });
            }

            return data.prize;
        } catch (err) {
            console.error('Prize data error:', err);
            return null;
        }
    };

    const getLeaderBoardData = async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
            setDataLoaded(false);
        } else {
            setDataLoading(true);
        }

        try {
            const prizeData = await getPrizeData();

            const token = localStorage.getItem('authToken');
            const headers = {
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`/api/score`, {
                cache: "no-store",
                headers: headers
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('cid');
                    setUser(null);
                    return;
                }
                throw new Error(`Score API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.users) {
                const dataArray = [];
                const currentUserIds = new Set();


                data.users.forEach((item) => {

                    if (!currentUserIds.has(item._id)) {
                        currentUserIds.add(item._id);

                        dataArray.push({
                            name: `${item.user}#${item.unicode}`,
                            score: parseInt(item.dailyScore) || 0,
                            address: `0x${item._id}`,
                            isCurrentPlayer: user?._id ? item._id === user._id : false
                        });
                    } else {
                        console.log('Duplicate user found in API:', item._id);
                    }
                });


                if (user && !currentUserIds.has(user._id)) {

                    dataArray.push({
                        name: `${user.user}#${user.unicode || 1}`,
                        score: parseInt(user.dailyScore) || 0,
                        address: `${String(user._id).slice(0, 5)}...${String(user._id).slice(-5)}`,
                        isCurrentPlayer: true
                    });
                }


                dataArray.sort((a, b) => b.score - a.score);
                setLeaderBoard(dataArray);
            } else {
                setLeaderBoard([]);
            }


            setTimeout(() => {
                setDataLoaded(true);
                setIsRefreshing(false);
                setDataLoading(false);
            }, 300);

        } catch (err) {
            console.error('Leaderboard data error:', err);
            setDataLoaded(true);
            setIsRefreshing(false);
            setDataLoading(false);
        }
    };

    const handleRefresh = async () => {
        await getLeaderBoardData(true);
    };


    useEffect(() => {
        const autoRefreshInterval = setInterval(() => {
            if (user && !isRefreshing) {
                getLeaderBoardData();
            }
        }, 60000);

        return () => clearInterval(autoRefreshInterval);
    }, [user, isRefreshing]);

    useEffect(() => {
        setMounted(true);
        checkCachedImages();
    }, []);


    useEffect(() => {
        if (user === false) {

            router.push('/');
            return;
        }

        if (user) {

            getLeaderBoardData();
        }
    }, [user]);

    const checkCachedImages = () => {
        const cached = localStorage.getItem('gameImagesCached');
        if (cached === 'true') {
            setImagesLoaded(true);
            return;
        }
        preloadImages();
    };

    const preloadImages = () => {
        let loadedCount = 0;
        const totalImages = imagesToLoad.length;

        imagesToLoad.forEach((src) => {
            const img = new window.Image();
            img.onload = () => {
                loadedCount++;
                const progress = Math.round((loadedCount / totalImages) * 100);
                setLoadingProgress(progress);

                if (loadedCount === totalImages) {
                    localStorage.setItem('gameImagesCached', 'true');
                    setTimeout(() => {
                        setImagesLoaded(true);
                    }, 500);
                }
            };
            img.onerror = () => {
                loadedCount++;
                const progress = Math.round((loadedCount / totalImages) * 100);
                setLoadingProgress(progress);

                if (loadedCount === totalImages) {
                    setImagesLoaded(true);
                }
            };
            img.src = src;
        });
    };

    const handleBackgroundClick = (e) => {
        if (e.target === e.currentTarget) {
            router.push('/');
        }
    };

    const calculatePrize = (rank) => {
        const percentage = prizeDistribution[rank - 1];
        return (leaderboardData.prizePool * percentage) / 100;
    };


    if (!mounted || isLoading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 transition-opacity duration-300">
                <div className="bg-black/70 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col items-center mx-4">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin mb-2" fill="none" viewBox="0 0 24 24">
                        <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                    <div className="text-white text-xs sm:text-sm">Шинэчлэж байна...</div>
                </div>
            </div>
        );
    }


    if (user === false) {
        return null;
    }

    if (!imagesLoaded) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 transition-opacity duration-300">
                <div className="bg-black/70 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col items-center mx-4">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin mb-2" fill="none" viewBox="0 0 24 24">
                        <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                    <div className="text-white text-xs sm:text-sm">Шинэчлэж байна...</div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 flex flex-col overflow-hidden cursor-pointer"
            style={{ fontFamily: "'Press Start 2P', system-ui, sans-serif" }}
            onClick={handleBackgroundClick}
        >
            <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
            <div className="fixed inset-0 -z-10">
                <Image
                    src="/menu.png"
                    alt="Menu Background"
                    fill
                    className="object-cover brightness-50 transition-opacity duration-500"
                    priority
                    sizes="100vw"
                />
            </div>

            <div className="absolute inset-0 bg-black/30"></div>
            {dataLoading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 transition-opacity duration-300">
                    <div className="bg-black/70 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col items-center mx-4">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin mb-2" fill="none" viewBox="0 0 24 24">
                            <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        <div className="text-white text-xs sm:text-sm">Шинэчлэж байна...</div>
                    </div>
                </div>
            )}

            <div className="relative z-10 flex flex-col h-full p-2 sm:p-4 safe-area-padding">
                <div className="fixed top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex justify-between items-center z-50">
                    <button
                        className="w-10 h-10 sm:w-12 sm:h-12 border rounded-md flex items-center justify-center text-lg sm:text-xl shadow-lg active:scale-95 transition-transform text-white bg-black/50 hover:bg-black/70"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push('/');
                        }}
                    >
                        ←
                    </button>

                    <button
                        className={`w-10 h-10 sm:w-12 sm:h-12 border rounded-md flex items-center justify-center text-lg sm:text-xl shadow-lg active:scale-95 transition-all duration-300 bg-black/50 hover:bg-black/70 ${isRefreshing ? 'opacity-50' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isRefreshing) {
                                handleRefresh();
                            }
                        }}
                        disabled={isRefreshing}
                    >
                        <svg
                            className={`w-5 h-5 sm:w-6 sm:h-6 text-white ${isRefreshing ? 'animate-spin' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </button>
                </div>

                {isRefreshing && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 transition-opacity duration-300">
                        <div className="bg-black/70 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col items-center mx-4">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin mb-2" fill="none" viewBox="0 0 24 24">
                                <path
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            <div className="text-white text-xs sm:text-sm">Шинэчлэж байна...</div>
                        </div>
                    </div>
                )}

                <div
                    className={`text-center mb-4 sm:mb-6 mt-16 sm:mt-20 transition-all duration-500 ${dataLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                    style={{ transitionDelay: dataLoaded ? '100ms' : '0ms' }}
                >
                    <h1 className="text-white text-xl sm:text-3xl font-bold mb-2 px-2">ОНООНЫ ЖАГСААЛТ</h1>
                    <div className="text-yellow-300 text-xs sm:text-sm flex flex-col items-center gap-1">
                        <p>Улирал дуусах:</p>
                        <Timer targetDate={leaderboardData.targetDate} />
                    </div>
                </div>

                <div
                    className={`bg-black/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border-2 border-yellow-400 text-center transition-all duration-500 mx-2 ${dataLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                    style={{ transitionDelay: dataLoaded ? '200ms' : '0ms' }}
                >
                    <div className="text-yellow-300 text-xs sm:text-sm mb-2">ШАГНАЛЫН САН</div>
                    <div className="flex items-center justify-center gap-2">
                        <div className="text-white text-lg sm:text-2xl font-bold">{leaderboardData.prizePool.toLocaleString()}</div>
                        <div className="w-5 h-5 sm:w-6 sm:h-6 relative">
                            <Image
                                src="/ard.png"
                                alt="Crypto"
                                fill
                                className="object-contain"
                                sizes="24px"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-hidden px-2" onClick={(e) => e.stopPropagation()}>
                    <div
                        className={`bg-black/50 w-full rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 border-2 border-purple-400 transition-all duration-500 ${dataLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                        style={{ transitionDelay: dataLoaded ? '300ms' : '0ms' }}
                    >
                        <div className="text-purple-300 text-xs sm:text-sm text-center mb-2">ШАГНАЛЫН ХУВААРИЛАЛТ</div>
                        <div className="grid grid-cols-5 gap-2 text-center">
                            {prizeDistribution.map((percentage, index) => (
                                <div key={index} className="text-white text-xs">
                                    <div className="font-bold">{index + 1}р</div>
                                    <div className="text-yellow-300">{percentage}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {leaderBoard?.length > 0 ? (
                        leaderBoard.map((player, index) => (
                            <div
                                key={`${player.address}-${player.score}-${index}`}
                                className={`bg-black/40 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-2 sm:mb-3 border-2 transition-all duration-300 ${player.isCurrentPlayer ? 'border-white bg-gradient-to-r from-purple-500/30 to-blue-500/30 h-fit' :
                                    index === 0 ? 'border-yellow-400 bg-yellow-400/20' :
                                        index === 1 ? 'border-gray-400 bg-gray-400/20' :
                                            index === 2 ? 'border-orange-400 bg-orange-400/20' :
                                                'border-blue-400/50'
                                    } ${dataLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                                    }`}
                                style={{
                                    transitionDelay: dataLoaded ? `${500 + (index * 100)}ms` : '0ms'
                                }}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex justify-center items-center border text-white font-bold flex-shrink-0 text-xs sm:text-base ${index === 0 ? 'bg-yellow-500' :
                                            index === 1 ? 'bg-gray-500' :
                                                index === 2 ? 'bg-orange-500' :
                                                    'bg-blue-500'
                                            }`}>
                                            {index === 10 ? "?" : index + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`font-bold text-xs sm:text-sm truncate ${player.isCurrentPlayer ? 'text-yellow-300' : 'text-white'
                                                }`}>
                                                {player.name}
                                                {player.isCurrentPlayer && (
                                                    <span className="ml-1 sm:ml-2 text-xs text-yellow-300">(Та)</span>
                                                )}
                                            </div>
                                            <div className="text-gray-200 text-xs truncate">
                                                {player.address}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        <div className="text-white font-bold text-xs sm:text-sm whitespace-nowrap">
                                            {player.score.toLocaleString()} оноо
                                        </div>
                                        {index <= 4 && player?.score > 0 && (
                                            <div className="flex flex-col items-end">
                                                {leaderboardData.prizePool > 0 ?
                                                    <div className="text-green-400 text-xs whitespace-nowrap">
                                                        +{calculatePrize(index + 1).toFixed(2)} ARD
                                                    </div>
                                                    : null}
                                                <div className="text-yellow-300 text-xs">
                                                    ({prizeDistribution[index]}%)
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {player.isCurrentPlayer && (
                                    <div
                                        className="w-full text-center text-yellow-300 text-xs sm:text-sm mt-2 sm:mt-4 p-2 bg-black/30 rounded transition-opacity duration-300"
                                        style={{ transitionDelay: dataLoaded ? '500ms' : '0ms' }}
                                    >
                                        {(index <= 4 && player.score != 0) ? "Баяр хүргэе! Та одоогийн байдлаар ялагч болсон байна!" : "Дээшлэхийн тулд тоглоомоо үргэлжлүүлээрэй!"}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (

                        <div
                            className={`text-center py-8 transition-all duration-500 ${dataLoaded ? 'opacity-100' : 'opacity-0'
                                }`}
                        >
                            <div className="text-white text-base sm:text-lg mb-2">Мэдээлэл олдсонгүй</div>
                            <div className="text-gray-400 text-sm">Тоглогчид байхгүй байна</div>
                        </div>
                    )}

                </div>

                <div className="h-4 sm:h-0"></div>
            </div>

            <style jsx>{`
                .safe-area-padding {
                    padding-left: env(safe-area-inset-left);
                    padding-right: env(safe-area-inset-right);
                    padding-bottom: env(safe-area-inset-bottom);
                }
            `}</style>
        </div>
    );
}