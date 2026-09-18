/**
 * Echo Duel - Leaderboard & Points Table Manager
 * Persists player match records, calculates points, and maintains rankings.
 */

const STORAGE_KEY = 'echo_duel_leaderboard_v1';

export class LeaderboardManager {
  constructor() {
    this.records = this.loadRecords();
  }

  loadRecords() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {
      console.warn('Unable to load leaderboard from localStorage:', e);
    }
    // Return initial sample tournament entries if empty
    return [
      { id: '1', name: 'CyberBlade', difficulty: 'HARD', playerScore: 3, opponentScore: 1, won: true, bestReaction: 194, points: 420, date: 'Today' },
      { id: '2', name: 'SonicPulse', difficulty: 'MEDIUM', playerScore: 3, opponentScore: 2, won: true, bestReaction: 265, points: 310, date: 'Today' },
      { id: '3', name: 'EchoEcho', difficulty: 'EASY', playerScore: 3, opponentScore: 0, won: true, bestReaction: 340, points: 230, date: 'Yesterday' }
    ];
  }

  saveRecords() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
      }
    } catch (e) {
      console.warn('Unable to save leaderboard to localStorage:', e);
    }
  }

  calculatePoints(won, difficulty, bestReaction, playerScore, opponentScore) {
    let base = won ? 150 : 30;
    // Difficulty multiplier
    let diffBonus = 0;
    if (difficulty === 'HARD' || difficulty === 'TOUGH') diffBonus = 100;
    else if (difficulty === 'MEDIUM') diffBonus = 50;
    else diffBonus = 20;

    // Reaction speed bonus (faster reaction gives higher score)
    let speedBonus = 0;
    if (bestReaction && bestReaction > 0) {
      speedBonus = Math.max(0, Math.round((500 - bestReaction) * 0.5));
    }

    const roundBonus = playerScore * 25;
    return base + diffBonus + speedBonus + roundBonus;
  }

  recordMatch(entry) {
    const {
      name = 'Anonymous',
      difficulty = 'MEDIUM',
      playerScore = 0,
      opponentScore = 0,
      won = false,
      bestReaction = null
    } = entry;

    const points = this.calculatePoints(won, difficulty, bestReaction, playerScore, opponentScore);
    const dateStr = new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newEntry = {
      id: Date.now().toString(),
      name: name.trim() || 'Anonymous Duelist',
      difficulty: difficulty === 'HARD' ? 'TOUGH' : difficulty,
      playerScore,
      opponentScore,
      won,
      bestReaction: bestReaction || null,
      points,
      date: dateStr
    };

    this.records.unshift(newEntry);
    // Keep top 100 records
    if (this.records.length > 100) {
      this.records = this.records.slice(0, 100);
    }
    this.saveRecords();
    return newEntry;
  }

  getRecords(filterDifficulty = 'ALL') {
    let list = [...this.records];
    if (filterDifficulty !== 'ALL') {
      const target = filterDifficulty === 'HARD' ? 'TOUGH' : filterDifficulty;
      list = list.filter(r => r.difficulty === target || (target === 'TOUGH' && r.difficulty === 'HARD'));
    }
    // Sort descending by points, then by bestReaction ascending
    list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (a.bestReaction || 9999) - (b.bestReaction || 9999);
    });
    return list;
  }

  clearRecords() {
    this.records = [];
    this.saveRecords();
  }
}
