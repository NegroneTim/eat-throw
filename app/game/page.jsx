'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../hooks/useAppContext';

export default function Game() {
    const { user, setUser } = useAppContext();
    const gameRef = useRef(null);
    const kInstanceRef = useRef(null);
    const initializedRef = useRef(false);
    const router = useRouter();

    const [gameInfo, setGameInfo] = useState({
        hp: 100,
        maxHp: 100,
        score: 0,
        ammo: 0,
        maxAmmo: 3,
        coins: 0,
        totalCoinsEarned: 0
    });
    useEffect(() => {
        if (!user) router.push('/')
    }, [user, router]);

    useEffect(() => {
        console.log('Initializing game...');

        initializedRef.current = true;

        const initGame = async () => {
            try {
                const kaplayModule = await import('kaplay');
                const kaplay = kaplayModule.default;

                if (kInstanceRef.current) {
                    try {
                        kInstanceRef.current.destroyAll();
                        kInstanceRef.current.destroy();
                    } catch (cleanupError) {
                        console.warn('Cleanup error:', cleanupError);
                    }
                    kInstanceRef.current = null;
                }

                if (!gameRef.current) {
                    console.warn('Game container not found');
                    return;
                }

                document.body.style.margin = '0';
                document.body.style.padding = '0';
                document.body.style.overflow = 'hidden';
                document.documentElement.style.margin = '0';
                document.documentElement.style.padding = '0';
                document.documentElement.style.overflow = 'hidden';

                const map = [
                    "================",
                    "=              =",
                    "=              =",
                    "=              =",
                    "=              =",
                    "=              =",
                    "=              =",
                    "=              =",
                    "=              =",
                    "=              =",
                    "=              =",
                    "=              =",
                    "=              =",
                    "=              =",
                    "=              =",
                    "================",
                ];

                const containerWidth = window.innerWidth;
                const containerHeight = window.innerHeight;
                const k = kaplay({
                    global: true,
                    touchToMouse: true,
                    crisp: true,
                    root: gameRef.current,
                    width: window.innerWidth,
                    height: window.innerHeight,
                    background: [20, 20, 60],
                    scale: 1,
                });

                kInstanceRef.current = k;

                await k.loadFont("gameFont", "/fonts/PressStart2P.ttf");

                const loadGameData = () => {
                    return {
                        coins: user?.ard,
                        levels: {
                            health: user?.stats.hp,
                            coins: user?.stats.earning,
                            ammo: user?.stats.maxCapacity
                        },
                        highScore: user?.dailyScore
                    };
                };

                const gameData = loadGameData();

                const BASE_MAX_HP = 100;
                const BASE_MAX_AMMO_CAPACITY = 3;
                const BASE_COIN_MULTIPLIER = 1;

                const MAX_HP = BASE_MAX_HP + (gameData.levels.health - 1) * 20;
                const MAX_AMMO_CAPACITY = (gameData.levels.ammo);
                const COIN_MULTIPLIER = BASE_COIN_MULTIPLIER + (gameData.levels.coins - 1) * 0.5;

                const MAX_SPEED = 400;
                const MIN_SPEED = 100;
                const ENEMY_SPEED = 80;
                const BULLET_SPEED = 300;
                const PLAYER_BULLET_SPEED = 500;
                const KILL_RANGE = 40;
                const JOYSTICK_MAX_DIST = 60;
                const TILE_SIZE = 50;

                const INITIAL_GAME_SPEED = 0.8;
                const MAX_GAME_SPEED = 1.5;
                const GAME_SPEED_INCREASE_RATE = 0.00003;
                let gameSpeed = INITIAL_GAME_SPEED;

                let playerHP = MAX_HP;
                let score = 0;
                let enemies = [];
                let joystickActive = false;
                let joystickDir = k.vec2(0, 0);
                let currentSpeed = 0;
                let joystickBasePos = k.vec2(0, 0);
                let joystickInitialized = false;
                let playerDir = k.vec2(0, 1);
                let lastShootTime = 0;
                const SHOOT_COOLDOWN = 0.15;
                let ammo = 0;
                let ammoIndicators = [];
                let totalCoinsEarned = 0;

                const updateGameInfo = (updates) => {
                    setGameInfo(prev => ({ ...prev, ...updates }));
                };


                updateGameInfo({
                    hp: playerHP,
                    maxHp: MAX_HP,
                    ammo: ammo,
                    maxAmmo: MAX_AMMO_CAPACITY,
                    score: score,
                    coins: user?.zoos || 0
                });

                const mapWidth = map[0].length * TILE_SIZE;
                const mapHeight = map.length * TILE_SIZE;
                const mapOffsetX = (k.width() - mapWidth) / 2;
                const mapOffsetY = (k.height() - mapHeight) / 2;


                for (let x = 0; x < k.width(); x += 100) {
                    for (let y = 0; y < k.height(); y += 100) {
                        k.add([
                            k.rect(100, 100),
                            k.pos(x, y),
                            k.color(30, 30, 70),
                            k.outline(1, k.Color.fromArray([40, 40, 90]))
                        ]);
                    }
                }


                const walls = [];
                const level = k.add([k.pos(mapOffsetX, mapOffsetY)]);

                map.forEach((row, y) => {
                    for (let x = 0; x < row.length; x++) {
                        const tile = row[x];
                        if (tile === '=') {
                            const wall = level.add([
                                k.rect(TILE_SIZE, TILE_SIZE),
                                k.pos(x * TILE_SIZE, y * TILE_SIZE),
                                k.area(),
                                k.body({ isStatic: true }),
                                k.color(100, 100, 200),
                                k.outline(2, k.Color.fromArray([150, 150, 255])),
                                'wall'
                            ]);
                            walls.push(wall);
                        }
                    }
                });


                const player = k.add([
                    k.circle(15),
                    k.pos(k.width() / 2, k.height() / 2),
                    k.area(),
                    k.body(),
                    k.anchor("center"),
                    k.color(50, 200, 100),
                ]);


                const joystickBase = k.add([
                    k.circle(containerWidth < 768 ? 40 : 50),
                    k.pos(0, 0),
                    k.fixed(),
                    k.anchor("center"),
                    k.color(255, 255, 255),
                    k.opacity(0),
                    k.outline(2, k.Color.fromArray([255, 255, 255])),
                    k.area({ radius: containerWidth < 768 ? 40 : 50 }),
                    "joystick"
                ]);

                const joystickHandle = k.add([
                    k.circle(containerWidth < 768 ? 20 : 25),
                    k.pos(0, 0),
                    k.fixed(),
                    k.anchor("center"),
                    k.color(255, 255, 255),
                    k.opacity(0),
                    k.outline(2, k.Color.fromArray([200, 200, 255])),
                    k.area({ radius: containerWidth < 768 ? 20 : 25 }),
                    "joystick"
                ]);

                const BOTTOM_AREA_HEIGHT = containerHeight * 0.4;
                const joystickAreaTop = 110 + 50;

                let camTarget = player.pos;
                const CAMERA_SMOOTHNESS = 0.2;


                k.onTouchStart((pos) => {
                    if (!player.exists()) return;
                    if (pos.y > joystickAreaTop && !joystickActive) {
                        joystickActive = true;
                        joystickBasePos = pos;
                        joystickBase.pos = pos;
                        joystickHandle.pos = pos;
                        joystickBase.opacity = 0.3;
                        joystickHandle.opacity = 0.8;
                        joystickInitialized = true;
                    }
                });

                k.onTouchEnd((pos) => {
                    if (joystickActive) {
                        shoot();
                        joystickActive = false;
                        joystickDir = k.vec2(0, 0);
                        currentSpeed = 0;
                        joystickBase.pos = k.vec2(k.width() / 2, k.height() - BOTTOM_AREA_HEIGHT / 2);
                        joystickHandle.pos = k.vec2(k.width() / 2, k.height() - BOTTOM_AREA_HEIGHT / 2);
                        joystickBase.opacity = 0;
                        joystickHandle.opacity = 0;
                    }
                });

                k.onTouchMove((pos) => {
                    if (!joystickActive) return;

                    const diff = pos.sub(joystickBasePos);
                    const dist = Math.min(diff.len(), JOYSTICK_MAX_DIST);
                    const dir = diff.unit();

                    joystickDir = dir;
                    const speedPercentage = dist / JOYSTICK_MAX_DIST;
                    currentSpeed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * speedPercentage;
                    joystickHandle.pos = joystickBasePos.add(dir.scale(dist));

                    const intensity = 0.5 + speedPercentage * 0.5;
                    joystickHandle.color = k.Color.fromArray([intensity * 255, intensity * 255, 255]);
                });

                function shoot(direction) {
                    const now = k.time();
                    if (now - lastShootTime < SHOOT_COOLDOWN) return;
                    if (ammo <= 0) return;

                    lastShootTime = now;
                    ammo--;


                    updateGameInfo({ ammo: ammo });

                    let nearestEnemy = null;
                    let nearestDist = Infinity;

                    enemies.forEach(enemy => {
                        if (enemy.exists()) {
                            const dist = player.pos.dist(enemy.pos);
                            if (dist < nearestDist) {
                                nearestDist = dist;
                                nearestEnemy = enemy;
                            }
                        }
                    });

                    if (nearestEnemy && nearestEnemy.exists()) {
                        const direction = nearestEnemy.pos.sub(player.pos).unit();
                        const bulletStartPos = player.pos.add(direction.scale(20));

                        const bullet = k.add([
                            k.circle(10),
                            k.pos(bulletStartPos),
                            k.move(direction, PLAYER_BULLET_SPEED * gameSpeed * 1.5),
                            k.area({ scale: 1.8 }),
                            k.offscreen({ destroy: true }),
                            k.anchor("center"),
                            k.color(200, 50, 50),
                            k.outline(3, k.Color.fromArray([255, 100, 100])),
                            "playerBullet",
                        ]);
                        k.loop(0.05, () => {
                            if (!bullet.exists()) return;
                            k.add([
                                k.circle(4),
                                k.pos(bullet.pos),
                                k.color(200, 50, 50),
                                k.opacity(0.6),
                                k.lifespan(0.2),
                                k.anchor("center"),
                            ]);
                        });

                        player.move(direction.scale(-25 * gameSpeed));
                        k.shake(3);
                    }
                }

                function isValidPosition(x, y) {
                    const localX = x - mapOffsetX;
                    const localY = y - mapOffsetY;

                    const tileX = Math.floor(localX / TILE_SIZE);
                    const tileY = Math.floor(localY / TILE_SIZE);

                    if (tileY >= 0 && tileY < map.length &&
                        tileX >= 0 && tileX < map[0].length) {
                        return map[tileY][tileX] !== '=';
                    }

                    return false;
                }

                function createEnemy(x, y) {
                    const enemy = k.add([
                        k.rect(25, 25, { radius: 6 }),
                        k.pos(x, y),
                        k.anchor("center"),
                        k.area(),
                        k.body(),
                        k.color(200, 50, 50),
                        k.outline(3, k.Color.fromArray([255, 100, 100])),
                        k.rotate(k.rand(0, 360)),
                        k.state("move", ["idle", "attack", "move"]),
                        "enemy"
                    ]);

                    enemies.push(enemy);

                    enemy.onStateEnter("idle", async () => {
                        enemy.color = k.Color.fromArray([255, 200, 50]);
                        enemy.outline.color = k.Color.fromArray([255, 220, 100]);

                        await k.wait(0.6 / gameSpeed);
                        if (enemy.exists()) enemy.enterState("attack");
                    });

                    enemy.onStateEnter("attack", async () => {
                        enemy.color = k.Color.fromArray([100, 150, 255]);
                        enemy.outline.color = k.Color.fromArray([150, 200, 255]);

                        if (player.exists() && enemy.exists()) {
                            const dir = player.pos.sub(enemy.pos).unit();
                            k.add([
                                k.rect(12, 12, { radius: 3 }),
                                k.pos(enemy.pos),
                                k.move(dir, BULLET_SPEED * gameSpeed),
                                k.area(),
                                k.offscreen({ destroy: true }),
                                k.anchor("center"),
                                k.color(100, 150, 255),
                                k.outline(2, k.Color.fromArray([150, 200, 255])),
                                "bullet",
                            ]);
                        }
                        await k.wait(0.1 / gameSpeed);
                        if (enemy.exists()) enemy.enterState("move");
                    });

                    enemy.onStateEnter("move", async () => {
                        enemy.color = k.Color.fromArray([200, 50, 50]);
                        enemy.outline.color = k.Color.fromArray([255, 100, 100]);

                        await k.wait(k.rand(2.4, 3) / gameSpeed);
                        if (enemy.exists()) enemy.enterState("idle");
                    });

                    enemy.onStateUpdate("move", () => {
                        if (!player.exists() || !enemy.exists()) return;

                        const dir = player.pos.sub(enemy.pos).unit();
                        const newPos = enemy.pos.add(dir.scale(ENEMY_SPEED * k.dt() * gameSpeed));

                        if (isValidPosition(newPos.x, newPos.y)) {
                            enemy.move(dir.scale(ENEMY_SPEED * gameSpeed));
                        }

                        enemy.angle += 2 * gameSpeed;
                    });

                    return enemy;
                }

                function createEnemiesInValidPositions(count) {
                    let created = 0;
                    let attempts = 0;

                    while (created < count && attempts < 100) {
                        const x = k.rand(mapOffsetX + TILE_SIZE, mapOffsetX + mapWidth - TILE_SIZE);
                        const y = k.rand(mapOffsetY + TILE_SIZE, mapOffsetY + mapHeight - TILE_SIZE);

                        if (isValidPosition(x, y) && player.pos.dist(k.vec2(x, y)) > 100) {
                            createEnemy(x, y);
                            created++;
                        }
                        attempts++;
                    }
                }

                createEnemiesInValidPositions(3);

                const saveGameProgress = async () => {
                    const currentHighScore = parseInt(user?.dailyScore || 0);
                    const coinsEarned = Math.floor(score / 200);
                    totalCoinsEarned = coinsEarned;
                    const currentCoins = user?.zoos || 0;
                    const newCoins = currentCoins + coinsEarned;

                    const data = {
                        ammo: gameInfo.ammo,
                        coins: gameInfo.coins,
                        hp: 0,
                        maxAmmo: gameInfo.maxAmmo,
                        maxHp: gameInfo.maxHp,
                        score: gameInfo.score,
                        totalCoinsEarned: coinsEarned
                    }
                    setGameInfo(data)

                    try {
                        let data = {
                            dailyScore: score > currentHighScore ? score : currentHighScore,
                            zoos: newCoins,
                            stats: {
                                hp: user?.stats?.hp || 1,
                                earning: user?.stats?.earning || 1,
                                maxCapacity: user?.stats?.maxCapacity || 1
                            }
                        }

                        const token = localStorage.getItem('authToken');
                        const headers = {
                            'Content-Type': 'application/json'
                        };

                        if (token) {
                            headers['Authorization'] = `Bearer ${token}`;
                            console.log("Using token from localStorage");
                        } else {
                            console.warn("No token found in localStorage");
                        }

                        const userId = user?._id || user?.uid;
                        const apiUrl = `/api/users/${userId}`;
                        console.log("API URL:", apiUrl);

                        const response = await fetch(apiUrl, {
                            method: 'PUT',
                            headers: headers,
                            body: JSON.stringify(data)
                        });

                        console.log("Response status:", response.status);

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('API Error:', {
                                status: response.status,
                                error: errorText
                            });

                            if (response.status === 401) {
                                localStorage.removeItem('authToken');
                                console.log("Token removed due to 401 error");
                            }

                            throw new Error(`Network error: ${response.status} - ${errorText}`);
                        }

                        const responseData = await response.json();
                        console.log("API Response:", responseData);

                        if (responseData.token) {
                            localStorage.setItem('authToken', responseData.token);
                            console.log("New token stored");
                        }

                        if (responseData.result || responseData.user) {
                            const updatedUser = responseData.result || responseData.user;
                            console.log("Updated user data:", updatedUser);
                            setUser(updatedUser);
                        }

                        return { coinsEarned, newHighScore: score > currentHighScore ? score : currentHighScore };
                    }
                    catch (err) {
                        console.error('Save error:', err);
                        return { coinsEarned, newHighScore: score > currentHighScore ? score : currentHighScore };
                    }
                };

                function updateHealthDisplay() {

                    updateGameInfo({
                        hp: playerHP,
                        maxHp: MAX_HP
                    });
                }

                function updateScoreDisplay() {
                    updateGameInfo({ score: score });
                }

                function updateAmmoDisplay() {
                    updateGameInfo({
                        ammo: ammo,
                        maxAmmo: MAX_AMMO_CAPACITY
                    });
                }


                updateHealthDisplay();
                updateScoreDisplay();
                updateAmmoDisplay();

                async function GameResultScore() {
                    try {
                        const { coinsEarned } = await saveGameProgress();
                        console.log("Save result:", coinsEarned);
                    }
                    catch (error) {
                        console.error("Error in game over menu:", error);
                    }
                }

                k.onUpdate(() => {
                    if (gameSpeed < MAX_GAME_SPEED) {
                        gameSpeed += GAME_SPEED_INCREASE_RATE;
                    }

                    camTarget = camTarget.lerp(player.pos, CAMERA_SMOOTHNESS);
                    k.setCamPos(camTarget);

                    if (joystickActive && joystickDir.len() > 0 && currentSpeed > 0) {
                        const newX = player.pos.x + joystickDir.x * currentSpeed * k.dt() * gameSpeed;
                        const newY = player.pos.y + joystickDir.y * currentSpeed * k.dt() * gameSpeed;

                        if (isValidPosition(newX, newY)) {
                            player.move(joystickDir.x * currentSpeed * gameSpeed, joystickDir.y * currentSpeed * gameSpeed);
                            player.angle += joystickDir.x * 3 * gameSpeed;
                            playerDir = joystickDir;
                        }
                    }

                    if (!player.exists()) return;

                    for (let i = enemies.length - 1; i >= 0; i--) {
                        const enemy = enemies[i];
                        if (enemy.exists() && player.pos.dist(enemy.pos) < KILL_RANGE && ammo < MAX_AMMO_CAPACITY) {
                            enemy.destroy();
                            enemies.splice(i, 1);

                            if (ammo < MAX_AMMO_CAPACITY) {
                                ammo += 1;
                                updateAmmoDisplay();
                            }

                            score += 100;
                            updateScoreDisplay();

                            for (let j = 0; j < 8; j++) {
                                const angle = (j / 8) * 360;
                                const dir = k.vec2(Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180));
                                k.add([
                                    k.rect(10, 15),
                                    k.pos(player.pos),
                                    k.move(dir.scale(k.rand(100, 200) * gameSpeed)),
                                    k.color(255, 200, 50),
                                    k.opacity(1),
                                    k.lifespan(0.5 / gameSpeed),
                                    k.anchor("center"),
                                ]);
                            }
                            k.shake(7);

                            for (let j = 0; j < 2; j++) {
                                k.wait(j * 500 / gameSpeed).then(() => {
                                    createEnemiesInValidPositions(2);
                                });
                            }
                        }
                    }
                });

                k.onCollide("playerBullet", "enemy", (bullet, enemy) => {
                    bullet.destroy();
                    enemy.destroy();

                    const idx = enemies.indexOf(enemy);
                    if (idx >= 0) enemies.splice(idx, 1);

                    score += 50;
                    updateScoreDisplay();

                    for (let i = 0; i < 6; i++) {
                        const angle = (i / 6) * 360;
                        const dir = k.vec2(Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180));
                        k.add([
                            k.rect(8, 12),
                            k.pos(enemy.pos),
                            k.move(dir.scale(k.rand(80, 150) * gameSpeed)),
                            k.color(255, 150, 50),
                            k.opacity(1),
                            k.lifespan(0.4 / gameSpeed),
                            k.anchor("center"),
                        ]);
                    }

                    k.shake(7);

                    k.wait(300 / gameSpeed).then(() => {
                        createEnemiesInValidPositions(2);
                    });
                });


                k.onCollide("playerBullet", "wall", (bullet, wall) => {
                    bullet.destroy();

                    for (let i = 0; i < 5; i++) {
                        k.add([
                            k.circle(2),
                            k.pos(bullet.pos),
                            k.move(k.vec2(k.rand(-1, 1), k.rand(-1, 1)).scale(k.rand(60, 120) * gameSpeed)),
                            k.color(100, 255, 150),
                            k.opacity(1),
                            k.lifespan(0.3 / gameSpeed),
                            k.anchor("center"),
                        ]);
                    }
                });


                player.onCollide("bullet", (bullet) => {
                    playerHP -= 10;

                    updateHealthDisplay();

                    bullet.destroy();

                    k.shake(5);

                    player.color = k.Color.fromArray([255, 100, 100]);
                    k.wait(0.1).then(() => {
                        if (player.exists()) {
                            player.color = k.Color.fromArray([50, 200, 100]);
                        }
                    });

                    if (playerHP <= 0) {
                        joystickActive = false;
                        joystickDir = k.vec2(0, 0);
                        currentSpeed = 0;

                        player.destroy();
                        for (let i = 0; i < 12; i++) {
                            const angle = (i / 12) * 360;
                            const dir = k.vec2(Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180));
                            k.add([
                                k.rect(10, 10),
                                k.pos(player.pos),
                                k.move(dir.scale(k.rand(3, 7) * gameSpeed)),
                                k.color(255, 50, 50),
                                k.opacity(1),
                                k.lifespan(0.8 / gameSpeed),
                                k.anchor("center"),
                            ]);
                        }
                        k.shake(7);
                        GameResultScore();
                    }
                });


                k.onCollide("bullet", "wall", (bullet, wall) => {
                    bullet.destroy();

                    for (let i = 0; i < 5; i++) {
                        k.add([
                            k.circle(3),
                            k.pos(bullet.pos),
                            k.move(k.vec2(k.rand(-1, 1), k.rand(-1, 1)).scale(k.rand(50, 100) * gameSpeed)),
                            k.color(150, 150, 255),
                            k.opacity(1),
                            k.lifespan(0.3 / gameSpeed),
                            k.anchor("center"),
                        ]);
                    }
                });
            }
            catch (error) {
                console.error('Failed to initialize game:', error);
                initializedRef.current = false;
                kInstanceRef.current = null;
            }
        };

        if (user) initGame();

        return () => {
            console.log('Cleaning up game...');
            if (kInstanceRef.current) {
                try {
                    kInstanceRef.current.destroyAll();
                    kInstanceRef.current.destroy();
                } catch (error) {
                    console.warn('Error during game cleanup:', error);
                }
                kInstanceRef.current = null;
            }
            initializedRef.current = false;

            document.body.style.margin = '';
            document.body.style.padding = '';
            document.body.style.overflow = '';
            document.documentElement.style.margin = '';
            document.documentElement.style.padding = '';
            document.documentElement.style.overflow = '';
        };
    }, []);
    const getHpColor = (hp, maxHp) => {
        const percentage = hp / maxHp;
        if (hp < 50) {
            if (percentage >= 0.5) {
                const red = Math.floor(255 * ((percentage - 0.5) * 2));
                const green = 160;
                return `rgb(${red}, ${green}, 0)`;
            } else {
                const red = 160;
                const green = Math.floor(255 * (percentage * 2));
                return `rgb(${red}, ${green}, 0)`;
            }
        } else return `rgb(0, 160, 0)`
    };

    return (
        <div className='relative w-full h-[100dvh]'>
            <div className="absolute top-0 left-0 w-full z-50 pointer-events-none">
                <div className="w-full bg-black bg-opacity-20 py-4 px-6">
                    <div className='flex justify-between w-full gap-2'>
                        <div className="flex flex-col items-center w-fit">
                            <div className="text-sm text-white mb-1">SCORE</div>
                            <div className="text-2xl font-bold text-yellow-300 text-shadow">
                                {gameInfo.score}
                            </div>
                        </div>
                        <div className="flex flex-col items-center w-full">
                            <div className="text-sm text-white">HP</div>
                            <div className="w-[100%] h-6 bg-gray-900 border-2 relative">
                                <div
                                    className={`h-full transition-all duration-300`}
                                    style={{
                                        width: `${(gameInfo.hp / gameInfo.maxHp) * 100}%`, backgroundColor: getHpColor(gameInfo.hp, gameInfo.maxHp)
                                    }}
                                ></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">
                                        {gameInfo.hp}/{gameInfo.maxHp}
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>
                    <div className="flex flex-col items-center w-full">
                        <div className="text-xs text-white mb-1">AMMO</div>
                        <div className="flex justify-center space-x-1 w-full">
                            {Array.from({ length: gameInfo.maxAmmo }).map((_, index) => (
                                <div
                                    key={index}
                                    className={`w-4 h-2 border ${index < gameInfo.ammo ? 'bg-red-500 border-red-300' : 'bg-gray-800 border-gray-600'}`}
                                >
                                    {index < gameInfo.ammo && (
                                        <div className="w-1 h-1 bg-red-300"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
            {gameInfo.hp <= 0 && (
                <div className="absolute inset-0 top-0 left-0 h-[100dvh] w-[100vw] flex items-center justify-center z-50">
                    <div className="bg-black bg-opacity-80 h-full w-full flex flex-col items-center justify-center">
                        <div className='flex flex-col items-center max-w-md'>
                            <h2 className="text-3xl font-bold text-red-500 text-center mb-4">ТОГЛООМ ДУУСЛАА</h2>
                            <div className="text-center mb-6">
                                <div className="text-sm text-yellow-300 mb-2">
                                    АВСАН ОНОО: {gameInfo.score}
                                </div>
                                <div className="text-sm text-green-400">
                                    ЗООС: +{gameInfo.totalCoinsEarned}
                                </div>
                            </div>
                            <button className='text-white border px-8 py-1 rounded-md' onClick={() => { router.push("/"); }}>ЦЕС</button>
                        </div>
                    </div>
                </div>
            )}

            <div
                ref={gameRef}
                style={{
                    width: '100vw',
                    height: '100dvh',
                    margin: 0,
                    padding: 0,
                    overflow: 'hidden',
                    backgroundColor: '#141432',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10
                }}
            />
        </div>
    );
}