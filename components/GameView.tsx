
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, GameStatus, PlayerStatus, Player } from '../types';
import { ChevronRight, Circle, Coins, User, Trophy, Info, X } from 'lucide-react';
import WinnerSelection from './WinnerSelection';

interface GameViewProps {
  gameState: GameState;
  updateGameState: (state: GameState) => void;
  currentUser: { id: string; name: string };
}

const GameView: React.FC<GameViewProps> = ({ gameState, updateGameState, currentUser }) => {
  const [isWinnerSelection, setIsWinnerSelection] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(gameState.minBet + gameState.lastRaiseAmount);

  const me = gameState.players.find(p => p.id === currentUser.id);
  const myTurn = gameState.players[gameState.currentTurnIndex]?.id === currentUser.id;
  const isOwner = me?.isOwner;

  // Feedback vibration
  const vibrate = useCallback(() => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  }, []);

  useEffect(() => {
    // Reset raise slider when it becomes your turn
    if (myTurn) {
      setRaiseAmount(gameState.minBet + gameState.lastRaiseAmount);
    }
  }, [myTurn, gameState.minBet, gameState.lastRaiseAmount]);

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
      const totalToBet = raiseAmount;
      const additional = totalToBet - currentPlayer.bet;
      
      newLastRaiseAmount = totalToBet - gameState.minBet;
      newMinBet = totalToBet;
      currentPlayer.chips -= additional;
      currentPlayer.bet += additional;
      newPot += additional;

      if (currentPlayer.chips === 0) {
        currentPlayer.status = PlayerStatus.ALL_IN;
      }
    }

    // Determine next player
    let nextIndex = (gameState.currentTurnIndex + 1) % newPlayers.length;
    let roundsCounted = 0;
    while (
      (newPlayers[nextIndex].status !== PlayerStatus.ACTIVE && 
       newPlayers[nextIndex].status !== PlayerStatus.ALL_IN) || 
      (type !== 'RAISE' && newPlayers[nextIndex].bet === newMinBet && newPlayers[nextIndex].status !== PlayerStatus.FOLDED)
    ) {
      if (roundsCounted > newPlayers.length) break;
      nextIndex = (nextIndex + 1) % newPlayers.length;
      roundsCounted++;
    }

    // Check if round is over
    const activePlayers = newPlayers.filter(p => p.status === PlayerStatus.ACTIVE);
    const allBetsEqual = newPlayers.filter(p => p.status === PlayerStatus.ACTIVE || p.status === PlayerStatus.ALL_IN)
                                   .every(p => p.bet === newMinBet || p.status === PlayerStatus.ALL_IN);
    
    // Only one player left
    const nonFoldedCount = newPlayers.filter(p => p.status !== PlayerStatus.FOLDED).length;
    
    if (nonFoldedCount <= 1 || (allBetsEqual && roundsCounted >= newPlayers.length)) {
      // Round over
      if (isOwner) {
        setIsWinnerSelection(true);
      }
      updateGameState({
        ...gameState,
        players: newPlayers,
        pot: newPot,
        minBet: newMinBet,
        lastRaiseAmount: newLastRaiseAmount,
        status: GameStatus.WINNER_SELECTION
      });
    } else {
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

  const nextStreet = (winners: string[]) => {
    // This is managed by WinnerSelection usually, but we could trigger it from here too
    // If winners selected, distribute pot and start new hand or move to next street
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
      // Simple logic: return leftover to first winner
      if (winners[0] === p.id) {
        chips += remainder;
      }
      return { 
        ...p, 
        bet: 0, 
        status: p.chips > 0 ? PlayerStatus.ACTIVE : PlayerStatus.OUT 
      };
    });

    const nextDealer = (gameState.dealerIndex + 1) % newPlayers.length;
    const sbIdx = (nextDealer + 1) % newPlayers.length;
    const bbIdx = (nextDealer + 2) % newPlayers.length;
    const sbAmount = Math.floor(gameState.bbAmount / 2);

    // Auto-apply blinds for next hand
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
        {/* Pot */}
        <div className="z-10 bg-black/40 backdrop-blur-md rounded-full px-8 py-4 border border-white/10 shadow-2xl flex flex-col items-center">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">TOTAL POT</span>
          <div className="flex items-center gap-2 text-3xl font-black text-yellow-400 font-mono">
            <Coins size={24} />
            {gameState.pot.toLocaleString()}
          </div>
        </div>

        {/* Players List in a Scrollable Area but positioned nicely */}
        <div className="w-full mt-8 max-w-sm space-y-2 overflow-y-auto max-h-[50vh] pr-2 scrollbar-hide">
          {gameState.players.map((player, idx) => {
            const isActive = gameState.currentTurnIndex === idx;
            const isMe = player.id === currentUser.id;
            const isDealer = gameState.dealerIndex === idx;
            
            return (
              <div 
                key={player.id}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${
                  isActive 
                  ? 'bg-green-500/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                  : 'bg-black/20 border-white/5'
                }`}
              >
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold relative overflow-hidden ${
                    player.status === PlayerStatus.FOLDED ? 'grayscale opacity-50 bg-slate-800' : 'bg-slate-700'
                  }`}>
                    {player.name[0]}
                    {isDealer && (
                      <div className="absolute -bottom-1 -right-1 bg-white text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm">D</div>
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute -inset-1 rounded-full border-2 border-green-500 animate-ping opacity-25"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold truncate ${isMe ? 'text-green-400' : 'text-slate-100'}`}>
                      {player.name}
                    </span>
                    {player.bet > 0 && (
                      <span className="text-yellow-400 font-mono font-bold text-sm bg-yellow-400/10 px-2 py-0.5 rounded-lg border border-yellow-400/20 flex items-center gap-1">
                        <Coins size={12} /> {player.bet}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Chips: <span className="text-slate-200">{player.chips.toLocaleString()}</span></span>
                    <span className={`font-bold ${
                      player.status === PlayerStatus.FOLDED ? 'text-slate-600' : 
                      player.status === PlayerStatus.ALL_IN ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {player.status === PlayerStatus.FOLDED ? 'FOLDED' : 
                       player.status === PlayerStatus.ALL_IN ? 'ALL IN' : 'IN GAME'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Section */}
      <div className="flex-[3] bg-slate-900 border-t border-slate-800 p-4 flex flex-col gap-4">
        {myTurn && gameState.status === GameStatus.PLAYING ? (
          <div className="flex-1 flex flex-col gap-4 animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">コールに必要な額</span>
                <span className="text-lg font-mono font-bold text-slate-200">
                  {Math.max(0, gameState.minBet - (me?.bet || 0))}
                </span>
              </div>
              <div className="h-full w-px bg-slate-700 mx-2"></div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">あなたの残りチップ</span>
                <span className="text-lg font-mono font-bold text-green-400">
                  {me?.chips.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAction('FOLD')}
                className="flex-1 bg-slate-800 text-slate-300 font-bold py-5 rounded-2xl active:bg-slate-700 transition-colors shadow-lg active:scale-95"
              >
                FOLD
              </button>
              <button
                onClick={() => handleAction('CHECK_CALL')}
                className="flex-[2] bg-green-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-green-900/20 active:bg-green-500 active:scale-95 transition-all text-lg"
              >
                {gameState.minBet === me?.bet ? 'CHECK' : `CALL ${Math.min(me?.chips || 0, gameState.minBet - (me?.bet || 0))}`}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
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
                disabled={me?.chips === 0}
                className="w-full bg-slate-100 text-slate-900 font-black py-4 rounded-2xl disabled:opacity-20 active:scale-95 transition-all"
              >
                RAISE TO {raiseAmount}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
            {gameState.status === GameStatus.WINNER_SELECTION ? (
              <div className="text-center">
                <Trophy size={48} className="text-amber-500 mx-auto mb-2 animate-bounce" />
                <h3 className="text-xl font-bold text-slate-200">ラウンド終了</h3>
                {isOwner && (
                  <button 
                    onClick={() => setIsWinnerSelection(true)}
                    className="mt-4 bg-amber-500 text-slate-900 font-bold px-8 py-3 rounded-full active:scale-95 transition-all shadow-lg"
                  >
                    勝者を選択
                  </button>
                )}
                {!isOwner && <p className="mt-2 text-sm">オーナーが勝者を決定しています...</p>}
              </div>
            ) : (
              <div className="text-center space-y-2 opacity-50">
                <Info size={32} className="mx-auto" />
                <p className="font-medium">
                  {gameState.players[gameState.currentTurnIndex]?.name}のアクション待ちです
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
