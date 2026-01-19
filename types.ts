
export enum GamePhase {
  START = 'START',
  LOADING_ROUND = 'LOADING_ROUND',
  QUIZ = 'QUIZ',
  RESULT = 'RESULT',
  SUMMARY = 'SUMMARY'
}

export interface Location {
  lat: number;
  lng: number;
  name: string;
  options: string[];
  correctOptionIndex: number;
  description: string;
}

export interface Round {
  location: Location;
  selectedOptionIndex: number | null;
  imageUrl: string;
}

export interface GameState {
  currentRoundIndex: number;
  rounds: Round[];
  phase: GamePhase;
  score: number;
  timeLeft: number;
}
