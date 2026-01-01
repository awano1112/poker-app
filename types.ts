
export enum GameStatus {
  LOBBY = 'LOBBY',
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  WINNER_SELECTION = 'WINNER_SELECTION'
}

export enum PlayerStatus {
  ACTIVE = 'ACTIVE',
  FOLDED = 'FOLDED',
  ALL_IN = 'ALL_IN',
  OUT = 'OUT'
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  bet: number;
  status: PlayerStatus;
  isOwner: boolean;
  position: number;
}

export interface GameState {
  roomId: string;
  password?: string;
  status: GameStatus;
  initialChips: number;
  bbAmount: number;
  players: Player[];
  pot: number;
  currentTurnIndex: number;
  dealerIndex: number;
  minBet: number;
  lastRaiseAmount: number;
  roundBets: number; // Total bets in the current sub-round
  street: 'Pre-flop' | 'Flop' | 'Turn' | 'River';
}

export interface AppState {
  user: { id: string; name: string } | null;
  gameState: GameState | null;
}
