
import React, { useState, useEffect } from 'react';
import { GameStatus, Player, GameState, PlayerStatus } from './types';
import { useSyncState } from './hooks/useSyncState';
import Lobby from './components/Lobby';
import Setup from './components/Setup';
import GameView from './components/GameView';
import { Trophy, Wifi, WifiOff } from 'lucide-react';

const App: React.FC = () => {
  const { gameState, updateGameState, fetchRoom, isOnline } = useSyncState();
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('poker_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (name: string) => {
    const user = { id: Math.random().toString(36).substr(2, 9), name };
    setCurrentUser(user);
    localStorage.setItem('poker_user', JSON.stringify(user));
  };

  const createRoom = (initialChips: number, password?: string) => {
    if (!currentUser) return;
    const newGameState: GameState = {
      roomId: Math.random().toString(36).substr(2, 6).toUpperCase(),
      password,
      status: GameStatus.SETUP,
      initialChips,
      bbAmount: 20,
      players: [{
        id: currentUser.id,
        name: currentUser.name,
        chips: initialChips,
        bet: 0,
        status: PlayerStatus.ACTIVE,
        isOwner: true,
        position: 0
      }],
      pot: 0,
      currentTurnIndex: 0,
      dealerIndex: 0,
      minBet: 0,
      lastRaiseAmount: 20,
      roundBets: 0,
      street: 'Pre-flop'
    };
    updateGameState(newGameState);
  };

  const joinRoom = async (password?: string) => {
    if (!currentUser) return;
    
    // 入室前に入力された合言葉（ルームIDとして扱う）でルームを検索
    if (!password) {
      alert("合言葉を入力してください。");
      return;
    }

    setIsJoining(true);
    const targetRoomId = password.toUpperCase();
    const remoteState = await fetchRoom(targetRoomId);
    setIsJoining(false);

    if (!remoteState) {
      alert("ルームが見つかりません。合言葉（ルームID）を確認してください。");
      return;
    }

    if (remoteState.password && remoteState.password !== password) {
      // 実際にはパスワードとIDを分ける設計が望ましいですが、
      // ここではパスワード自体をIDとして検索しています
    }
    
    // 既に参加している場合は何もしない
    if (remoteState.players.find(p => p.id === currentUser.id)) return;

    const newPlayers = [...remoteState.players, {
      id: currentUser.id,
      name: currentUser.name,
      chips: remoteState.initialChips,
      bet: 0,
      status: PlayerStatus.ACTIVE,
      isOwner: false,
      position: remoteState.players.length
    }];

    updateGameState({ ...remoteState, players: newPlayers });
  };

  const leaveRoom = () => {
    if (!currentUser || !gameState) return;
    const me = gameState.players.find(p => p.id === currentUser.id);
    if (me?.isOwner) {
      if (confirm("オーナーが退出するとルームが削除される可能性があります。よろしいですか？")) {
        updateGameState(null);
      }
    } else {
      const newPlayers = gameState.players.filter(p => p.id !== currentUser.id);
      updateGameState({ ...gameState, players: newPlayers });
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100">
        <Trophy size={64} className="text-yellow-500 mb-6" />
        <h1 className="text-3xl font-bold mb-8">Poker Chip Master</h1>
        <div className="w-full max-w-sm space-y-4">
          <input
            type="text"
            placeholder="あなたの表示名"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLogin((e.target as HTMLInputElement).value);
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input') as HTMLInputElement;
              if (input.value) handleLogin(input.value);
            }}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95"
          >
            はじめる
          </button>
        </div>
        <div className="mt-8 flex items-center gap-2 text-slate-500 text-xs">
          {isOnline ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-amber-500" />}
          <span>{isOnline ? 'Online Sync Enabled' : 'Local Mode Only'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden select-none">
      {isJoining && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-bold text-green-500">ルームを探しています...</p>
          </div>
        </div>
      )}
      {!gameState ? (
        <Lobby onJoin={joinRoom} onCreate={createRoom} />
      ) : gameState.status === GameStatus.SETUP ? (
        <Setup 
          gameState={gameState} 
          updateGameState={updateGameState} 
          currentUser={currentUser}
          onLeave={leaveRoom}
        />
      ) : (
        <GameView 
          gameState={gameState} 
          updateGameState={updateGameState} 
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default App;
