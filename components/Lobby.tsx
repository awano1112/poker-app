
import React, { useState } from 'react';
import { Users, Plus, LogIn } from 'lucide-react';

interface LobbyProps {
  onCreate: (initialChips: number, password?: string) => void;
  onJoin: (password?: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onCreate, onJoin }) => {
  const [initialChips, setInitialChips] = useState(1000);
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 justify-center overflow-y-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">ルームを選択</h2>
        <p className="text-slate-400">友達と同じ合言葉で入室するか、新しく作成してください</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">共通の合言葉</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="例: POKER123"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-xl font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {!isCreating ? (
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => onJoin(password)}
                className="flex items-center justify-center gap-3 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95"
              >
                <LogIn size={24} />
                入室する
              </button>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center justify-center gap-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-4 rounded-xl transition-all active:scale-95"
              >
                <Plus size={24} />
                新規作成
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">初期持ちチップ</label>
                <div className="flex gap-2">
                  {[500, 1000, 2000, 5000].map(val => (
                    <button
                      key={val}
                      onClick={() => setInitialChips(val)}
                      className={`flex-1 py-2 rounded-lg font-bold border transition-all ${
                        initialChips === val 
                        ? 'bg-green-600 border-green-500 text-white' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 bg-slate-800 text-slate-200 font-bold py-4 rounded-xl active:scale-95"
                >
                  戻る
                </button>
                <button
                  onClick={() => onCreate(initialChips, password)}
                  className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95"
                >
                  ルームを作成
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
        <Users size={16} />
        <span>現在 12,340 ユーザーがプレイ中</span>
      </div>
    </div>
  );
};

export default Lobby;
