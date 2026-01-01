
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, GameStatus, PlayerStatus, Player } from '../types';
import { ChevronRight, Circle, Coins, User, Trophy, Info, X, ArrowRightCircle } from 'lucide-react';
import WinnerSelection from './WinnerSelection';

interface GameViewProps {
  gameState: GameState;
  updateGameState: (state: GameState) => void;
  currentUser: { id: string; name: string };
}

const GameView: React.FC<GameViewProps> = ({ gameState, updateGameState, currentUser }) => {
  const [isWinnerSelection, setIsWinnerSelection] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);

  const me = gameState.players.find(p => p.id === currentUser.id);
  const myTurn = gameState.players[gameState.currentTurnIndex]?.id === currentUser.id;
  const isOwner = me?.isOwner;

  // フィードバック用のバイブレーション
  const vibrate = useCallback(() => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  }, []);

  useEffect(() => {
    if (myTurn) {
      const minRaiseTo = gameState.minBet + gameState.lastRaiseAmount;
      setRaiseAmount(Math.min(me?.chips ? me.chips + me.bet : 0, minRaiseTo));
    }
  }, [myTurn, gameState.minBet, gameState.lastRaiseAmount, me?.chips, me?.bet]);

  const handleAction = (type: 'FOLD' | 'CHECK_CALL' | 'RAISE') => {
    vibrate();
    const newPlayers = [...gameState.players];
    const currentPlayer = newPlayers[gameState.currentTurnIndex];
    let newPot = gameState.pot;
    let newMinBet = gameState.minBet;
    let newLastRaiseAmount = gameState.lastRaiseAmount;

    if (type === 'FOLD') {
      currentPlayer.status = PlayerStatus.FOLDED;
    } else if (type === 'CHECK_CALL') {
      const callAmount = Math.min(currentPlayer.chips, gameState.minBet - currentPlayer.bet);
      currentPlayer.chips -= callAmount;
      currentPlayer.bet += callAmount;
      newPot += callAmount;
    } else if (type === 'RAISE') {
      const additional = raiseAmount - currentPlayer.bet;
      newLastRaiseAmount = raiseAmount - gameState.minBet;
      newMinBet = raiseAmount;
      currentPlayer.chips -= additional;
      currentPlayer.bet += additional;
      newPot += additional;

      if (currentPlayer.chips === 0) {
        currentPlayer.status = PlayerStatus.ALL_IN;
      }
    }

    // 次のプレイヤーを決定
    let nextIndex = (gameState.currentTurnIndex + 1) % newPlayers.length;
    const nonFoldedPlayers = newPlayers.filter(p => p.status !== PlayerStatus.FOLDED);
    const activePlayers = newPlayers.filter(p => p.status === PlayerStatus.ACTIVE);

    // 全員フォールドして1人になった場合
    if (nonFoldedPlayers.length === 1) {
      updateGameState({
        ...gameState,
        players: newPlayers,
        pot: newPot,
        status: GameStatus.WINNER_SELECTION
      });
      if (isOwner) setIsWinnerSelection(true);
      return;
    }

    // 全員のベット額が揃ったかチェック
    const allBetsMatched = nonFoldedPlayers.every(p => p.bet === newMinBet || p.status === PlayerStatus.ALL_IN);
    
    // ラウンド終了の判定
    // (レイズなしのチェック一周、または全員が同じ額をベット済み)
    const isRoundOver = allBetsMatched && (
      (type !== 'RAISE' && nextIndex === (gameState.dealerIndex + 1) % newPlayers.length) || 
      (type === 'RAISE' && false) // レイズされたらもう一周必要
    );

    // シンプルな判定ロジックに修正（全員がアクションを完了し、額が揃っている）
    const everyoneActed = newPlayers.every(p => 
      p.status === PlayerStatus.FOLDED || 
      p.status === PlayerStatus.ALL_IN || 
      (p.bet === newMinBet && p.status === PlayerStatus.ACTIVE)
    );

    if (everyoneActed) {
      // ラウンド終了、オーナーが次のストリートへ進めるようにステータスを変更
      updateGameState({
        ...gameState,
        players: newPlayers,
        pot: newPot,
        minBet: newMinBet,
        lastRaiseAmount: newLastRaiseAmount,
        status: GameStatus.WINNER_SELECTION // ここでは「勝者選択または次ラウンド」待機状態として流用
      });
    } else {
      // 次の有効なプレイヤーまで飛ばす
      while (newPlayers[nextIndex].status === PlayerStatus.FOLDED || newPlayers[nextIndex].status === PlayerStatus.ALL_IN) {
        nextIndex = (nextIndex + 1) % newPlayers.length;
      }
      
      updateGameState({
        ...gameState,
        players: newPlayers,
        currentTurnIndex: nextIndex,
        pot: newPot,
        minBet: newMinBet,
        lastRaiseAmount: newLastRaiseAmount
      });
    }
  };

  const advanceStreet = () => {
    vibrate();
    const streets: ('Pre-flop' | 'Flop' | 'Turn' | 'River')[] = ['Pre-flop', 'Flop', 'Turn', 'River'];
    const currentIdx = streets.indexOf(gameState.street);
    
    if (currentIdx === streets.length - 1) {
      // リバーが終わっていたら勝者選択へ
      setIsWinnerSelection(true);
      return;
    }

    // 次のストリートへ。ベットを0にリセット
    const newStreet = streets[currentIdx + 1];
    const newPlayers = gameState.players.map(p => ({ ...p, bet: 0 }));
    
    // 次のターンはディーラーの左隣から
    let nextIndex = (gameState.dealerIndex + 1) % newPlayers.length;
    while (newPlayers[nextIndex].status === PlayerStatus.FOLDED || newPlayers[nextIndex].status === PlayerStatus.ALL_IN) {
      nextIndex = (nextIndex + 1) % newPlayers.length;
    }

    updateGameState({
      ...gameState,
      status: GameStatus.PLAYING,
      street: newStreet,
      players: newPlayers,
      currentTurnIndex: nextIndex,
      minBet: 0,
      lastRaiseAmount: gameState.bbAmount
    });
  };

  const resetHand = (winners: string[]) => {
    const winnersCount = winners.length;
    const share = Math.floor(gameState.pot / winnersCount);
    const remainder = gameState.pot % winnersCount;

    const newPlayers = gameState.players.map(p => {
      let chips = p.chips;
      if (winners.includes(p.id)) {
        chips += share;
      }
      if (winners[0] === p.id) {
        chips += remainder;
      }
      return { 
        ...p, 
        bet: 0, 
        status: (p.chips + (winners.includes(p.id) ? share : 0)) > 0 ? PlayerStatus.ACTIVE : PlayerStatus.OUT 
      };
    });

    const nextDealer = (gameState.dealerIndex + 1) % newPlayers.length;
    const sbIdx = (nextDealer + 1) % newPlayers.length;
    const bbIdx = (nextDealer + 2) % newPlayers.length;
    const sbAmount = Math.floor(gameState.bbAmount / 2);

    // ブラインドの自動適用
    newPlayers[sbIdx].chips -= sbAmount;
    newPlayers[sbIdx].bet = sbAmount;
    newPlayers[bbIdx].chips -= gameState.bbAmount;
    newPlayers[bbIdx].bet = gameState.bbAmount;

    updateGameState({
      ...gameState,
      status: GameStatus.PLAYING,
      players: newPlayers,
      pot: sbAmount + gameState.bbAmount,
      dealerIndex: nextDealer,
      currentTurnIndex: (bbIdx + 1) % newPlayers.length,
      minBet: gameState.bbAmount,
      lastRaiseAmount: gameState.bbAmount,
      street: 'Pre-flop'
    });
    setIsWinnerSelection(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Table Section */}
      <div className="flex-[4] casino-gradient relative overflow-hidden flex flex-col items-center justify-center p-4">
        {/* Pot & Street Info */}
        <div className="z-10 flex flex-col items-center gap-2">
          <div className="bg-white/10 backdrop-blur-md px-4 py-1 rounded-full border border-white/20 text-[10px] font-black tracking-widest text-white/60 uppercase">
            {gameState.street}
          </div>
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl px-10 py-5 border border-white/10 shadow-2xl flex flex-col items-center min-w-[200px]">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">TOTAL POT</span>
            <div className="flex items-center gap-2 text-4xl font-black text-yellow-400 font-mono">
              <Coins size={28} />
              {gameState.pot.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="w-full mt-6 max-w-sm space-y-2 overflow-y-auto max-h-[45vh] pr-2 scrollbar-hide">
          {gameState.players.map((player, idx) => {
            const isActive = gameState.currentTurnIndex === idx && gameState.status === GameStatus.PLAYING;
            const isMe = player.id === currentUser.id;
            const isDealer = gameState.dealerIndex === idx;
            const isFolded = player.status === PlayerStatus.FOLDED;
            
            return (
              <div 
                key={player.id}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${
                  isActive 
                  ? 'bg-green-500/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-[1.02]' 
                  : isFolded ? 'bg-black/10 border-white/5 opacity-40' : 'bg-black/20 border-white/5'
                }`}
              >
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold relative ${
                    isFolded ? 'bg-slate-800' : 'bg-slate-700 shadow-inner'
                  }`}>
                    {player.name[0]}
                    {isDealer && (
                      <div className="absolute -bottom-1 -right-1 bg-white text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md">D</div>
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute -inset-1 rounded-full border-2 border-green-500 animate-ping opacity-25"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold truncate text-sm ${isMe ? 'text-green-400' : 'text-slate-100'}`}>
                      {player.name}
                    </span>
                    {player.bet > 0 && (
                      <span className="text-yellow-400 font-mono font-bold text-xs bg-yellow-400/10 px-2 py-0.5 rounded-lg border border-yellow-400/20 flex items-center gap-1 animate-in zoom-in-75">
                        <Coins size={10} /> {player.bet}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Chips: <span className="text-slate-200">{player.chips.toLocaleString()}</span></span>
                    <span className={`font-black ${
                      isFolded ? 'text-slate-600' : 
                      player.status === PlayerStatus.ALL_IN ? 'text-red-400' : 'text-slate-500'
                    }`}>
                      {isFolded ? 'FOLDED' : player.status === PlayerStatus.ALL_IN ? 'ALL IN' : 'IN GAME'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Section */}
      <div className="flex-[3] bg-slate-900 border-t border-slate-800 p-4 flex flex-col gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20">
        {myTurn && gameState.status === GameStatus.PLAYING ? (
          <div className="flex-1 flex flex-col gap-3 animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">TO CALL</span>
                <span className="text-xl font-mono font-black text-white">
                  {Math.max(0, gameState.minBet - (me?.bet || 0))}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-700 mx-2"></div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">YOUR STACK</span>
                <span className="text-xl font-mono font-black text-green-400">
                  {me?.chips.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAction('FOLD')}
                className="flex-1 bg-slate-800 text-slate-400 font-black py-5 rounded-2xl active:bg-slate-700 transition-all shadow-lg active:scale-95 border border-slate-700/50"
              >
                FOLD
              </button>
              <button
                onClick={() => handleAction('CHECK_CALL')}
                className="flex-[2] bg-green-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-green-900/20 active:bg-green-500 active:scale-95 transition-all text-lg border-b-4 border-green-800"
              >
                {gameState.minBet === me?.bet ? 'CHECK' : `CALL ${Math.min(me?.chips || 0, gameState.minBet - (me?.bet || 0))}`}
              </button>
            </div>

            <div className="space-y-2 mt-1">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-500 px-1">
                <span>RAISE TO</span>
                <span className="text-yellow-400 font-mono text-lg">{raiseAmount}</span>
              </div>
              <input
                type="range"
                min={gameState.minBet + gameState.lastRaiseAmount}
                max={me?.chips ? me.chips + me.bet : 0}
                step={gameState.bbAmount}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <button
                onClick={() => handleAction('RAISE')}
                disabled={me?.chips === 0 || (me?.chips || 0) + (me?.bet || 0) < gameState.minBet + gameState.lastRaiseAmount}
                className="w-full bg-slate-100 text-slate-900 font-black py-4 rounded-2xl disabled:opacity-20 active:scale-95 transition-all border-b-4 border-slate-300"
              >
                RAISE TO {raiseAmount}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
            {gameState.status === GameStatus.WINNER_SELECTION ? (
              <div className="text-center w-full max-w-xs space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-2xl">
                  <h3 className="text-lg font-black text-green-400 mb-1">ベッティング完了</h3>
                  <p className="text-xs text-slate-400">全員のベットが揃いました。</p>
                </div>
                
                {isOwner && (
                  <div className="grid grid-cols-1 gap-3">
                    {gameState.street !== 'River' && gameState.players.filter(p => p.status !== PlayerStatus.FOLDED).length > 1 ? (
                      <button 
                        onClick={advanceStreet}
                        className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        <ArrowRightCircle size={20} />
                        次のカードを配る ({gameState.street === 'Pre-flop' ? 'FLOP' : gameState.street === 'Flop' ? 'TURN' : 'RIVER'})
                      </button>
                    ) : null}
                    <button 
                      onClick={() => setIsWinnerSelection(true)}
                      className={`w-full font-black py-4 rounded-2xl active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 ${
                        gameState.street === 'River' || gameState.players.filter(p => p.status !== PlayerStatus.FOLDED).length === 1
                        ? 'bg-amber-500 text-slate-900 shadow-amber-900/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <Trophy size={20} />
                      勝者を選択して終了
                    </button>
                  </div>
                )}
                {!isOwner && (
                  <div className="animate-pulse flex flex-col items-center gap-2">
                    <Info size={24} />
                    <p className="text-sm">オーナーが次へ進めるのを待っています...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-3 opacity-50">
                <div className="w-12 h-12 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin mx-auto"></div>
                <p className="font-bold text-sm tracking-wide">
                  {gameState.players[gameState.currentTurnIndex]?.name}のアクション待ち...
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Winner Selection Modal Overlay */}
      {isWinnerSelection && (
        <WinnerSelection 
          gameState={gameState} 
          onClose={() => setIsWinnerSelection(false)} 
          onConfirm={resetHand} 
        />
      )}
    </div>
  );
};

export default GameView;
