
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GameState } from '../types';

const STORAGE_KEY = 'poker_chip_master_state';

// 環境変数は Vite/Vercel で設定
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const useSyncState = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const localChannelRef = useRef<BroadcastChannel | null>(null);
  const stateRef = useRef<GameState | null>(null);

  // 同一ブラウザ内の同期用 (BroadcastChannel)
  useEffect(() => {
    localChannelRef.current = new BroadcastChannel('poker_local_sync');
    localChannelRef.current.onmessage = (event) => {
      if (event.data === null || event.data) {
        setGameState(event.data);
        stateRef.current = event.data;
      }
    };
    return () => localChannelRef.current?.close();
  }, []);

  // Supabaseからのリアルタイム購読
  useEffect(() => {
    if (!supabase || !gameState?.roomId) return;

    const channel = supabase
      .channel(`room:${gameState.roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE すべて監視
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${gameState.roomId}`,
        },
        (payload) => {
          // payload.new を any にキャストして TypeScript エラーを回避
          const newState = (payload.new as any)?.state as GameState | undefined;
          
          // 無限ループ防止のため内容が異なる場合のみ更新
          if (newState && JSON.stringify(newState) !== JSON.stringify(stateRef.current)) {
            setGameState(newState);
            stateRef.current = newState;
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [gameState?.roomId]);

  const updateGameState = useCallback(async (newState: GameState | null) => {
    setGameState(newState);
    stateRef.current = newState;
    
    // 1. ローカルストレージに保存
    if (newState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    // 2. 同一ブラウザの別タブに通知
    localChannelRef.current?.postMessage(newState);

    // 3. Supabaseに送信
    if (supabase && newState) {
      const { error } = await supabase
        .from('rooms')
        .upsert(
          { id: newState.roomId, state: newState, updated_at: new Date() },
          { onConflict: 'id' }
        );
      
      if (error) {
        console.error('Supabase Sync Error:', error.message);
      }
    }
  }, []);

  // 特定のルームを取得する機能
  const fetchRoom = useCallback(async (roomId: string): Promise<GameState | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('rooms')
      .select('state')
      .eq('id', roomId.toUpperCase().trim())
      .maybeSingle();
    
    if (error) {
      console.error('Fetch Room Error:', error.message);
      return null;
    }
    if (!data) return null;
    
    const state = data.state as GameState;
    setGameState(state);
    stateRef.current = state;
    return state;
  }, []);

  return { gameState, updateGameState, fetchRoom, isOnline: !!supabase };
};
