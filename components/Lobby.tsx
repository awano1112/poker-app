
import React, { useState } from 'react';
import { Users, Plus, LogIn, ChevronLeft, User } from 'lucide-react';

interface LobbyProps {
  onCreate: (initialChips: number, password?: string) => void;
  onJoin: (password?: string) => void;
  onBack: () => void;
  currentUser: { name: string };
}

const Lobby: React.FC<LobbyProps> = ({ onCreate, onJoin, onBack, currentUser }) => {
  const [initialChips, setInitialChips] = useState(1000);
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 justify-center overflow-y-auto">
      {/* Back Button & User Info */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors text-sm font-bold"
        >
          <ChevronLeft size={20} />
          名前を変更
        </button>
        <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
          <User size={14} className="text-green-500" />
          <span className="text-xs font-bold text-slate-300">{currentUser.name}</span>
        </div>
      </div>

      <div className="text-center pt-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">ルームを選択</h2>
        <p className="text-slate-400">共通の合言葉で友達と同じルームに入ります</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">共通の合言葉 (パスワード)</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="例: POKER123"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-xl font-mono focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
            />
          </div>

          {!isCreating ? (
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => onJoin(password)}
                className="flex items-center justify-center gap-3 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95"
              >
                <LogIn size={24} />
                この合言葉で入室
              </button>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-600 text-xs font-bold">OR</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center justify-center gap-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-4 rounded-xl transition-all active:scale-95 border border-slate-700/50"
              >
                <Plus size={24} />
                新しくルームを作る
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">初期持ちチップ</label>
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2000, 5000].map(val => (
                    <button
                      key={val}
                      onClick={() => setInitialChips(val)}
                      className={`py-2 rounded-lg font-bold border transition-all text-xs ${
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
                  className="flex-1 bg-slate-800 text-slate-200 font-bold py-4 rounded-xl active:scale-95 border border-slate-700"
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

      <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
        <Users size={14} />
        <span>ルームIDは合言葉と同じになります</span>
      </div>
    </div>
  );
};

export default Lobby;
