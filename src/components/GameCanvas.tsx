import React, { useEffect, useRef, useState } from 'react';
import { Player, Enemy, Bullet, GameParticle, FloatingText, PlayerStats, WeaponType, EnemyType } from '../types';
import { playLaserSound, playExplosionSound, playScrapCollectSound, playDamageSound, playDashSound, playUpgradeSound } from '../utils/audio';

interface ScrapEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  value: number;
  rotation: number;
  rotationSpeed: number;
}

interface RepairKitEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  healAmount: number;
  rotation: number;
  rotationSpeed: number;
}

interface GameCanvasProps {
  gameActive: boolean;
  isPaused: boolean;
  stats: PlayerStats;
  setStats: React.Dispatch<React.SetStateAction<PlayerStats>>;
  activeWeapon: WeaponType;
  unlockedWeapons: WeaponType[];
  selectedColor: string;
  stage: number;
  wave: number;
  setWave: React.Dispatch<React.SetStateAction<number>>;
  waveInProgress: boolean;
  setWaveInProgress: (val: boolean) => void;
  onGameOver: () => void;
  onBossSpawn: () => void;
}

export default function GameCanvas({
  gameActive,
  isPaused,
  stats,
  setStats,
  activeWeapon,
  unlockedWeapons,
  selectedColor,
  stage,
  wave,
  setWave,
  waveInProgress,
  setWaveInProgress,
  onGameOver,
  onBossSpawn,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keyboard state
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  // Mouse target
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDown = useRef<boolean>(false);

  // Entities Ref
  const playerRef = useRef<Player>({
    x: 400,
    y: 300,
    radius: 22,
    angle: 0,
    hp: 100,
    maxHp: 100,
    shield: 50,
    maxShield: 50,
    shieldRegenTimer: 0,
    dashCooldown: 0,
    dashDuration: 0,
    dashVx: 0,
    dashVy: 0,
    color: selectedColor,
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const scrapsRef = useRef<ScrapEntity[]>([]);
  const repairKitsRef = useRef<RepairKitEntity[]>([]);
  const particlesRef = useRef<GameParticle[]>([]);
  const textsRef = useRef<FloatingText[]>([]);

  // Timers
  const shootCooldownRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const waveSpawnTimerRef = useRef<number>(0);
  const waveProgressRef = useRef<{ totalToSpawn: number; spawned: number; killed: number }>({
    totalToSpawn: 0,
    spawned: 0,
    killed: 0,
  });

  // UI state overlays shown locally
  const [playerHp, setPlayerHp] = useState({ hp: 100, maxHp: 100 });
  const [playerShield, setPlayerShield] = useState({ shield: 50, maxShield: 50 });
  const [dashCdRatio, setDashCdRatio] = useState(0);

  // Color mappings
  const colorMap: { [key: string]: string } = {
    blue: '#00f0ff',
    red: '#ff2a5f',
    emerald: '#05ff8a',
    gold: '#ffb700',
    purple: '#b100ff',
  };

  const getThemeColor = () => colorMap[selectedColor] || '#00f0ff';

  // Initialize/Reset Game variables when game active goes from false to true
  useEffect(() => {
    if (gameActive) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.width;
      const h = canvas.height;

      // Reset Player
      playerRef.current = {
        x: w / 2,
        y: h / 2,
        radius: 22,
        angle: 0,
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        shield: stats.maxShield,
        maxShield: stats.maxShield,
        shieldRegenTimer: 0,
        dashCooldown: 0,
        dashDuration: 0,
        dashVx: 0,
        dashVy: 0,
        color: selectedColor,
      };

      setPlayerHp({ hp: stats.maxHp, maxHp: stats.maxHp });
      setPlayerShield({ shield: stats.maxShield, maxShield: stats.maxShield });

      // Clear other entities
      enemiesRef.current = [];
      bulletsRef.current = [];
      scrapsRef.current = [];
      repairKitsRef.current = [];
      particlesRef.current = [];
      textsRef.current = [];

      // Reset Wave
      setWave(1);
      setWaveInProgress(false);
      waveProgressRef.current = { totalToSpawn: 0, spawned: 0, killed: 0 };
    }
  }, [gameActive]);

  // Adjust canvas size to container dynamically
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Handle Input Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling on arrows/space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed.current[e.key.toLowerCase()] = true;

      // Dash input (Shift or 'e')
      if ((e.key === 'Shift' || e.key.toLowerCase() === 'e') && playerRef.current.dashCooldown <= 0) {
        triggerDash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseDown = () => {
      isMouseDown.current = true;
    };

    const handleMouseUp = () => {
      isMouseDown.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Support touch devices (tap screen/joystick drag to move or aim)
    const handleTouchMove = (e: TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      mousePos.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
      isMouseDown.current = true;
    };

    const handleTouchEnd = () => {
      isMouseDown.current = false;
    };

    canvasRef.current?.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvasRef.current?.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvasRef.current?.removeEventListener('touchmove', handleTouchMove);
      canvasRef.current?.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Sync Stats Updates (HP, Shield, etc.)
  useEffect(() => {
    if (gameActive) {
      const p = playerRef.current;
      p.maxHp = stats.maxHp;
      p.maxShield = stats.maxShield;
      // Bring HP up proportionally if max upgrade is bought
      if (p.hp > p.maxHp) p.hp = p.maxHp;
      if (p.shield > p.maxShield) p.shield = p.maxShield;

      setPlayerHp({ hp: p.hp, maxHp: p.maxHp });
      setPlayerShield({ shield: p.shield, maxShield: p.maxShield });
    }
  }, [stats.maxHp, stats.maxShield]);

  // Spark Generator helper
  const collectSpark = (x: number, y: number, color: string, count = 10, speedFactor = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 3 + 1) * speedFactor;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 1.5,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.015,
        life: 1,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#ffffff', size = 16) => {
    textsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      size,
      life: 1,
      maxLife: 45, // frames
    });
  };

  // Dash Activation action
  const triggerDash = () => {
    const p = playerRef.current;
    // Calculate movement vector
    let dx = 0;
    let dy = 0;
    if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;

    // Default to mecha face angle if stationary
    if (dx === 0 && dy === 0) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
    } else {
      // Normalize
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    const dashSpeed = 16;
    p.dashVx = dx * dashSpeed;
    p.dashVy = dy * dashSpeed;
    p.dashDuration = 10; // frames
    p.dashCooldown = 150; // frames (~2.5s)
    
    playDashSound();

    // Spawn massive beautiful cyan flame trail
    collectSpark(p.x, p.y, '#00f6ff', 25, 2);
    addFloatingText(p.x, p.y - 30, 'DASH!', '#00f0ff', 18);
  };

  // Weapon Firing Mechanism
  const fireActiveWeapon = () => {
    const p = playerRef.current;
    if (shootCooldownRef.current > 0) return;

    // Base properties
    const activeDmg = stats.bulletDamage;
    const bulletSpeed = 11;
    const angleToTarget = p.angle;

    // Fire sound
    playLaserSound(activeWeapon);

    // Calc tip of mecha cannons (offset from center)
    const rightGunX = p.x + Math.cos(angleToTarget + 0.4) * p.radius;
    const rightGunY = p.y + Math.sin(angleToTarget + 0.4) * p.radius;
    const leftGunX = p.x + Math.cos(angleToTarget - 0.4) * p.radius;
    const leftGunY = p.y + Math.sin(angleToTarget - 0.4) * p.radius;

    switch (activeWeapon) {
      case 'SPREAD': {
        // Fires 3 bullets in a spread: -0.2, 0, +0.2 radian offset
        const angles = [angleToTarget - 0.25, angleToTarget, angleToTarget + 0.25];
        angles.forEach((ang) => {
          bulletsRef.current.push({
            x: p.x + Math.cos(ang) * p.radius,
            y: p.y + Math.sin(ang) * p.radius,
            vx: Math.cos(ang) * bulletSpeed,
            vy: Math.sin(ang) * bulletSpeed,
            radius: 5,
            damage: Math.round(activeDmg * 0.85),
            color: '#ffdd00',
            isPlayer: true,
            type: 'SPREAD',
            life: 60,
          });
        });
        shootCooldownRef.current = Math.max(7, 18 - stats.fireRateLevel * 2.5);
        break;
      }
      case 'PLASMA': {
        // High density plasma ball - slow but piercing, larger hit block
        bulletsRef.current.push({
          x: p.x + Math.cos(angleToTarget) * p.radius,
          y: p.y + Math.sin(angleToTarget) * p.radius,
          vx: Math.cos(angleToTarget) * (bulletSpeed * 0.7),
          vy: Math.sin(angleToTarget) * (bulletSpeed * 0.7),
          radius: 11,
          damage: Math.round(activeDmg * 2.3),
          color: '#ff00ff',
          isPlayer: true,
          type: 'PLASMA',
          life: 80,
        });
        shootCooldownRef.current = Math.max(14, 32 - stats.fireRateLevel * 3.5);
        break;
      }
      case 'ROCKET': {
        // Heavy rocket missile tracking or blasting
        bulletsRef.current.push({
          x: p.x + Math.cos(angleToTarget) * p.radius,
          y: p.y + Math.sin(angleToTarget) * p.radius,
          vx: Math.cos(angleToTarget) * (bulletSpeed * 0.85),
          vy: Math.sin(angleToTarget) * (bulletSpeed * 0.85),
          radius: 7,
          damage: Math.round(activeDmg * 1.8),
          color: '#ff5e00',
          isPlayer: true,
          type: 'ROCKET',
          life: 90,
        });
        shootCooldownRef.current = Math.max(16, 38 - stats.fireRateLevel * 4);
        break;
      }
      case 'PULSE':
      default: {
        // Alternating gun fire - dual canons!
        const flag = Math.random() > 0.5;
        bulletsRef.current.push({
          x: flag ? rightGunX : leftGunX,
          y: flag ? rightGunY : leftGunY,
          vx: Math.cos(angleToTarget) * bulletSpeed,
          vy: Math.sin(angleToTarget) * bulletSpeed,
          radius: 4,
          damage: activeDmg,
          color: getThemeColor(),
          isPlayer: true,
          type: 'PULSE',
          life: 50,
        });
        // Scale shot rate level - faster with each upgrade level
        shootCooldownRef.current = Math.max(4, 10 - stats.fireRateLevel * 1.5);
        break;
      }
    }
  };

  // Rocket Detonation Blast Routine
  const detonateRocket = (bx: number, by: number, dmg: number) => {
    // Blast radius simulation
    playExplosionSound('medium');
    collectSpark(bx, by, '#ff6e00', 30, 1.8);
    collectSpark(bx, by, '#ffd000', 15, 1.0);

    // Apply radial splash
    const splashRadius = 110;
    enemiesRef.current.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - bx, enemy.y - by);
      if (dist <= splashRadius) {
        // Damage falls off linearly
        const falloff = 1 - dist / splashRadius;
        const finalSplashDmg = Math.round(dmg * falloff);
        if (finalSplashDmg > 0) {
          enemy.hp -= finalSplashDmg;
          addFloatingText(enemy.x, enemy.y - 15, `-${finalSplashDmg}`, '#ffa200', 14);
        }
      }
    });
  };

  // Wave Management Engine
  const startNextWave = () => {
    const nextWave = wave + 1;
    setWave(nextWave);
    setWaveInProgress(true);

    const isBossWave = nextWave % 5 === 0;
    // Stage-based enemy scaling (more enemies for higher stages)
    const baseEnemies = 8 + nextWave * 4 + (stage - 1) * 5;
    const totalCount = isBossWave ? baseEnemies + 1 : baseEnemies;

    waveProgressRef.current = {
      totalToSpawn: totalCount,
      spawned: 0,
      killed: 0,
    };

    waveSpawnTimerRef.current = 100; // Trigger spawn quickly
    addFloatingText(
      (canvasRef.current?.width || 800) / 2,
      (canvasRef.current?.height || 600) / 2 - 80,
      isBossWave ? `ボスウェーブ ${nextWave} 開始！` : `ウェーブ ${nextWave} 侵入検知！`,
      isBossWave ? '#ff145a' : '#00f6ff',
      24
    );

    if (isBossWave) {
      onBossSpawn();
    }
  };

  // Spawn enemy helper
  const spawnEnemy = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const progress = waveProgressRef.current;

    // Check bounds or if done spawning
    if (progress.spawned >= progress.totalToSpawn) return;

    // Decide types based on wave
    const isBossWave = wave % 5 === 0;
    const wantsSpawnBoss = isBossWave && progress.spawned === progress.totalToSpawn - 1;

    let type: EnemyType = 'SCOUT';
    let hp = Math.round((15 + wave * 4) * (1 + (stage - 1) * 0.22));
    let speed = 1.6 + Math.random() * 0.8 + (stage - 1) * 0.05;
    let radius = 15;
    let color = '#00ff41'; // Green Spider Drone
    let scoreVal = 50 + wave * 10;
    let damageValue = Math.round((10 + wave * 2) * (1 + (stage - 1) * 0.35));

    if (wantsSpawnBoss) {
      type = 'BOSS';
      hp = Math.round((450 + wave * 120) * (1 + (stage - 1) * 0.28));
      speed = 0.9 + (stage - 1) * 0.05;
      radius = 45;
      color = '#ff1d5a';
      scoreVal = 1500 + (stage - 1) * 500;
      damageValue = Math.round(30 * (1 + (stage - 1) * 0.45));
    } else {
      // General drone weight randomness and Stage constraints
      const rand = Math.random() * 100;
      
      const canSpawnSpeeder = stage >= 2;
      const canSpawnAssault = stage >= 3;
      const canSpawnTank = stage >= 4;

      if (canSpawnTank && rand < 22) {
        // Heavy cyan blockfort tank
        type = 'TANK';
        hp = Math.round((80 + wave * 12) * (1 + (stage - 1) * 0.22));
        speed = 0.8 + (stage - 1) * 0.04;
        radius = 26;
        color = '#00d2ff';
        scoreVal = 250;
        damageValue = Math.round(20 * (1 + (stage - 1) * 0.35));
      } else if (canSpawnAssault && rand >= 22 && rand < 48) {
        // Purple assault gunner
        type = 'ASSAULT';
        hp = Math.round((30 + wave * 5) * (1 + (stage - 1) * 0.22));
        speed = 1.3 + (stage - 1) * 0.04;
        radius = 18;
        color = '#b100ff';
        scoreVal = 120;
        damageValue = Math.round(15 * (1 + (stage - 1) * 0.35));
      } else if (canSpawnSpeeder && rand >= 48 && rand < 72) {
        // Orange kamikaze bot
        type = 'SPEEDER';
        hp = Math.round((10 + wave * 2) * (1 + (stage - 1) * 0.22));
        speed = 3.6 + (stage - 1) * 0.08;
        radius = 12;
        color = '#ffa600';
        scoreVal = 80;
        damageValue = Math.round(12 * (1 + (stage - 1) * 0.35));
      } else {
        // Default green drone
        type = 'SCOUT';
        hp = Math.round((15 + wave * 4) * (1 + (stage - 1) * 0.22));
        speed = 1.6 + Math.random() * 0.8 + (stage - 1) * 0.04;
        radius = 15;
        color = '#00ff41';
        scoreVal = 50 + wave * 10;
        damageValue = Math.round((10 + wave * 2) * (1 + (stage - 1) * 0.35));
      }
    }

    // Spawn completely offscreen along boundary perimeter
    let x = 0;
    let y = 0;
    const side = Math.floor(Math.random() * 4);
    const borderPadding = 40;

    switch (side) {
      case 0: // top
        x = Math.random() * w;
        y = -borderPadding;
        break;
      case 1: // right
        x = w + borderPadding;
        y = Math.random() * h;
        break;
      case 2: // bottom
        x = Math.random() * w;
        y = h + borderPadding;
        break;
      case 3: // left
      default:
        x = -borderPadding;
        y = Math.random() * h;
        break;
    }

    enemiesRef.current.push({
      id: Math.random().toString(),
      type,
      x,
      y,
      radius,
      hp,
      maxHp: hp,
      speed,
      color,
      scoreValue: scoreVal,
      damage: damageValue,
      shootCooldown: Math.random() * 80 + 30,
      angle: 0,
      isBoss: wantsSpawnBoss,
      bossPhase: wantsSpawnBoss ? 1 : undefined,
      phaseTimer: wantsSpawnBoss ? 0 : undefined,
    });

    progress.spawned += 1;
  };

  // Main Loop Game Update & Draw Framework
  useEffect(() => {
    let animId: number;

    const gameLoop = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !gameActive) return;

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Skip updates if paused
      if (!isPaused) {
        updateGameObjects();
      }

      drawGameObjects(timestamp);

      animId = requestAnimationFrame(gameLoop);
    };

    // Game updates handler
    const updateGameObjects = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.width;
      const h = canvas.height;

      const p = playerRef.current;

      // 1. Dash mechanics & positions
      if (p.dashCooldown > 0) p.dashCooldown -= 1;
      setDashCdRatio(p.dashCooldown / 150);

      let isDashing = p.dashDuration > 0;
      const activeSpeed = isDashing ? 1 : (3.2 + stats.moveSpeedLevel * 0.45);

      if (isDashing) {
        p.x += p.dashVx;
        p.y += p.dashVy;
        p.dashDuration -= 1;

        // Spawn a lovely digital particle shadow
        particlesRef.current.push({
          x: p.x,
          y: p.y,
          vx: -p.dashVx * 0.15 + (Math.random() * 0.6 - 0.3),
          vy: -p.dashVy * 0.15 + (Math.random() * 0.6 - 0.3),
          radius: p.radius * 0.7,
          color: getThemeColor(),
          alpha: 0.35,
          decay: 0.05,
          life: 1,
        });
      } else {
        // Standard WASD / Arrows controls
        let dx = 0;
        let dy = 0;
        if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
        if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
        if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;

        if (dx !== 0 && dy !== 0) {
          // Normalize vector to avoid running 40% faster on diagonals
          const len = Math.hypot(dx, dy);
          dx /= len;
          dy /= len;
        }

        p.x += dx * activeSpeed;
        p.y += dy * activeSpeed;
      }

      // Keep Player perfectly inside boundaries with friction bouncing
      p.x = Math.max(p.radius, Math.min(w - p.radius, p.x));
      p.y = Math.max(p.radius, Math.min(h - p.radius, p.y));

      // 2. Rotate Player toward nearest Enemy (Auto-aim) or Mouse Cursor
      let targetX = mousePos.current.x;
      let targetY = mousePos.current.y;

      if (enemiesRef.current.length > 0) {
        let nearestEnemy: Enemy | null = null;
        let minDistance = Infinity;

        enemiesRef.current.forEach((enemy) => {
          const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
          if (dist < minDistance) {
            minDistance = dist;
            nearestEnemy = enemy;
          }
        });

        if (nearestEnemy) {
          targetX = (nearestEnemy as Enemy).x;
          targetY = (nearestEnemy as Enemy).y;
        }
      }

      const deltaX = targetX - p.x;
      const deltaY = targetY - p.y;
      p.angle = Math.atan2(deltaY, deltaX);

      // Handle continuous firing when mouse holds down screen or space is pressed
      if (shootCooldownRef.current > 0) shootCooldownRef.current -= 1;
      if (isMouseDown.current || keysPressed.current[' '] || keysPressed.current['space']) {
        fireActiveWeapon();
      }

      // Shield regeneration timer handler
      if (p.shieldRegenTimer > 0) {
        p.shieldRegenTimer -= 1;
      } else if (p.shield < p.maxShield) {
        // Regenerate shield slowly over time
        p.shield = Math.min(p.maxShield, p.shield + 0.15);
        setPlayerShield({ shield: Math.round(p.shield), maxShield: p.maxShield });
      }

      // 3. Update & Spawn Waves
      if (!waveInProgress) {
        // Wait briefly after all clear to start wave automatic triggers
        startNextWave();
      } else {
        const progress = waveProgressRef.current;
        // Interval spawns
        if (progress.spawned < progress.totalToSpawn) {
          if (waveSpawnTimerRef.current > 0) {
            waveSpawnTimerRef.current -= 1;
          } else {
            spawnEnemy();
            // Scale spawning delay - gets tighter/faster high waves
            waveSpawnTimerRef.current = Math.max(18, 90 - wave * 4);
          }
        } else if (enemiesRef.current.length === 0 && progress.killed >= progress.totalToSpawn) {
          // Wave Cleared! Give scrap bonuses
          const bonusScraps = 25 + wave * 10;
          setStats((prev) => ({
            ...prev,
            scraps: prev.scraps + bonusScraps,
            score: prev.score + wave * 300,
          }));

          addFloatingText(w / 2, h / 2 - 30, `ウェーブクリア！ +${bonusScraps} コア屑`, '#05ff8a', 20);
          playUpgradeSound();
          setWaveInProgress(false);
        }
      }

      // 4. Update Enemies
      enemiesRef.current.forEach((enemy) => {
        // Calculate vector to player
        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        // Turn enemy head towards target
        enemy.angle = Math.atan2(dy, dx);

        if (enemy.isBoss) {
          // Special Boss fighting AI logic
          enemy.phaseTimer = (enemy.phaseTimer || 0) + 1;
          if (enemy.phaseTimer > 150) {
            // Cycle boss phases
            enemy.bossPhase = (enemy.bossPhase === 1) ? 2 : 1;
            enemy.phaseTimer = 0;
            const phrase = enemy.bossPhase === 1 ? 'オーバードライブ噴射！' : '全周囲一斉掃射！';
            addFloatingText(enemy.x, enemy.y - 50, phrase, '#ff1a1a', 14);
          }

          if (enemy.bossPhase === 1) {
            // Rapid charge phase
            enemy.x += Math.cos(enemy.angle) * (enemy.speed * 1.5);
            enemy.y += Math.sin(enemy.angle) * (enemy.speed * 1.5);
          } else {
            // Slow orbit firing pattern
            enemy.x += Math.cos(enemy.angle + Math.PI / 2) * enemy.speed;
            enemy.y += Math.sin(enemy.angle + Math.PI / 2) * enemy.speed;
          }

          // Boss fire weapons
          if (enemy.shootCooldown > 0) enemy.shootCooldown -= 1;
          if (enemy.shootCooldown <= 0) {
            if (enemy.bossPhase === 2) {
              // Radial bullet spray: 8-spoke pattern
              const spokes = 8;
              playLaserSound('ENEMY');
              for (let i = 0; i < spokes; i++) {
                const angle = (i * Math.PI * 2) / spokes;
                bulletsRef.current.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: Math.cos(angle) * 3.5,
                  vy: Math.sin(angle) * 3.5,
                  radius: 5.5,
                  damage: enemy.damage,
                  color: '#ff2d2d',
                  isPlayer: false,
                  type: 'ENEMY',
                  life: 150,
                });
              }
            } else {
              // Aimed heavy pulse bursts: 3 bullets burst
              playLaserSound('ENEMY');
              const baseAngle = enemy.angle;
              [-0.15, 0, 0.15].forEach((offset) => {
                const ang = baseAngle + offset;
                bulletsRef.current.push({
                  x: enemy.x + Math.cos(ang) * enemy.radius,
                  y: enemy.y + Math.sin(ang) * enemy.radius,
                  vx: Math.cos(ang) * 5.5,
                  vy: Math.sin(ang) * 5.5,
                  radius: 6.5,
                  damage: enemy.damage,
                  color: '#ffdd00',
                  isPlayer: false,
                  type: 'ENEMY',
                  life: 120,
                });
              });
            }
            enemy.shootCooldown = 65; // Reset cooldown
          }
        } else {
          // Standard enemy AI logic
          // Steer towards target
          enemy.x += Math.cos(enemy.angle) * enemy.speed;
          enemy.y += Math.sin(enemy.angle) * enemy.speed;

          // CSS Ranged shooter ASSAULT intelligence
          if (enemy.type === 'ASSAULT') {
            if (enemy.shootCooldown > 0) enemy.shootCooldown -= 1;
            // Backoff if too close to player to maintain ideal firing distance!
            if (dist < 180) {
              enemy.x -= Math.cos(enemy.angle) * (enemy.speed * 1.5);
              enemy.y -= Math.sin(enemy.angle) * (enemy.speed * 1.5);
            }

            if (enemy.shootCooldown <= 0) {
              playLaserSound('ENEMY');
              bulletsRef.current.push({
                x: enemy.x + Math.cos(enemy.angle) * enemy.radius,
                y: enemy.y + Math.sin(enemy.angle) * enemy.radius,
                vx: Math.cos(enemy.angle) * 5.5,
                vy: Math.sin(enemy.angle) * 5.5,
                radius: 4.5,
                damage: enemy.damage,
                color: '#b100ff',
                isPlayer: false,
                type: 'ENEMY',
                life: 110,
              });
              enemy.shootCooldown = 90 + Math.random() * 40;
            }
          }
        }

        // Steer enemies slightly apart to prevent clipping clumps
        enemiesRef.current.forEach((other) => {
          if (enemy.id === other.id) return;
          const otherDist = Math.hypot(other.x - enemy.x, other.y - enemy.y);
          if (otherDist < enemy.radius + other.radius) {
            const pushAngle = Math.atan2(enemy.y - other.y, enemy.x - other.x);
            // Gently nudge
            enemy.x += Math.cos(pushAngle) * 0.45;
            enemy.y += Math.sin(pushAngle) * 0.45;
          }
        });

        // 5. Player Collides with Enemy Physically
        if (dist < p.radius + enemy.radius) {
          // Dashing makes player immune & damages enemy!
          if (isDashing) {
            enemy.hp -= Math.round(stats.bulletDamage * 3);
            addFloatingText(enemy.x, enemy.y - 12, `RAM! ${Math.round(stats.bulletDamage * 3)}`, '#00ffff', 15);
            collectSpark(enemy.x, enemy.y, '#00f6ff', 8);
          } else {
            // Apply impact crash damage to mecha
            damagePlayer(Math.round(enemy.damage * 0.5));
            // Bounce enemy back
            enemy.x -= Math.cos(enemy.angle) * 35;
            enemy.y -= Math.sin(enemy.angle) * 35;
          }
        }
      });

      // 6. Update Bullets
      bulletsRef.current.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 1;

        // Player bullet hitting enemies
        if (b.isPlayer) {
          enemiesRef.current.forEach((enemy) => {
            if (b.hitEnemyIds && b.hitEnemyIds.includes(enemy.id)) {
              return;
            }

            const dist = Math.hypot(enemy.x - b.x, enemy.y - b.y);
            if (dist < enemy.radius + b.radius) {
              if (b.type === 'PLASMA') {
                if (!b.hitEnemyIds) {
                  b.hitEnemyIds = [];
                }
                b.hitEnemyIds.push(enemy.id);

                enemy.hp -= b.damage;
                addFloatingText(enemy.x, enemy.y - 15, `-${b.damage}`, '#cca3ff', 14);
                collectSpark(b.x, b.y, b.color, 5);
              } else if (b.type === 'ROCKET') {
                b.life = 0; // Destroy bullet
                // Rocket explodes on impact, applying radial splash
                detonateRocket(b.x, b.y, b.damage);
              } else {
                b.life = 0; // Destroy bullet
                enemy.hp -= b.damage;
                addFloatingText(enemy.x, enemy.y - 15, `-${b.damage}`, '#ffea00', 13);
                collectSpark(b.x, b.y, b.color, 4);
              }
            }
          });
        } else {
          // Enemy bullet hitting Player mecha
          const dist = Math.hypot(p.x - b.x, p.y - b.y);
          if (dist < p.radius + b.radius) {
            b.life = 0; // Destroy bullet
            damagePlayer(b.damage);
            collectSpark(p.x, p.y, '#ff4747', 6);
          }
        }
      });

      // Filter dead/completed bullets
      bulletsRef.current = bulletsRef.current.filter((b) => b.life > 0);

      // Resolve defeated enemies spawning alloy scraps and sparks
      enemiesRef.current.forEach((enemy) => {
        if (enemy.hp <= 0) {
          playExplosionSound(enemy.isBoss ? 'boss' : enemy.radius > 20 ? 'large' : 'medium');
          collectSpark(enemy.x, enemy.y, enemy.color, enemy.isBoss ? 45 : 12, enemy.isBoss ? 1.6 : 1);

          // Earn scrap
          const scrapAmount = enemy.isBoss ? 5 : 1;
          const scrapColor = enemy.isBoss ? '#ffd700' : '#05ff8a'; // Golden / emerald alloy sparks

          for (let i = 0; i < scrapAmount; i++) {
            const scrapOffsetAng = Math.random() * Math.PI * 2;
            const scrapFlingSpeed = Math.random() * 3.5 + 1;
            scrapsRef.current.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(scrapOffsetAng) * scrapFlingSpeed,
              vy: Math.sin(scrapOffsetAng) * scrapFlingSpeed,
              radius: enemy.isBoss ? 8 : 5,
              value: enemy.isBoss ? 20 : 5,
              rotation: Math.random() * Math.PI,
              rotationSpeed: Math.random() * 0.1 - 0.05,
            });
          }

          // Armor Repair Kit Drop Logic
          const roll = Math.random();
          const shouldDropRepair = enemy.isBoss ? true : roll < 0.20;
          if (shouldDropRepair) {
            const repairSpawnCount = enemy.isBoss ? 2 : 1;
            for (let i = 0; i < repairSpawnCount; i++) {
              const rOffsetAng = Math.random() * Math.PI * 2;
              const rFlingSpeed = Math.random() * 2.5 + 1;
              repairKitsRef.current.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(rOffsetAng) * rFlingSpeed,
                vy: Math.sin(rOffsetAng) * rFlingSpeed,
                radius: enemy.isBoss ? 8 : 6,
                healAmount: enemy.isBoss ? 40 : 15,
                rotation: Math.random() * Math.PI,
                rotationSpeed: Math.random() * 0.08 - 0.04,
              });
            }
          }

          // Register kill
          setStats((prev) => {
            const newScore = prev.score + enemy.scoreValue;
            const newHighScore = Math.max(prev.highScore, newScore);
            return {
              ...prev,
              kills: prev.kills + 1,
              score: newScore,
              highScore: newHighScore,
            };
          });

          // Wave progress increment
          waveProgressRef.current.killed += 1;
        }
      });
      // Filter out dead enemies
      enemiesRef.current = enemiesRef.current.filter((enemy) => enemy.hp > 0);

      // 7. Update Scraps (Alloy Debris Collection + Magnetism!)
      scrapsRef.current.forEach((scRef) => {
        // Linear velocity drag deceleration
        scRef.vx *= 0.96;
        scRef.vy *= 0.96;
        scRef.x += scRef.vx;
        scRef.y += scRef.vy;
        scRef.rotation += scRef.rotationSpeed;

        // Magnet attraction vector
        const dx = p.x - scRef.x;
        const dy = p.y - scRef.y;
        const dist = Math.hypot(dx, dy);

        // Magnet pulling mecha upgrade: range increases on score / waves
        const magnetRange = 140 + wave * 5;
        if (dist <= magnetRange) {
          const pullIntensity = (1 - dist / magnetRange) * 1.5;
          scRef.x += (dx / dist) * pullIntensity * 6;
          scRef.y += (dy / dist) * pullIntensity * 6;
        }

        // Physical picker overlap
        if (dist <= p.radius + scRef.radius) {
          // Play chiptune collect noise
          playScrapCollectSound();
          collectSpark(scRef.x, scRef.y, '#05ff8a', 5, 0.6);

          setStats((prev) => ({
            ...prev,
            scraps: prev.scraps + scRef.value,
          }));

          addFloatingText(scRef.x, scRef.y - 10, `+${scRef.value} 屑`, '#05ff8a', 13);
          // Mark collectable index to erase
          scRef.value = 0;
        }
      });
      // Filter collected scraps
      scrapsRef.current = scrapsRef.current.filter((scRef) => scRef.value > 0);

      // 7.2 Update Repair Kits (Armor Caps Attraction & Repair!)
      repairKitsRef.current.forEach((rep) => {
        // Drag deceleration
        rep.vx *= 0.96;
        rep.vy *= 0.96;
        rep.x += rep.vx;
        rep.y += rep.vy;
        rep.rotation += rep.rotationSpeed;

        // Magnet attraction vector
        const dx = p.x - rep.x;
        const dy = p.y - rep.y;
        const dist = Math.hypot(dx, dy);

        const magnetRange = 140 + wave * 5;
        if (dist <= magnetRange) {
          const pullIntensity = (1 - dist / magnetRange) * 1.5;
          rep.x += (dx / dist) * pullIntensity * 6.5;
          rep.y += (dy / dist) * pullIntensity * 6.5;
        }

        // Overlap target
        if (dist <= p.radius + rep.radius) {
          // Play upgrade/collect sound
          playUpgradeSound();
          collectSpark(rep.x, rep.y, '#00ff66', 15, 1.2);

          // Restore HP (up to max HP)
          const oldHp = p.hp;
          p.hp = Math.min(p.maxHp, p.hp + rep.healAmount);
          const actualHealed = p.hp - oldHp;

          setPlayerHp({ hp: p.hp, maxHp: p.maxHp });
          
          if (actualHealed > 0) {
            addFloatingText(rep.x, rep.y - 12, `ARMOR +${actualHealed}`, '#00ff66', 14);
          } else {
            addFloatingText(rep.x, rep.y - 12, 'ARMOR FULL', '#00ff66', 12);
          }

          // Mark collected
          rep.healAmount = 0;
        }
      });
      // Filter collected repair kits
      repairKitsRef.current = repairKitsRef.current.filter((rep) => rep.healAmount > 0);

      // 8. Update Particles
      particlesRef.current.forEach((part) => {
        part.x += part.vx;
        part.y += part.vy;
        part.alpha -= part.decay;
      });
      particlesRef.current = particlesRef.current.filter((part) => part.alpha > 0);

      // 9. Update Floating Damage/Bonus Texts
      textsRef.current.forEach((text) => {
        text.y -= 0.6; // slide upwards
        text.life += 1;
      });
      textsRef.current = textsRef.current.filter((text) => text.life < text.maxLife);
    };

    // Apply Damage to Player helper
    const damagePlayer = (dmg: number) => {
      const p = playerRef.current;
      if (p.hp <= 0) return;

      playDamageSound();
      p.shieldRegenTimer = 180; // Delay shield regeneration for 3s under fire

      if (p.shield > 0) {
        p.shield -= dmg;
        if (p.shield < 0) {
          // Overflow damage to hp
          p.hp += p.shield;
          p.shield = 0;
        }
      } else {
        p.hp -= dmg;
      }

      setPlayerHp({ hp: Math.max(0, p.hp), maxHp: p.maxHp });
      setPlayerShield({ shield: Math.round(p.shield), maxShield: p.maxShield });

      if (p.hp <= 0) {
        // Boom! Player exploded.
        p.hp = 0;
        playExplosionSound('boss');
        collectSpark(p.x, p.y, '#ff4600', 60, 2);
        onGameOver();
      }
    };

    // Game rendering routine
    const drawGameObjects = (timestamp: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const p = playerRef.current;

      // Draw background space grids with motion offset context
      ctx.fillStyle = '#060814';
      ctx.fillRect(0, 0, w, h);

      // Cyber tech grid patterns
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw active wave portal boundary animations (neon warning margins)
      if (waveInProgress) {
        ctx.strokeStyle = 'rgba(255, 42, 95, 0.08)';
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, w - 12, h - 12);
      }

      // Draw Alloy Scraps
      scrapsRef.current.forEach((scrap) => {
        ctx.save();
        ctx.translate(scrap.x, scrap.y);
        ctx.rotate(scrap.rotation);

        // draw gear or bolt scrap
        ctx.strokeStyle = '#05ff8a';
        ctx.fillStyle = 'rgba(5, 255, 138, 0.2)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        const pts = 5;
        const outerRad = scrap.radius;
        const innerRad = scrap.radius * 0.5;
        for (let i = 0; i < pts * 2; i++) {
          const r = i % 2 === 0 ? outerRad : innerRad;
          const a = (i * Math.PI) / pts;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Little center neon core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, scrap.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw Tech Armor Repair Kits
      repairKitsRef.current.forEach((rep) => {
        ctx.save();
        ctx.translate(rep.x, rep.y);
        ctx.rotate(rep.rotation);

        // Outer neon green shield ring with glowing shadows
        ctx.shadowBlur = rep.radius * 2;
        ctx.shadowColor = '#00ff66';
        ctx.strokeStyle = '#00ff66';
        ctx.fillStyle = 'rgba(0, 255, 102, 0.15)';
        ctx.lineWidth = 1.8;

        // Draw medicine capsule circle
        ctx.beginPath();
        ctx.arc(0, 0, rep.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw bright central Medical Plus "+" shape
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0; // disable shadow for clean sharp symbol
        const barW = rep.radius * 0.75;
        const barH = rep.radius * 0.25;

        // Horizontal bar
        ctx.fillRect(-barW / 2, -barH / 2, barW, barH);
        // Vertical bar
        ctx.fillRect(-barH / 2, -barW / 2, barH, barW);

        ctx.restore();
      });

      // Draw Bullets
      bulletsRef.current.forEach((b) => {
        ctx.save();
        ctx.translate(b.x, b.y);

        // Draw bullet core glow
        ctx.shadowBlur = b.radius * 1.5;
        ctx.shadowColor = b.color;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Bullet outer energy shell
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw Enemies
      enemiesRef.current.forEach((enemy) => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemy.angle);

        // Draw Enemy Body based on Type
        if (enemy.isBoss) {
          // Giant boss mecha overlord
          ctx.shadowBlur = 15;
          ctx.shadowColor = enemy.color;

          // Multi-legged structure
          ctx.strokeStyle = 'rgba(255, 20, 90, 0.5)';
          ctx.lineWidth = 4;
          for (let i = 0; i < 6; i++) {
            const legAng = (i * Math.PI) / 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(legAng) * 55, Math.sin(legAng) * 55);
            ctx.stroke();
          }

          // Central heavy body armor plates
          ctx.fillStyle = '#1c1b22';
          ctx.strokeStyle = enemy.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Core visor glow (overlord style)
          ctx.fillStyle = '#ff1111';
          ctx.fillRect(enemy.radius * 0.2, -8, 8, 16);

          // Top shell shield plates
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(-5, 0, enemy.radius * 0.7, 0.4, Math.PI * 2 - 0.4);
          ctx.stroke();

          // HP Bar for Boss locally on top
          ctx.restore();
          drawMiniHpBar(enemy.x, enemy.y - 65, enemy.hp, enemy.maxHp, enemy.radius * 2);
          return;
        }

        // Draw common type shapes
        ctx.shadowBlur = 6;
        ctx.shadowColor = enemy.color;

        if (enemy.type === 'ASSAULT') {
          // Assault Cannon Tank Spider
          ctx.fillStyle = '#211830';
          ctx.strokeStyle = enemy.color;
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(-10, -18);
          ctx.lineTo(20, 0);
          ctx.lineTo(-10, 18);
          ctx.lineTo(-20, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Twin rapid laser barrels
          ctx.fillStyle = '#1c1b22';
          ctx.fillRect(5, -12, 18, 5);
          ctx.fillRect(5, 7, 18, 5);
          ctx.fillStyle = enemy.color;
          ctx.fillRect(21, -11, 4, 3);
          ctx.fillRect(21, 8, 4, 3);
        } else if (enemy.type === 'TANK') {
          // Heavy Cyan Block Tank Fortress
          ctx.fillStyle = '#152430';
          ctx.strokeStyle = enemy.color;
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.rect(-22, -22, 44, 44);
          ctx.fill();
          ctx.stroke();

          // Protective rotating shielding wings
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0.2, Math.PI - 0.2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, Math.PI + 0.2, Math.PI * 2 - 0.2);
          ctx.stroke();
        } else if (enemy.type === 'SPEEDER') {
          // Kamikaze orange hazard tri-blade drone
          ctx.fillStyle = '#2b1b11';
          ctx.strokeStyle = enemy.color;
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(-15, -10);
          ctx.lineTo(18, 0);
          ctx.lineTo(-15, 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Tail thruster spark
          ctx.fillStyle = '#ff7700';
          ctx.beginPath();
          ctx.arc(-18, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Scout: Fast green insect crawler drone
          ctx.fillStyle = '#112211';
          ctx.strokeStyle = enemy.color;
          ctx.lineWidth = 1.8;

          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Insect antenna
          ctx.strokeStyle = enemy.color;
          ctx.beginPath();
          ctx.moveTo(8, -4);
          ctx.quadraticCurveTo(18, -12, 22, -14);
          ctx.moveTo(8, 4);
          ctx.quadraticCurveTo(18, 12, 22, 14);
          ctx.stroke();
        }

        ctx.restore();

        // Mini HP indicators on normal units when damaged
        if (enemy.hp < enemy.maxHp) {
          drawMiniHpBar(enemy.x, enemy.y - 25, enemy.hp, enemy.maxHp, enemy.radius * 1.5);
        }
      });

      // Draw cyber lock-on target UI indicator for nearest enemy
      if (enemiesRef.current.length > 0) {
        let nearestEnemy: Enemy | null = null;
        let minDistance = Infinity;

        enemiesRef.current.forEach((enemy) => {
          const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
          if (dist < minDistance) {
            minDistance = dist;
            nearestEnemy = enemy;
          }
        });

        if (nearestEnemy) {
          ctx.save();
          ctx.translate((nearestEnemy as Enemy).x, (nearestEnemy as Enemy).y);

          // Fast technical spin
          const rotAngle = (timestamp * 0.003) % (Math.PI * 2);
          ctx.rotate(rotAngle);

          // Red laser sight glow
          ctx.strokeStyle = '#ff145a';
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#ff145a';

          const boxSize = (nearestEnemy as Enemy).radius + 12;
          const bracketLen = 8;

          // Technical brackets
          ctx.beginPath();
          // Top-Left
          ctx.moveTo(-boxSize, -boxSize + bracketLen);
          ctx.lineTo(-boxSize, -boxSize);
          ctx.lineTo(-boxSize + bracketLen, -boxSize);
          // Top-Right
          ctx.moveTo(boxSize - bracketLen, -boxSize);
          ctx.lineTo(boxSize, -boxSize);
          ctx.lineTo(boxSize, -boxSize + bracketLen);
          // Bottom-Right
          ctx.moveTo(boxSize, boxSize - bracketLen);
          ctx.lineTo(boxSize, boxSize);
          ctx.lineTo(boxSize - bracketLen, boxSize);
          // Bottom-Left
          ctx.moveTo(-boxSize + bracketLen, boxSize);
          ctx.lineTo(-boxSize, boxSize);
          ctx.lineTo(-boxSize, boxSize - bracketLen);
          ctx.stroke();

          // Outer scanning dotted ring
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(0, 0, (nearestEnemy as Enemy).radius + 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]); // clear dash

          // Lock on tag text
          ctx.fillStyle = '#ff145a';
          ctx.font = 'bold 9px "JetBrains Mono", sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowBlur = 0;
          ctx.fillText('• LOCK ON •', 0, -boxSize - 5);

          ctx.restore();
        }
      }

      // Draw Player Robot (Mecha-01)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Mecha color configurations
      const mechaNeon = getThemeColor();
      const mechaMetal = '#1f2535';
      const mechaHighlight = '#3f4b66';

      // 1. Draw thruster combustion fire based on keyboard commands
      const keys = keysPressed.current;
      const isMoving =
        keys['w'] || keys['arrowup'] || keys['s'] || keys['arrowdown'] ||
        keys['a'] || keys['arrowleft'] || keys['d'] || keys['arrowright'];

      if (isMoving || p.dashDuration > 0) {
        // Spawn active trail sparks back into particle list
        const thrustAngle = Math.PI + (Math.random() * 0.4 - 0.2);
        const thrustSpeed = p.dashDuration > 0 ? 11 : 4;
        const rOffset = p.radius * 0.85;

        // Add back-thrust spark
        particlesRef.current.push({
          x: p.x + Math.cos(p.angle + thrustAngle) * rOffset,
          y: p.y + Math.sin(p.angle + thrustAngle) * rOffset,
          vx: Math.cos(p.angle + thrustAngle) * thrustSpeed + (Math.random() * 2 - 1),
          vy: Math.sin(p.angle + thrustAngle) * thrustSpeed + (Math.random() * 2 - 1),
          radius: Math.random() * 4 + 2,
          color: p.dashDuration > 0 ? '#00f6ff' : '#ff7a00',
          alpha: 1,
          decay: 0.04,
          life: 1,
        });

        // Simple thruster fire plume representation
        ctx.fillStyle = p.dashDuration > 0 ? '#00f6ff' : '#ff5a00';
        ctx.beginPath();
        ctx.arc(-rOffset, 0, 7 + Math.random() * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw Shoulder Gun Pods
      ctx.fillStyle = mechaHighlight;
      ctx.strokeStyle = mechaNeon;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = mechaNeon;

      // Right shoulder gun outline
      ctx.beginPath();
      ctx.rect(0, 11, 15, 8);
      ctx.fill();
      ctx.stroke();

      // Left shoulder gun outline
      ctx.beginPath();
      ctx.rect(0, -19, 15, 8);
      ctx.fill();
      ctx.stroke();

      // Gun Barrels extending forward
      ctx.fillStyle = '#0f121a';
      ctx.fillRect(15, 13, 10, 4);
      ctx.fillRect(15, -17, 10, 4);

      // 3. Draw Main Heavy Torso Armor Plates
      ctx.shadowBlur = p.dashDuration > 0 ? 14 : 4;
      ctx.fillStyle = mechaMetal;
      ctx.beginPath();
      // Hexagonal heavy robot core panel
      ctx.moveTo(-16, -15);
      ctx.lineTo(8, -15);
      ctx.lineTo(16, 0);
      ctx.lineTo(8, 15);
      ctx.lineTo(-16, 15);
      ctx.lineTo(-20, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mecha Chest glowing neon central reactor
      ctx.fillStyle = mechaNeon;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      // 4. Draw Mecha Head Cockpit with Cyber Visor
      ctx.fillStyle = mechaHighlight;
      ctx.beginPath();
      ctx.ellipse(3, 0, 8, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Neon Ocular Visor
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, -4, 3, 8);
      ctx.fillStyle = mechaNeon;
      ctx.fillRect(8, -3, 2, 6);

      // Mecha Shoulder wing-guards
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-10, -15);
      ctx.lineTo(-4, -24);
      ctx.lineTo(-14, -24);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-10, 15);
      ctx.lineTo(-4, 24);
      ctx.lineTo(-14, 24);
      ctx.closePath();
      ctx.stroke();

      // Restore player translate
      ctx.restore();

      // 5. Draw Active Energy Forcefield Shield Ring (if active / full)
      if (p.shield > 0) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        // Pulsate shield scale slightly
        const pulsate = 1 + Math.sin(timestamp * 0.01) * 0.03;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00f0ff';
        ctx.beginPath();
        ctx.arc(0, 0, (p.radius + 6) * pulsate, 0, Math.PI * 2);
        ctx.stroke();

        // Transparent energy wave
        ctx.fillStyle = 'rgba(0, 240, 255, 0.03)';
        ctx.fill();
        ctx.restore();
      }

      // Draw Particles
      particlesRef.current.forEach((part) => {
        ctx.save();
        ctx.translate(part.x, part.y);
        ctx.fillStyle = part.color;
        ctx.globalAlpha = part.alpha;
        ctx.beginPath();
        ctx.arc(0, 0, part.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Floating Damage & Collect Texts
      ctx.save();
      textsRef.current.forEach((text) => {
        ctx.fillStyle = text.color;
        // Fade out proportional to life
        const ratio = 1 - text.life / text.maxLife;
        ctx.globalAlpha = ratio;
        ctx.font = `bold ${text.size}px "JetBrains Mono", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(text.text, text.x, text.y);
      });
      ctx.restore();
    };

    // Draw mini HP Bar above enemies / boss
    const drawMiniHpBar = (x: number, y: number, hp: number, max: number, width: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      const hpW = width;
      const hpH = 4.5;
      const hRatio = Math.max(0, hp / max);

      ctx.save();
      ctx.translate(x - hpW / 2, y);

      // black bg
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, hpW, hpH);

      // colored HP status
      ctx.fillStyle = hRatio > 0.5 ? '#00ff41' : hRatio > 0.25 ? '#ffa600' : '#ff145a';
      ctx.fillRect(0, 0, hpW * hRatio, hpH);

      // border outline
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(0, 0, hpW, hpH);

      ctx.restore();
    };

    // Trigger GameLoop
    if (gameActive && !isPaused) {
      animId = requestAnimationFrame(gameLoop);
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameActive, isPaused, stats, activeWeapon, selectedColor, stage, wave, waveInProgress]);

  return (
    <div ref={containerRef} id="canvas-container" className="w-full h-full relative cursor-crosshair">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Head-up Floating Indicator Panel for mobile & immersive gameplay overlay */}
      <div className="absolute left-6 bottom-6 flex flex-col gap-2 bg-[#0e1222]/85 border border-[#1e274a]/60 p-4 rounded-xl backdrop-blur-md pointer-events-none w-56 font-mono text-white select-none z-10">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>MECHA-CORE:</span>
          <span>ONLINE</span>
        </div>

        {/* HP Bar */}
        <div className="mt-1">
          <div className="flex justify-between text-xs font-bold text-[#ff145a] mb-1">
            <span>ARMOR HP</span>
            <span>{playerHp.hp}/{playerHp.maxHp}</span>
          </div>
          <div className="w-full h-3 bg-red-950/50 rounded-full border border-red-900/30 overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-[#ff145a] to-[#ff5d8d] transition-all duration-150"
              style={{ width: `${(playerHp.hp / playerHp.maxHp) * 100}%` }}
            />
          </div>
        </div>

        {/* Shield Bar */}
        <div>
          <div className="flex justify-between text-xs font-bold text-[#00f0ff] mb-1">
            <span>FORCE SHIELD</span>
            <span>{playerShield.shield}/{playerShield.maxShield}</span>
          </div>
          <div className="w-full h-3 bg-cyan-950/50 rounded-full border border-cyan-900/30 overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-[#00f0ff] to-[#7ff6ff] transition-all duration-150"
              style={{ width: `${(playerShield.shield / playerShield.maxShield) * 100}%` }}
            />
          </div>
        </div>

        {/* Dash Recovery status */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-400">DASH CD:</span>
          <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className={`h-full ${dashCdRatio > 0 ? 'bg-orange-500' : 'bg-[#05ff8a]'}`}
              style={{ width: `${dashCdRatio > 0 ? (1 - dashCdRatio) * 100 : 100}%` }}
            />
          </div>
          <span className="text-[10px] uppercase font-bold text-gray-300">
            {dashCdRatio > 0 ? 'Charging' : 'Ready [Shift]'}
          </span>
        </div>
      </div>
    </div>
  );
}
