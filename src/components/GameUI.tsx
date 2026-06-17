import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PlayerStats, WeaponType, Upgrade } from '../types';
import { playUpgradeSound, setMuted, getMuted } from '../utils/audio';
import { Shield, Sparkles, Zap, Crosshair, Swords, Trophy, Volume2, VolumeX, RefreshCw } from 'lucide-react';


interface GameUIProps {
  stats: PlayerStats;
  setStats: React.Dispatch<React.SetStateAction<PlayerStats>>;
  activeWeapon: WeaponType;
  setActiveWeapon: (w: WeaponType) => void;
  unlockedWeapons: WeaponType[];
  setUnlockedWeapons: React.Dispatch<React.SetStateAction<WeaponType[]>>;
  stage: number;
  wave: number;
  score: number;
  gameActive: boolean;
  onStartGame: () => void;
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
  selectedColor: string;
  setSelectedColor: (c: string) => void;
}

export default function GameUI({
  stats,
  setStats,
  activeWeapon,
  setActiveWeapon,
  unlockedWeapons,
  setUnlockedWeapons,
  stage,
  wave,
  score,
  gameActive,
  onStartGame,
  isPaused,
  setIsPaused,
  selectedColor,
  setSelectedColor,
}: GameUIProps) {
  const [audioMuted, setAudioMuted] = useState(getMuted());

  // Available Mecha Hull Colors
  const colorsList = [
    { id: 'blue', value: '#00f0ff', label: 'CYBER AQUA' },
    { id: 'red', value: '#ff2a5f', label: 'HELL CRIMSON' },
    { id: 'emerald', value: '#05ff8a', label: 'NEXUS JADE' },
    { id: 'gold', value: '#ffb700', label: 'SOLAR BRASS' },
    { id: 'purple', value: '#b100ff', label: 'VOID NEON' },
  ];

  // Upgrades Configuration
  const upgradeCost = (base: number, mult: number, level: number) => {
    return Math.round(base * Math.pow(mult, level - 1));
  };

  const getShieldUpgrade = (): Upgrade => {
    const level = Math.floor((stats.maxShield - 50) / 15) + 1;
    const maxLevel = 10;
    const baseCost = 60;
    const cost = upgradeCost(baseCost, 1.45, level);
    return {
      id: 'maxShield',
      name: 'Energy Shield',
      jpName: 'フォース・シールド',
      level,
      maxLevel,
      currentValue: stats.maxShield,
      nextValue: stats.maxShield + 15,
      cost: level >= maxLevel ? 0 : cost,
      description: '最大シールド容量を向上させ、大破ダメージを防ぐ。',
    };
  };

  const getHpUpgrade = (): Upgrade => {
    const level = Math.floor((stats.maxHp - 100) / 30) + 1;
    const maxLevel = 10;
    const baseCost = 50;
    const cost = upgradeCost(baseCost, 1.4, level);
    return {
      id: 'maxHp',
      name: 'Titanium Armor Plates',
      jpName: 'チタン合金装甲',
      level,
      maxLevel,
      currentValue: stats.maxHp,
      nextValue: stats.maxHp + 30,
      cost: level >= maxLevel ? 0 : cost,
      description: 'ロボットの最大物理アーマーHP値をアップグレードする。',
    };
  };

  const getDamageUpgrade = (): Upgrade => {
    const level = Math.round((stats.bulletDamage - 18) / 3); // Starts at 18 base, increments by 3
    const maxLevel = 12;
    const baseCost = 40;
    const cost = upgradeCost(baseCost, 1.4, level + 1);
    return {
      id: 'bulletDamage',
      name: 'Plasma Overcharge',
      jpName: 'プラズマ増幅機',
      level: level + 1,
      maxLevel,
      currentValue: stats.bulletDamage,
      nextValue: stats.bulletDamage + 3,
      cost: level + 1 >= maxLevel ? 0 : cost,
      description: '全武器弾頭の基礎破壊ダメージを増幅する。',
    };
  };

  const getFireRateUpgrade = (): Upgrade => {
    const maxLevel = 5;
    const baseCost = 80;
    const cost = upgradeCost(baseCost, 1.8, stats.fireRateLevel);
    return {
      id: 'fireRate',
      name: 'Rapid Thruster Trigger',
      jpName: '機関銃加熱トリガー',
      level: stats.fireRateLevel,
      maxLevel,
      currentValue: stats.fireRateLevel,
      nextValue: stats.fireRateLevel + 1,
      cost: stats.fireRateLevel >= maxLevel ? 0 : cost,
      description: '機関砲の射撃間隔の冷却ウェイトを大幅に短縮する。',
    };
  };

  const getMoveSpeedUpgrade = (): Upgrade => {
    const maxLevel = 6;
    const baseCost = 35;
    const cost = upgradeCost(baseCost, 1.35, stats.moveSpeedLevel);
    return {
      id: 'moveSpeed',
      name: 'Auxiliary Thrusters',
      jpName: '補助スラスター',
      level: stats.moveSpeedLevel,
      maxLevel,
      currentValue: stats.moveSpeedLevel * 10,
      nextValue: (stats.moveSpeedLevel + 1) * 10,
      cost: stats.moveSpeedLevel >= maxLevel ? 0 : cost,
      description: '戦闘時における機体の最高移動速度をブースト。',
    };
  };

  // Heavy Weapons Unlocks lists
  const additionalWeapons = [
    {
      type: 'SPREAD' as WeaponType,
      cost: 150,
      name: 'Triple Spread Cannon',
      jpName: '3連拡散ショットガン',
      icon: Swords,
      description: '扇状に広がる高出力ビームを3発同時発射。広範囲を殲滅する。',
    },
    {
      type: 'PLASMA' as WeaponType,
      cost: 320,
      name: 'High-Density Plasma Orbs',
      jpName: '超高熱プラズマ塊砲',
      icon: Zap,
      description: '敵を貫通し、巨大なヒット判定を有する超強力なプラズマ弾。',
    },
    {
      type: 'ROCKET' as WeaponType,
      cost: 480,
      name: 'Micro-Explosive Rockets',
      jpName: '小型炸裂マイクロロケット',
      icon: Shield,
      description: '直撃時、周囲の機体に壊滅的範囲爆風ダメージを巻き起こす。',
    },
  ];

  const handlePurchaseUpgrade = (upg: Upgrade) => {
    if (stats.scraps < upg.cost) return;

    playUpgradeSound();

    setStats((prev) => {
      const nextScraps = prev.scraps - upg.cost;
      switch (upg.id) {
        case 'maxHp':
          return { ...prev, maxHp: upg.nextValue, scraps: nextScraps };
        case 'maxShield':
          return { ...prev, maxShield: upg.nextValue, scraps: nextScraps };
        case 'bulletDamage':
          return { ...prev, bulletDamage: upg.nextValue, scraps: nextScraps };
        case 'fireRate':
          return { ...prev, fireRateLevel: upg.nextValue, scraps: nextScraps };
        case 'moveSpeed':
          return { ...prev, moveSpeedLevel: prev.moveSpeedLevel + 1, scraps: nextScraps };
        default:
          return prev;
      }
    });
  };

  const handleUnlockWeapon = (type: WeaponType, cost: number) => {
    if (stats.scraps < cost || unlockedWeapons.includes(type)) return;

    playUpgradeSound();
    setStats((prev) => ({ ...prev, scraps: prev.scraps - cost }));
    setUnlockedWeapons((prev) => [...prev, type]);
    setActiveWeapon(type);
  };

  const toggleSoundMute = () => {
    const nextMuted = !audioMuted;
    setMuted(nextMuted);
    setAudioMuted(nextMuted);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 select-none z-20">
      {/* 1. Header Toolbar Dashboard */}
      <div className="w-full flex justify-between items-start pointer-events-auto">
        {/* Wave and Cyber Scores Status */}
        <div className="flex gap-4">
          <div className="bg-[#0b0c16]/90 border border-cyan-500/20 px-5 py-3 rounded-xl shadow-lg shadow-cyan-950/20 backdrop-blur-md flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
            <div className="font-mono text-xs text-gray-400">
              <span className="block text-[9px] uppercase tracking-wider text-cyan-400">作戦アリーナ状況</span>
              <span className="text-lg font-bold text-white">ステージ {stage} - ウェーブ {wave}</span>
            </div>
          </div>

          <div className="bg-[#0b0c16]/90 border border-[#b100ff]/20 px-5 py-3 rounded-xl shadow-lg backdrop-blur-md">
            <div className="font-mono text-xs text-gray-400">
              <span className="block text-[9px] uppercase tracking-wider text-[#b100ff]">SCORE</span>
              <span className="text-lg font-mono font-black text-white">{score.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action button toggles */}
        <div className="flex gap-2">
          {/* Sound Synth Toggle */}
          <button
            onClick={toggleSoundMute}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            id="btn-sound-toggle"
            title="音声をミュート"
          >
            {audioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Pause Trigger */}
          {gameActive && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`font-mono text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl border backdrop-blur-md cursor-pointer transition-all duration-200 ${
                isPaused
                  ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-amber-500/10 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
              }`}
              id="btn-pause-toggle"
            >
              {isPaused ? 'RESUME [ESC]' : 'PAUSE [ESC]'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Heavy Upgrade Mecha Bay Overlay */}
      {gameActive && isPaused && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center pointer-events-auto z-40 transition-all">
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-4xl max-h-[85vh] bg-[#0c0e1b] border border-slate-800/80 rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-cyan-950/20"
          >
            {/* Header / Cost inventory */}
            <div className="border-b border-slate-800 px-6 py-4 flex justify-between items-center bg-[#070810]">
              <div>
                <h2 className="text-cyan-400 font-mono text-lg font-bold tracking-tight">
                  ▲ MECHA UPGRADE BAY / 機体カスタマイズ
                </h2>
                <p className="text-xs text-yaml text-gray-500">
                  敵ロボットの残骸から集めた「合金コア屑」を使用して、機体を強化・武装解除しましょう。
                </p>
              </div>
              <div className="bg-[#05ff8a]/10 border border-[#05ff8a]/30 px-4 py-2 rounded-xl flex items-center gap-2">
                <Sparkles size={16} className="text-[#05ff8a]" />
                <span className="font-mono text-sm text-[11px] text-gray-400">CORPO SCRAPS:</span>
                <span className="font-mono font-bold text-white text-base">{stats.scraps} 屑</span>
              </div>
            </div>

            {/* Shop Categories division */}
            <div className="flex-1 overflow-y-auto grid md:grid-cols-2 gap-6 p-6">
              {/* Left Column: Stat upgrades */}
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1 border-l-2 border-cyan-400 pl-2">
                  1. 機体基本パラメーター
                </h3>

                {[getHpUpgrade(), getShieldUpgrade(), getDamageUpgrade(), getFireRateUpgrade(), getMoveSpeedUpgrade()].map((upg) => {
                  const canAfford = stats.scraps >= upg.cost && upg.cost > 0;
                  const isMax = upg.level >= upg.maxLevel;

                  return (
                    <div
                      key={upg.id}
                      className="bg-[#121528]/55 border border-slate-800/60 p-3.5 rounded-xl flex justify-between items-center gap-3 hover:border-slate-800 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-sans font-medium text-sm text-slate-100">{upg.name}</span>
                          <span className="font-mono text-[10px] text-gray-400">【{upg.jpName}】</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{upg.description}</p>
                        <div className="flex gap-1.5 items-center mt-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: upg.maxLevel }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-2.5 h-1.5 rounded-xs ${
                                  i < upg.level ? 'bg-cyan-400' : 'bg-slate-900 border border-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[9px] font-mono text-gray-400 ml-1">
                            Lvl {upg.level}/{upg.maxLevel}
                          </span>
                        </div>
                      </div>

                      <div>
                        {isMax ? (
                          <span className="text-[11px] font-mono text-cyan-400 tracking-wider font-bold bg-cyan-950/20 border border-cyan-900/30 px-3 py-1.5 rounded-lg">
                            限界突破
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePurchaseUpgrade(upg)}
                            disabled={!canAfford}
                            className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-cyan-500/10 border-cyan-400 hover:bg-cyan-400 hover:text-black hover:shadow-md hover:shadow-cyan-950/20 text-cyan-300'
                                : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            UPG {upg.cost} 屑
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Special weapons payload */}
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1 border-l-2 border-[#b100ff] pl-2">
                  2. 重量武器デプロイ解除
                </h3>

                {additionalWeapons.map((wpn) => {
                  const isUnlocked = unlockedWeapons.includes(wpn.type);
                  const canAfford = stats.scraps >= wpn.cost;
                  const isActive = activeWeapon === wpn.type;

                  return (
                    <div
                      key={wpn.type}
                      className={`border p-4 rounded-xl flex items-center justify-between gap-4 transition-all ${
                        isActive
                          ? 'bg-[#1b1235]/40 border-[#b100ff]/60'
                          : 'bg-[#121528]/55 border-slate-800/60 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`p-2.5 rounded-xl border ${
                            isActive
                              ? 'bg-[#b100ff]/10 border-[#b100ff]/30 text-[#b100ff]'
                              : isUnlocked
                              ? 'bg-slate-900 border-slate-800 text-slate-400'
                              : 'bg-slate-950 border-slate-900 text-slate-600'
                          }`}
                        >
                          <Crosshair size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-medium text-sm text-slate-100">{wpn.name}</span>
                            <span className="font-mono text-[10px] text-gray-400">【{wpn.jpName}】</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">{wpn.description}</p>
                          {isUnlocked && (
                            <span className="inline-block mt-2 text-[9px] uppercase font-bold text-emerald-400 bg-emerald-950/10 border border-emerald-900/20 px-2 py-0.5 rounded">
                              UNLOCKED
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        {isActive ? (
                          <span className="text-[10px] font-mono font-bold text-slate-200 bg-[#b100ff]/30 border border-[#b100ff]/40 px-3 py-1.5 rounded-lg uppercase tracking-wider block text-center">
                            装備中
                          </span>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => setActiveWeapon(wpn.type)}
                            className="text-[10px] font-mono cursor-pointer font-bold text-slate-400 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg uppercase tracking-wider"
                          >
                            装備する
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnlockWeapon(wpn.type, wpn.cost)}
                            disabled={!canAfford}
                            className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-purple-500/10 border-[#b100ff] hover:bg-[#b100ff] hover:text-white text-purple-300'
                                : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            解除 {wpn.cost} 屑
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resume tutorial bottom close bar */}
            <div className="border-t border-slate-800/80 px-6 py-4 flex justify-between items-center bg-[#070810]">
              <div className="flex items-center gap-2 font-mono text-[10px] text-gray-500">
                <span>ショートカットキー:</span>
                <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">ESC</span>
                <span>でゲームに戻る</span>
              </div>
              <button
                onClick={() => setIsPaused(false)}
                className="font-mono text-xs cursor-pointer font-bold bg-cyan-400 hover:bg-cyan-300 text-black px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-950/30 transition-shadow"
              >
                戦闘に戻る (ESC)
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 3. Immersive Bottom Weapons Tray and Controls overlay */}
      <div className="w-full flex justify-between items-end">
        {/* Active Weapon selection tabs */}
        {gameActive && (
          <div className="flex gap-1.5 bg-slate-950/85 border border-slate-800/70 p-1.5 rounded-xl backdrop-blur-md pointer-events-auto shadow-lg">
            {['PULSE', 'SPREAD', 'PLASMA', 'ROCKET'].map((type) => {
              const isUnlocked = unlockedWeapons.includes(type as WeaponType);
              const isActive = activeWeapon === type;
              const nameMap: { [key: string]: string } = {
                PULSE: 'PULSE / パルス',
                SPREAD: 'SPREAD / 散弾',
                PLASMA: 'PLASMA / プラズマ',
                ROCKET: 'ROCKET / ロケット',
              };

              return (
                <button
                  key={type}
                  onClick={() => isUnlocked && setActiveWeapon(type as WeaponType)}
                  disabled={!isUnlocked}
                  className={`font-mono text-[10px] font-bold px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-cyan-400 text-black font-semibold'
                      : isUnlocked
                      ? 'text-gray-300 hover:bg-slate-900 cursor-pointer'
                      : 'text-slate-700 cursor-not-allowed opacity-35'
                  }`}
                  id={`btn-weapon-wpn-${type.toLowerCase()}`}
                >
                  {nameMap[type]}
                </button>
              );
            })}
          </div>
        )}

        {/* Action helper instructions */}
        <div className="bg-[#0b0c16]/95 border border-slate-800 max-w-sm px-4 py-2.5 rounded-xl text-[10px] text-gray-400 font-mono flex flex-col gap-1 items-start leading-relaxed backdrop-blur-md">
          <div className="text-cyan-400 font-bold uppercase tracking-widest text-[8px] mb-0.5">CONTROLS DETECTOR</div>
          <span className="flex items-center gap-1.5">
            <span className="bg-slate-900 border border-slate-800 text-slate-100 px-1.5 rounded py-0.5 font-bold">W A S D</span>
            <span>/</span>
            <span className="bg-slate-900 border border-slate-800 text-slate-100 px-1.5 rounded py-0.5 font-bold">↑ ↓ ← →</span>
            <span>マニューバ移動</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-slate-900 border border-slate-800 text-slate-100 px-1.5 rounded py-0.5 font-bold">AUTO-LOCK ON</span>
            <span>最寄りの敵を自動捕捉！スペース or クリックで射撃</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-slate-900 border border-slate-800 text-slate-100 px-1.5 rounded py-0.5 font-bold font-mono">SHIFT / E</span>
            <span>急加速ブースト・ダッシュ (無敵突進)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-slate-900 border border-slate-800 text-emerald-400 px-1.5 rounded py-0.5 font-bold font-mono">REPAIR KIT</span>
            <span>緑のカプセルに接近・回収でアーマーHP修復</span>
          </span>
        </div>
      </div>
    </div>
  );
}
