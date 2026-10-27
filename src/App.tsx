import { useRef } from 'react';
import { GameBoard } from './components/GameBoard';
import { SetupScreen } from './components/SetupScreen';
import { withBotNames } from './game/names';
import type { PlayerConfig } from './game/types';
import { useGame } from './hooks/useGame';

export default function App() {
  const {
    state,
    error,
    thinking,
    gameId,
    ready,
    markReady,
    paused,
    setPaused,
    turnLeftMs,
    oneCardLeftMs,
    start,
    dispatch,
    quit,
  } = useGame();
  const lastConfig = useRef<PlayerConfig[] | null>(null);

  if (!state) {
    return (
      <SetupScreen
        onStart={(configs) => {
          lastConfig.current = configs;
          start(withBotNames(configs));
        }}
      />
    );
  }
  return (
    <GameBoard
      key={gameId}
      state={state}
      error={error}
      thinking={thinking}
      ready={ready}
      onReady={markReady}
      paused={paused}
      setPaused={setPaused}
      turnLeftMs={turnLeftMs}
      oneCardLeftMs={oneCardLeftMs}
      dispatch={dispatch}
      onRestart={() => lastConfig.current && start(withBotNames(lastConfig.current))}
      onMenu={quit}
    />
  );
}
