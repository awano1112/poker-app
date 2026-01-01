
import React, { useState } from 'react';
import { GameState, PlayerStatus } from '../types';
import { Trophy, Check, X } from 'lucide-react';

interface WinnerSelectionProps {
  gameState: GameState;
  onClose: () => void;
  onConfirm: (winnerIds: string[]) => void;
}

const WinnerSelection: React.FC<WinnerSelectionProps> = ({ gameState, onClose, onConfirm }) => {
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  
  const eligiblePlayers = gameState.players.filter(p => p.status !== PlayerStatus.FOLDED);

  const toggleWinner = (id: string) => {
    setSelectedWinners(prev => 
      prev.includes(id) ? prev.filter(wid => wid !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
              <Trophy size={20} className="text-slate-900" />
            </div>
            <h3 className="text-xl font-bold">勝者を選択</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-slate-400 text-sm">
            今回のポット <span className="text-yellow-400 font-bold font-mono">{gameState.pot}</span> を獲得するプレイヤーを選択してください。複数選択した場合は等分されます。
          </p>

          <div className="space-y-2">
            {eligiblePlayers.map(player => (
              <button
                key={player.id}
                onClick={() => toggleWinner(player.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                  selectedWinners.includes(player.id)
                  ? 'bg-amber-500/10 border-amber-500'
                  : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold bg-slate-700`}>
                    {player.name[0]}
                  </div>
                  <div className="text-left">
                    <div className="font-bold">{player.name}</div>
                    <div className="text-xs text-slate-500">Chips: {player.chips}</div>
                  </div>
                </div>
                {selectedWinners.includes(player.id) && (
                  <div className="bg-amber-500 rounded-full p-1 text-slate-900">
                    <Check size={16} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-800">
          <button
            onClick={() => onConfirm(selectedWinners)}
            disabled={selectedWinners.length === 0}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-5 rounded-2xl shadow-xl shadow-green-900/20 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale"
          >
            獲得を確定する
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerSelection;
