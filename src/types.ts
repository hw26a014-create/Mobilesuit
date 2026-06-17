export type WeaponType = 'PULSE' | 'SPREAD' | 'PLASMA' | 'ROCKET';

export interface WeaponInfo {
  type: WeaponType;
  name: string;
  jpName: string;
  description: string;
  damage: number;
  fireRate: number; // Ms representation between shots
  speed: number;
  unlocked: boolean;
  cost: number;
}

export interface PlayerStats {
  maxHp: number;
  maxShield: number;
  bulletDamage: number;
  fireRateLevel: number;
  moveSpeedLevel: number;
  scraps: number;
  kills: number;
  score: number;
  highScore: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  angle: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  shieldRegenTimer: number;
  dashCooldown: number;
  dashDuration: number;
  dashVx: number;
  dashVy: number;
  color: string;
}

export type EnemyType = 'SCOUT' | 'ASSAULT' | 'TANK' | 'SPEEDER' | 'BOSS';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  color: string;
  scoreValue: number;
  damage: number;
  shootCooldown: number;
  angle: number;
  isBoss: boolean;
  bossPhase?: number;
  phaseTimer?: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  isPlayer: boolean;
  type: 'PULSE' | 'SPREAD' | 'PLASMA' | 'ROCKET' | 'ENEMY';
  life: number;
  hitEnemyIds?: string[];
}

export interface ScrapPrice {
  id: string;
  name: string;
  jpName: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  description: string;
}

export interface GameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  life: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface Upgrade {
  id: string;
  name: string;
  jpName: string;
  level: number;
  maxLevel: number;
  currentValue: number;
  nextValue: number;
  cost: number;
  description: string;
}
