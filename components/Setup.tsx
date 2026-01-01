
import React, { useState } from 'react';
import { GameState, GameStatus, PlayerStatus } from '../types';
import { MoveUp, MoveDown, Play, LogOut, ShieldCheck } from 'lucide-react';

interface SetupProps {
  gameState: GameState;
  updateGameState: (state: GameState) => void;
  currentUser: { id: string; name: string };
  onLeave: () => void;
}

const Setup: React.FC<SetupProps> = ({ gameState, updateGameState, currentUser, onLeave }) => {
  const isOwner = gameState.players.find(p => p.id === currentUser.id)?.isOwner;
  const [bb, setBb] = useState(gameState.bbAmount);

  const reorder = (index: number, direction: 'up' | 'down') => {
    if (!isOwner) return;
    const newPlayers = [...gameState.players];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPlayers.length) return;

    [newPlayers[index], newPlayers[targetIndex]] = [newPlayers[targetIndex], newPlayers[index]];
    
    // Update positions
    newPlayers.forEach((p, i) => p.position = i);
    updateGameState({ ...gameState, players: newPlayers });
  };

  const startGame = () => {
    if (gameState.players.length < 2) {
      alert("2人以上のプレイヤーが必要です");
      return;
    }

    // Assign SB and BB positions
    const dealerIdx = 0;
    const sbIdx = (dealerIdx + 1) % gameState.players.length;
    const bbIdx = (dealerIdx + 2) % gameState.players.length;

    const sbAmount = Math.floor(bb / 2);
    
    const newPlayers = gameState.players.map((p, i) => {
      let bet = 0;
      let chips = p.chips;
      if (i === sbIdx) {
        bet = sbAmount;
        chips -= sbAmount;
      } else if (i === bbIdx) {
        bet = bb;
        chips -= bb;
      }
      return { ...p, bet, chips, status: PlayerStatus.ACTIVE };
    });

    updateGameState({
      ...gameState,
      status: GameStatus.PLAYING,
      bbAmount: bb,
      players: newPlayers,
      dealerIndex: dealerIdx,
      currentTurnIndex: (bbIdx + 1) % newPlayers.length,
      minBet: bb,
      lastRaiseAmount: bb,
      pot: sbAmount + bb,
      street: 'Pre-flop'
    });
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">準備中...</h2>
          <p className="text-slate-400">ルームID: <span className="text-green-400 font-mono">{gameState.roomId}</span></p>
        </div>
        <button 
          onClick={onLeave}
          className="p-3 rounded-full bg-slate-800 text-slate-400 active:bg-red-900 active:text-white transition-colors"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-4 bg-slate-800/50 flex items-center justify-between border-b border-slate-700">
          <span className="font-bold">プレイヤー ({gameState.players.length})</span>
          {isOwner && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">あなたがオーナーです</span>}
        </div>
        <ul className="divide-y divide-slate-800">
          {gameState.players.map((player, idx) => (
            <li key={player.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${player.isOwner ? 'bg-amber-500' : 'bg-slate-700'}`}>
                  {player.name[0]}
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-1">
                    {player.name}
                    {player.isOwner && <ShieldCheck size={14} className="text-amber-500" />}
                    {player.id === currentUser.id && <span className="text-[10px] text-slate-400">(あなた)</span>}
                  </div>
                  <div className="text-xs text-slate-500">{player.chips} chips</div>
                </div>
              </div>
              
              {isOwner && (
                <div className="flex gap-2">
                  <button onClick={() => reorder(idx, 'up')} className="p-2 bg-slate-800 rounded-lg text-slate-400 disabled:opacity-20" disabled={idx === 0}>
                    <MoveUp size={18} />
                  </button>
                  <button onClick={() => reorder(idx, 'down')} className="p-2 bg-slate-800 rounded-lg text-slate-400 disabled:opacity-20" disabled={idx === gameState.players.length - 1}>
                    <MoveDown size={18} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isOwner && (
        <div className="space-y-4 pt-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <label className="block text-sm font-medium text-slate-400 mb-3 text-center">ビッグブラインド (BB) の額</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setBb(Math.max(2, bb - 2))} className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 text-2xl">-</button>
              <div className="flex-1 text-center text-3xl font-bold font-mono text-green-400">{bb}</div>
              <button onClick={() => setBb(bb + 2)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 text-2xl">+</button>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 text-lg"
          >
            <Play size={24} fill="currentColor" />
            ゲームをはじめる
          </button>
        </div>
      )}

      {!isOwner && (
        <div className="flex-1 flex items-center justify-center text-slate-500 animate-pulse text-center">
          オーナーがゲームを開始するのを<br/>待っています...
        </div>
      )}
    </div>
  );
};

export default Setup;
