import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerStats, WeaponType } from './types';
import GameCanvas from './components/GameCanvas';
import GameUI from './components/GameUI';
import { playExplosionSound, playUpgradeSound, playBossSpawnSound } from './utils/audio';
import { Trophy, Shield, Zap, Sparkles, Swords, RefreshCw, Volume2, Cpu, AlertTriangle } from 'lucide-react';

const INITIAL_STATS: PlayerStats = {
  maxHp: 100,
  maxShield: 50,
  bulletDamage: 18,
  fireRateLevel: 1,
  moveSpeedLevel: 1,
  scraps: 0,
  kills: 0,
  score: 0,
  highScore: 0,
};

const STAGE_INFOS = [
  { id: 1, name: '作戦エリア第 1 層', desc: '偵察警戒領域：基本の偵察用ドローンのみ登場します。初心者向け。', difficulty: '初級', badgeColor: 'bg-emerald-500/25 text-emerald-400 border-emerald-500/40' },
  { id: 2, name: '作戦エリア第 2 層', desc: '高速侵入領域：高速突攻ドローンが参戦し、敵から受けるダメージも微小増加します。', difficulty: '中級', badgeColor: 'bg-cyan-500/25 text-cyan-400 border-cyan-500/40' },
  { id: 3, name: '作戦エリア第 3 層', desc: '強襲火力領域：自動追尾レーザー搭載の強襲主力ドローンが編隊を組み襲来します。', difficulty: '上級', badgeColor: 'bg-yellow-500/25 text-yellow-400 border-yellow-500/40' },
  { id: 4, name: '作戦エリア第 4 層', desc: '巨大重装甲アリーナ：極めて強固な装甲を持つ重戦車ドローンが出現し、受ける被弾ダメージが大幅上昇します。', difficulty: '超上級', badgeColor: 'bg-orange-500/25 text-orange-400 border-orange-500/40' },
  { id: 5, name: '作戦エリア第 5 層', desc: '終末暴走コア領域：すべての敵ドローンが混ざり合い、最大級の攻撃加害ダメージと凄まじい物量で襲撃します。', difficulty: '極限', badgeColor: 'bg-red-500/25 text-red-500 border-red-500/40' },
];

export default function App() {
  const [showMenu, setShowMenu] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
  // Game stats
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [activeWeapon, setActiveWeapon] = useState<WeaponType>('PULSE');
  const [unlockedWeapons, setUnlockedWeapons] = useState<WeaponType[]>(['PULSE']);
  const [selectedColor, setSelectedColor] = useState('blue');
  const [stage, setStage] = useState(1);
  const [wave, setWave] = useState(1);
  const [waveInProgress, setWaveInProgress] = useState(false);
  const [bossActive, setBossActive] = useState(false);

  // Load High Score from localStorage on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem('mecha_shooter_high_score');
    if (savedHighScore) {
      setStats((prev) => ({
        ...prev,
        highScore: parseInt(savedHighScore, 10) || 0,
      }));
    }
  }, []);

  // Sync high score back to local storage when it updates
  useEffect(() => {
    if (stats.score > stats.highScore) {
      setStats((prev) => ({ ...prev, highScore: prev.score }));
    }
    if (stats.highScore > 0) {
      localStorage.setItem('mecha_shooter_high_score', stats.highScore.toString());
    }
  }, [stats.score, stats.highScore]);

  // Hook ESC to toggle Paused/Upgrade bay state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameActive && !gameOver) {
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameActive, gameOver]);

  const handleStartGame = () => {
    playUpgradeSound();
    setStats({
      ...INITIAL_STATS,
      highScore: stats.highScore,
    });
    setActiveWeapon('PULSE');
    setUnlockedWeapons(['PULSE']);
    setWave(1);
    setWaveInProgress(false);
    setBossActive(false);
    setGameOver(false);
    setShowMenu(false);
    setIsPaused(false);
    setGameActive(true);
  };

  const handleGameOver = () => {
    playExplosionSound('boss');
    setGameActive(false);
    setGameOver(true);
  };

  const handleBossSpawn = () => {
    setBossActive(true);
    playBossSpawnSound();
    // Fade alert banner out after 3 seconds
    setTimeout(() => {
      setBossActive(false);
    }, 4500);
  };

  // Color theme mapping
  const colorStyles: { [key: string]: { border: string; glow: string; text: string; bg: string } } = {
    blue: { border: 'border-[#00f0ff]', glow: 'shadow-[#00f0ff]/30', text: 'text-[#00f0ff]', bg: 'bg-[#00f0ff]' },
    red: { border: 'border-[#ff2a5f]', glow: 'shadow-[#ff2a5f]/30', text: 'text-[#ff2a5f]', bg: 'bg-[#ff2a5f]' },
    emerald: { border: 'border-[#05ff8a]', glow: 'shadow-[#05ff8a]/30', text: 'text-[#05ff8a]', bg: 'bg-[#05ff8a]' },
    gold: { border: 'border-[#ffb700]', glow: 'shadow-[#ffb700]/30', text: 'text-[#ffb700]', bg: 'bg-[#ffb700]' },
    purple: { border: 'border-[#b100ff]', glow: 'shadow-[#b100ff]/30', text: 'text-[#b100ff]', bg: 'bg-[#b100ff]' },
  };

  const activeTheme = colorStyles[selectedColor] || colorStyles.blue;

  return (
    <div className="w-screen h-screen bg-[#03040b] overflow-hidden flex relative select-none">
      
      {/* Immersive space dust dynamic particles canvas simulator in background screen */}
      <div className="absolute inset-0 pointer-events-none opacity-40 z-0">
        <div className="absolute top-[20%] left-[10%] w-[3px] h-[3px] bg-white rounded-full animate-pulse" />
        <div className="absolute top-[50%] left-[80%] w-[2.5px] h-[2.5px] bg-cyan-400 rounded-full animate-pulse" />
        <div className="absolute top-[80%] left-[40%] w-[3.5px] h-[3.5px] bg-blue-500 rounded-full animate-pulse" />
      </div>

      {/* Main interactive Canvas */}
      <GameCanvas
        gameActive={gameActive}
        isPaused={isPaused}
        stats={stats}
        setStats={setStats}
        activeWeapon={activeWeapon}
        unlockedWeapons={unlockedWeapons}
        selectedColor={selectedColor}
        stage={stage}
        wave={wave}
        setWave={setWave}
        waveInProgress={waveInProgress}
        setWaveInProgress={setWaveInProgress}
        onGameOver={handleGameOver}
        onBossSpawn={handleBossSpawn}
      />

      {/* Core UI Heads up layer */}
      <GameUI
        stats={stats}
        setStats={setStats}
        activeWeapon={activeWeapon}
        setActiveWeapon={setActiveWeapon}
        unlockedWeapons={unlockedWeapons}
        setUnlockedWeapons={setUnlockedWeapons}
        stage={stage}
        wave={wave}
        score={stats.score}
        gameActive={gameActive}
        onStartGame={handleStartGame}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
      />

      {/* Flashing EPIC BOSS ALARM */}
      <AnimatePresence>
        {bossActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-950/40 pointer-events-none border-4 border-red-600 animate-pulse flex flex-col justify-center items-center z-50 text-center uppercase"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-black/90 px-8 py-5 rounded-2xl border border-red-500 flex flex-col items-center gap-2 "
            >
              <AlertTriangle className="text-red-500 animate-bounce" size={40} />
              <div className="font-mono text-red-500 font-extrabold text-2xl tracking-widest leading-none">
                WARNING: GIGA OVERLORD OVERWATCH
              </div>
              <div className="font-mono text-white text-sm font-semibold tracking-wide">
                脅威度極限：超大型ボスロボットが襲来中！
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title Launcher Menu Screen */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#040612]/95 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50 p-6"
          >
            <div className="w-full max-w-4xl bg-[#090b16] border border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row gap-8 shadow-2xl shadow-cyan-950/20">
              {/* Left Section: Info/Title */}
              <div className="flex-1 flex flex-col justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className={`w-5 h-5 ${activeTheme.text}`} />
                    <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#00f0ff]">
                      CYBERNETIC STAGE arena v1.3
                    </span>
                  </div>

                  {/* Title font Space Grotesk */}
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-none">
                    メカ・アリーナ
                    <span className={`block mt-2 ${activeTheme.text} uppercase text-[26px] tracking-wide`}>
                      サイバークライシス
                    </span>
                  </h1>

                  <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                    未知のサイバー暴走プログラムに侵食された敵軍ドローンからアリーナを守る、爽快メカシューティングゲーム！
                    敵を討伐して装甲・推進・重量武器をアップグレードし、5ウェーブごとに襲いかかる超巨大ボスロボット「GIGAオーバーロード」を迎撃せよ。
                  </p>
                </div>

                {/* Stage Selection */}
                <div className="bg-[#0e1227] border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
                  <span className="text-[10px] font-mono text-gray-400 font-bold tracking-wider">
                    ▼ 出撃作戦ステージ選択（難易度・敵構成の変化）
                  </span>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((stg) => {
                      const isActive = stage === stg;
                      const colors = [
                        'border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/10',
                        'border-cyan-500/35 text-cyan-400 hover:bg-cyan-500/10',
                        'border-yellow-500/35 text-yellow-400 hover:bg-yellow-500/10',
                        'border-orange-500/35 text-orange-400 hover:bg-orange-500/10',
                        'border-red-500/35 text-red-500 hover:bg-red-500/10',
                      ];
                      return (
                        <button
                          key={stg}
                          onClick={() => {
                            setStage(stg);
                            playUpgradeSound();
                          }}
                          className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                            isActive
                              ? 'border-white text-white font-extrabold ring-2 ring-cyan-500/40 scale-105 bg-slate-800'
                              : `${colors[stg - 1]} opacity-60 hover:opacity-100`
                          }`}
                        >
                          作戦 {stg}
                        </button>
                      );
                    })}
                  </div>
                  {/* Selected Stage Explanation */}
                  <div className="mt-1 p-2.5 bg-black/40 border border-slate-900 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-white">
                        {STAGE_INFOS[stage - 1].name}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${STAGE_INFOS[stage - 1].badgeColor}`}>
                        {STAGE_INFOS[stage - 1].difficulty}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      {STAGE_INFOS[stage - 1].desc}
                    </p>
                  </div>
                </div>

                {/* Mecha configuration preview visual */}
                <div className="bg-[#0e1227] border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
                  <span className="text-[10px] font-mono text-gray-400 font-bold tracking-wider">
                    ▼ モビルスーツ機体・カラーカスタマイズ
                  </span>
                  <div className="flex gap-2">
                    {['blue', 'red', 'emerald', 'gold', 'purple'].map((col) => {
                      const mapping: { [key: string]: string } = {
                        blue: '#00f0ff',
                        red: '#ff2a5f',
                        emerald: '#05ff8a',
                        gold: '#ffb700',
                        purple: '#b100ff',
                      };
                      return (
                        <button
                          key={col}
                          onClick={() => {
                            setSelectedColor(col);
                            playUpgradeSound();
                          }}
                          className={`w-9 h-9 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedColor === col ? 'border-white scale-110' : 'border-transparent opacity-65 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: mapping[col] }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Start Action Button */}
                <div>
                  <button
                    onClick={handleStartGame}
                    className="w-full font-mono text-sm cursor-pointer py-4 bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-cyan-950/40 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    戦闘を開始する (START MISSION)
                  </button>
                </div>
              </div>

              {/* Right Section: Scores & Guide */}
              <div className="w-full md:w-80 flex flex-col gap-6">
                {/* Score high ranking */}
                <div className="bg-[#0d1020] border border-slate-800 p-5 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                    <Trophy className="text-amber-400" size={18} />
                    <span className="font-mono text-xs font-bold text-slate-100 uppercase">ハイスコア・戦歴</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="font-mono text-[11px] text-gray-500">最高戦績記録:</span>
                    <span className="font-mono font-black text-amber-300 text-lg">
                      {stats.highScore.toLocaleString()} PTS
                    </span>
                  </div>
                </div>

                {/* Instructions card */}
                <div className="bg-[#0d1020] border border-slate-800 p-5 rounded-2xl flex-col flex-1 gap-3 flex">
                  <span className="font-mono text-xs font-bold text-slate-150 uppercase border-b border-slate-800 pb-2.5">
                    機体操縦マニュアル
                  </span>
                  <div className="flex flex-col gap-2.5 text-[11px] text-gray-400 leading-relaxed font-mono">
                    <div className="flex gap-2">
                      <span className="text-cyan-400">■</span>
                      <span>
                        <strong className="text-white">W/A/S/D キー / 矢印キー</strong>：機体を自由に移動。
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-cyan-400">■</span>
                      <span>
                        <strong className="text-white">オートエイム＆射撃</strong>：機体が最も近い敵を自動で精密ロックオン（追従）します。<strong className="text-white">スペースキー または クリック</strong>で射撃！
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-cyan-400">■</span>
                      <span>
                        <strong className="text-white">Shift または E キー</strong>：無敵の超高速推進ダッシュ（衝突攻撃可）。
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-cyan-400">■</span>
                      <span>
                        <strong className="text-white">ESC キー</strong>：戦闘中に「カスタマイズ・ショップ」を展開。
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-cyan-400">■</span>
                      <span>
                        敵を撃破すると、強化に使う<strong className="text-white">コア屑</strong>や、アーマーHPを回復する緑の<strong className="text-white">ナノリペアキット</strong>を投下（ドロップ）します！
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Screen */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50 p-6"
          >
            <motion.div
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              className="w-full max-w-lg bg-[#0a0710] border border-red-900/50 p-8 rounded-3xl flex flex-col gap-6 text-center shadow-2xl shadow-red-950/20"
            >
              <div className="flex justify-center">
                <div className="p-4 bg-red-950/30 border border-red-500/25 rounded-full text-red-500 animate-pulse">
                  <AlertTriangle size={32} />
                </div>
              </div>

              <div>
                <h2 className="text-red-500 font-mono text-2xl font-black uppercase tracking-widest leading-none">
                  MISSION FAILED / 機体大破
                </h2>
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  あなたのロボットは激しいサイバー攻撃により機能停止、コア大破しました。
                </p>
              </div>

              {/* Statistics */}
              <div className="bg-[#120d18] border border-red-950 px-5 py-4 rounded-2xl flex flex-col gap-2 text-left font-mono text-xs">
                <div className="flex justify-between text-cyan-400 font-bold">
                  <span>作戦ステージ:</span>
                  <span>ステージ {stage}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>生存到達ウェーブ:</span>
                  <span className="text-white font-bold">ウェーブ {wave}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>ウイルスドローン撃破数:</span>
                  <span className="text-white font-bold">{stats.kills} 機</span>
                </div>
                <div className="flex justify-between text-gray-400 border-t border-red-950/30 pt-2 text-sm">
                  <span>最終スコア:</span>
                  <span className="text-amber-400 font-extrabold">{stats.score.toLocaleString()} PTS</span>
                </div>
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>ベストレコード:</span>
                  <span className="text-gray-300 font-bold">{stats.highScore.toLocaleString()} PTS</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMenu(true);
                    setGameOver(false);
                    setGameActive(false);
                  }}
                  className="flex-1 font-mono text-xs cursor-pointer py-3.5 bg-slate-900 border border-slate-800 hover:text-white text-slate-300 rounded-xl"
                >
                  メインメニューに戻る
                </button>
                <button
                  onClick={handleStartGame}
                  className="flex-1 font-mono text-xs cursor-pointer py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl"
                >
                  ミッション再開 (RETRY)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
