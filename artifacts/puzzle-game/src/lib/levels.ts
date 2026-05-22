// artifacts/puzzle-game/src/lib/levels.ts
// 200 deterministic levels using seeded shuffle

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Ultra Hard';

export interface Level {
  number: number;       // 1-200
  difficulty: Difficulty;
  tier: number;         // 1-4
  par: number;          // expected good move count for 3 stars
  shuffleDepth: number; // how many random moves to scramble
}

// Level definitions
export function getLevel(num: number): Level {
  if (num <= 50) {
    return {
      number: num,
      difficulty: 'Easy',
      tier: 1,
      par: 20 + num,
      shuffleDepth: 15 + num * 2,
    };
  } else if (num <= 100) {
    return {
      number: num,
      difficulty: 'Medium',
      tier: 2,
      par: 40 + (num - 50),
      shuffleDepth: 60 + (num - 50) * 3,
    };
  } else if (num <= 150) {
    return {
      number: num,
      difficulty: 'Hard',
      tier: 3,
      par: 80 + (num - 100),
      shuffleDepth: 150 + (num - 100) * 4,
    };
  } else {
    return {
      number: num,
      difficulty: 'Ultra Hard',
      tier: 4,
      par: 150 + (num - 150) * 2,
      shuffleDepth: 350 + (num - 150) * 5,
    };
  }
}

export function getLevelsForDifficulty(difficulty: Difficulty): Level[] {
  const levels: Level[] = [];
  for (let i = 1; i <= 200; i++) {
    const l = getLevel(i);
    if (l.difficulty === difficulty) levels.push(l);
  }
  return levels;
}

// Seeded random number generator (Mulberry32)
function mulberry32(seed: number) {
  return function() {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];

function isSolvable(board: number[]): boolean {
  let inv = 0;
  const flat = board.filter(x => x !== 0);
  for (let i = 0; i < flat.length; i++)
    for (let j = i + 1; j < flat.length; j++)
      if (flat[i] > flat[j]) inv++;
  const emptyRow = Math.floor(board.indexOf(0) / 4);
  return emptyRow % 2 === 0 ? inv % 2 === 1 : inv % 2 === 0;
}

// Generate board for a specific level number (deterministic)
export function generateLevelBoard(levelNum: number): number[] {
  const rng = mulberry32(levelNum * 12345 + 67890);
  const level = getLevel(levelNum);
  
  // Start solved, then make shuffleDepth random valid moves
  let board = [...SOLVED];
  let emptyIdx = board.indexOf(0);
  let lastMove = -1;
  
  for (let step = 0; step < level.shuffleDepth; step++) {
    const row = Math.floor(emptyIdx / 4);
    const col = emptyIdx % 4;
    
    // Valid neighbors (up, down, left, right)
    const neighbors = [];
    if (row > 0) neighbors.push(emptyIdx - 4);
    if (row < 3) neighbors.push(emptyIdx + 4);
    if (col > 0) neighbors.push(emptyIdx - 1);
    if (col < 3) neighbors.push(emptyIdx + 1);
    
    // Filter out last move to avoid immediate undo
    const filtered = neighbors.filter(n => n !== lastMove);
    const candidates = filtered.length > 0 ? filtered : neighbors;
    
    const chosen = candidates[Math.floor(rng() * candidates.length)];
    lastMove = emptyIdx;
    [board[emptyIdx], board[chosen]] = [board[chosen], board[emptyIdx]];
    emptyIdx = chosen;
  }
  
  // Ensure not accidentally solved
  if (board.join(',') === SOLVED.join(',')) {
    [board[0], board[1]] = [board[1], board[0]];
    if (!isSolvable(board)) [board[0], board[1]] = [board[1], board[0]];
  }
  
  return board;
}

// Get difficulty color
export function getDifficultyColor(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'Easy': return '#22c55e';
    case 'Medium': return '#f59e0b';
    case 'Hard': return '#e94560';
    case 'Ultra Hard': return '#8b5cf6';
  }
}

// Get a hint: return the index of the tile that should move next (simple heuristic — move toward goal)
// Returns -1 if already solved
export function getHintMove(board: number[]): number {
  if (board.join(',') === SOLVED.join(',')) return -1;
  const emptyIdx = board.indexOf(0);
  const emptyRow = Math.floor(emptyIdx / 4);
  const emptyCol = emptyIdx % 4;
  
  // Find a misplaced tile adjacent to the empty space
  const neighbors = [];
  if (emptyRow > 0) neighbors.push(emptyIdx - 4);
  if (emptyRow < 3) neighbors.push(emptyIdx + 4);
  if (emptyCol > 0) neighbors.push(emptyIdx - 1);
  if (emptyCol < 3) neighbors.push(emptyIdx + 1);
  
  // Prefer neighbors whose tile is misplaced (not in target position)
  const misplaced = neighbors.filter(idx => {
    const tile = board[idx];
    return tile !== 0 && tile !== idx + 1;
  });
  
  if (misplaced.length > 0) return misplaced[0];
  return neighbors[0]; // Fallback
}
