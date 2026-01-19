
import React, { useState, useEffect, useRef } from 'react';
import { GamePhase, GameState, Round } from './types';
import { generateLocations, generateStreetViewImage } from './services/gemini';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    currentRoundIndex: 0,
    rounds: [],
    phase: GamePhase.START,
    score: 0,
    timeLeft: 30
  });

  const [loadingMsg, setLoadingMsg] = useState("");
  const prefetchActive = useRef(false);

  useEffect(() => {
    let timer: any;
    if (gameState.phase === GamePhase.QUIZ && gameState.timeLeft > 0) {
      timer = setInterval(() => setGameState(s => ({ ...s, timeLeft: s.timeLeft - 1 })), 1000);
    } else if (gameState.phase === GamePhase.QUIZ && gameState.timeLeft === 0) {
      handleOptionSelect(-1); // Time out
    }
    return () => clearInterval(timer);
  }, [gameState.phase, gameState.timeLeft]);

  // Фоновая загрузка остальных изображений
  const prefetchImages = async (rounds: Round[]) => {
    if (prefetchActive.current) return;
    prefetchActive.current = true;

    for (let i = 1; i < rounds.length; i++) {
      // Загружаем только если еще нет картинки
      if (!rounds[i].imageUrl) {
        try {
          const img = await generateStreetViewImage(rounds[i].location);
          setGameState(prev => {
            const newRounds = [...prev.rounds];
            if (newRounds[i]) {
              newRounds[i].imageUrl = img;
            }
            return { ...prev, rounds: newRounds };
          });
        } catch (e) {
          console.error(`Failed to prefetch image for round ${i}`, e);
        }
      }
    }
    prefetchActive.current = false;
  };

  const startGame = async () => {
    setGameState(s => ({ ...s, phase: GamePhase.LOADING_ROUND }));
    setLoadingMsg("Ищем интересные уголки планеты...");
    try {
      const locs = await generateLocations();
      setLoadingMsg(`Готовим первый раунд...`);
      
      // Сначала создаем пустые раунды
      const initialRounds: Round[] = locs.map((l) => ({
        location: l,
        selectedOptionIndex: null,
        imageUrl: ''
      }));

      // Загружаем только ПЕРВОЕ изображение для быстрого старта
      const firstImg = await generateStreetViewImage(locs[0]);
      initialRounds[0].imageUrl = firstImg;

      setGameState({
        currentRoundIndex: 0,
        rounds: initialRounds,
        phase: GamePhase.QUIZ,
        score: 0,
        timeLeft: 30
      });

      // Запускаем фоновую загрузку остальных
      prefetchImages(initialRounds);
    } catch (e) {
      setLoadingMsg("Ошибка загрузки. Попробуйте еще раз.");
    }
  };

  const handleOptionSelect = (index: number) => {
    const currentRound = gameState.rounds[gameState.currentRoundIndex];
    const isCorrect = index === currentRound.location.correctOptionIndex;
    
    const newRounds = [...gameState.rounds];
    newRounds[gameState.currentRoundIndex].selectedOptionIndex = index;

    setGameState(s => ({
      ...s,
      rounds: newRounds,
      phase: GamePhase.RESULT,
      score: isCorrect ? s.score + 1 : s.score
    }));
  };

  const nextRound = async () => {
    const nextIdx = gameState.currentRoundIndex + 1;
    if (nextIdx >= gameState.rounds.length) {
      setGameState(s => ({ ...s, phase: GamePhase.SUMMARY }));
      return;
    }

    // Если картинка уже готова (из предзагрузки), переходим мгновенно
    if (gameState.rounds[nextIdx].imageUrl) {
      setGameState(s => ({
        ...s,
        currentRoundIndex: nextIdx,
        phase: GamePhase.QUIZ,
        timeLeft: 30
      }));
    } else {
      // Если еще не готова, показываем лоадер и ждем именно её
      setGameState(s => ({ ...s, phase: GamePhase.LOADING_ROUND }));
      setLoadingMsg(`Секунду, проявляем фото (${nextIdx + 1}/10)...`);
      
      try {
        const img = await generateStreetViewImage(gameState.rounds[nextIdx].location);
        setGameState(prev => {
          const newRounds = [...prev.rounds];
          newRounds[nextIdx].imageUrl = img;
          return {
            ...prev,
            rounds: newRounds,
            currentRoundIndex: nextIdx,
            phase: GamePhase.QUIZ,
            timeLeft: 30
          };
        });
      } catch {
        // В случае ошибки пробуем перепрыгнуть или повторить
        nextRound(); 
      }
    }
  };

  const currentRound = gameState.rounds[gameState.currentRoundIndex];

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* HUD */}
      {(gameState.phase === GamePhase.QUIZ || gameState.phase === GamePhase.RESULT) && (
        <div className="fixed top-6 left-0 right-0 z-50 flex justify-center gap-4 px-4 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-xl px-8 py-3 rounded-full border border-slate-700 flex items-center gap-12 shadow-2xl pointer-events-auto">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center">Раунд</span>
              <span className="text-xl font-black text-white">{gameState.currentRoundIndex + 1}/10</span>
            </div>
            {gameState.phase === GamePhase.QUIZ && (
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Время</span>
                <span className={`text-2xl font-black ${gameState.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                  {gameState.timeLeft}с
                </span>
              </div>
            )}
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center">Счет</span>
              <span className="text-xl font-black text-white">{gameState.score}</span>
            </div>
          </div>
        </div>
      )}

      <div className="w-full h-full max-w-5xl flex flex-col gap-6">
        {gameState.phase === GamePhase.START && (
          <div className="flex flex-col items-center gap-8 text-center py-20">
            <div className="w-32 h-32 bg-indigo-600 rounded-3xl rotate-12 flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.4)]">
              <span className="text-6xl font-black text-white">?</span>
            </div>
            <h1 className="text-7xl font-black text-white tracking-tighter">Geo<span className="text-indigo-500">Quiz</span></h1>
            <p className="text-slate-400 text-xl max-w-md">Где было сделано это фото? Выбери один из четырех вариантов. Время ограничено!</p>
            <button onClick={startGame} className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-5 rounded-2xl text-2xl font-black transition-all shadow-xl hover:scale-105 active:scale-95">
              Начать игру
            </button>
          </div>
        )}

        {gameState.phase === GamePhase.LOADING_ROUND && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="w-20 h-20 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-2xl font-bold text-slate-300 animate-pulse">{loadingMsg}</p>
          </div>
        )}

        {(gameState.phase === GamePhase.QUIZ || gameState.phase === GamePhase.RESULT) && (
          <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">
            {/* Image Area */}
            <div className="relative flex-1 rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl bg-slate-900 min-h-[300px]">
              <img 
                src={currentRound?.imageUrl} 
                className="w-full h-full object-cover transition-opacity duration-700" 
                alt="Geography Quiz"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              
              {gameState.phase === GamePhase.RESULT && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in zoom-in-95 duration-300">
                  <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-3xl text-center max-w-sm w-full mx-4">
                     <p className="text-slate-500 uppercase text-xs font-bold tracking-widest mb-1">Правильный ответ:</p>
                     <h2 className="text-3xl font-black text-white mb-1">{currentRound.location.options[currentRound.location.correctOptionIndex]}</h2>
                     <p className="text-indigo-400 font-bold mb-6 italic">{currentRound.location.name}</p>
                     <button 
                        onClick={nextRound}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold text-xl shadow-lg transition-transform active:scale-95"
                     >
                       Далее →
                     </button>
                  </div>
                </div>
              )}
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-auto">
              {currentRound?.location.options.map((option, idx) => {
                let btnClass = "bg-slate-900 hover:bg-slate-800 text-white border-slate-700";
                
                if (gameState.phase === GamePhase.RESULT) {
                  const isCorrect = idx === currentRound.location.correctOptionIndex;
                  const isSelected = idx === currentRound.selectedOptionIndex;
                  
                  if (isCorrect) {
                    btnClass = "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]";
                  } else if (isSelected && !isCorrect) {
                    btnClass = "bg-rose-600 border-rose-400 text-white";
                  } else {
                    btnClass = "bg-slate-900 text-slate-500 border-slate-800 opacity-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={gameState.phase === GamePhase.RESULT}
                    onClick={() => handleOptionSelect(idx)}
                    className={`flex items-center p-6 rounded-2xl border-2 text-xl font-bold transition-all text-left group ${btnClass} ${gameState.phase === GamePhase.QUIZ ? 'hover:scale-[1.01] active:scale-95' : ''}`}
                  >
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 text-sm font-black transition-colors ${gameState.phase === GamePhase.QUIZ ? 'bg-slate-800 text-slate-400 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-black/20'}`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {gameState.phase === GamePhase.SUMMARY && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-10 py-10 animate-in slide-in-from-bottom-10 duration-700">
            <div>
              <h1 className="text-6xl font-black text-white mb-4 tracking-tight">Игра окончена!</h1>
              <p className="text-2xl text-slate-400">Твой итоговый результат:</p>
              <div className="mt-6 flex items-baseline justify-center gap-2">
                <span className="text-9xl font-black text-indigo-500 tracking-tighter">{gameState.score}</span>
                <span className="text-4xl font-bold text-slate-700">/ 10</span>
              </div>
              <p className="mt-4 text-xl font-medium text-slate-300">
                {gameState.score >= 8 ? '🌎 Ты настоящий эксперт!' : gameState.score >= 5 ? '🗺️ Неплохо, но есть куда расти.' : '🧭 Пора открывать атлас!'}
              </p>
            </div>
            
            <button 
              onClick={() => window.location.reload()} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-16 py-6 rounded-3xl text-3xl font-black shadow-2xl hover:scale-105 transition-transform active:scale-95"
            >
              Сыграть ещё раз
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
