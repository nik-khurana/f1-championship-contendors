/**
 * Formula 1 Interactive What-If Permutations & Monte Carlo Simulation Engine
 */
import { F1_POINTS } from './calculator.js';

export class RaceSimulator {
  constructor(initialStandings, remainingRaces) {
    this.initialStandings = initialStandings;
    this.remainingRaces = remainingRaces;
    // user custom predictions for each race: { [round]: { targetPos, leaderPos, targetFL, targetSprintPos, leaderSprintPos } }
    this.predictions = {};
    this.initDefaultPredictions();
  }

  initDefaultPredictions() {
    this.predictions = {};
    this.remainingRaces.forEach(race => {
      this.predictions[race.round] = {
        targetPos: 1,           // Default target driver P1
        leaderPos: 2,           // Default leader P2
        targetFL: false,
        targetSprintPos: race.hasSprint ? 1 : null,
        leaderSprintPos: race.hasSprint ? 2 : null
      };
    });
  }

  setRacePrediction(round, field, value) {
    if (!this.predictions[round]) {
      this.predictions[round] = {};
    }
    this.predictions[round][field] = value;
  }

  /**
   * Apply Preset Scenarios
   */
  applyPreset(presetName, targetDriverId, leaderDriverId) {
    this.remainingRaces.forEach(race => {
      const pred = this.predictions[race.round];
      if (!pred) return;

      if (presetName === 'sweep') {
        // Target wins everything, fastest lap, sprint wins
        pred.targetPos = 1;
        pred.targetFL = true;
        pred.leaderPos = 3;
        if (race.hasSprint) {
          pred.targetSprintPos = 1;
          pred.leaderSprintPos = 3;
        }
      } else if (presetName === 'leader_dnf') {
        // Leader suffers DNF / zero points, target wins
        pred.targetPos = 1;
        pred.targetFL = true;
        pred.leaderPos = 'DNF';
        if (race.hasSprint) {
          pred.targetSprintPos = 1;
          pred.leaderSprintPos = 'DNF';
        }
      } else if (presetName === 'p1_p2') {
        // Target wins, leader finishes second (worst case for target hunting leader)
        pred.targetPos = 1;
        pred.targetFL = false;
        pred.leaderPos = 2;
        if (race.hasSprint) {
          pred.targetSprintPos = 1;
          pred.leaderSprintPos = 2;
        }
      } else if (presetName === 'reset') {
        // Reset to default
        pred.targetPos = 1;
        pred.targetFL = false;
        pred.leaderPos = 2;
        if (race.hasSprint) {
          pred.targetSprintPos = 1;
          pred.leaderSprintPos = 2;
        }
      }
    });
  }

  /**
   * Calculates points awarded for a given position
   */
  getPointsForPos(pos) {
    if (pos === 'DNF' || pos === 'Out' || !pos) return 0;
    const p = parseInt(pos, 10);
    if (isNaN(p) || p < 1 || p > 10) return 0;
    return F1_POINTS.RACE[p - 1] || 0;
  }

  getSprintPointsForPos(pos) {
    if (pos === 'DNF' || pos === 'Out' || !pos) return 0;
    const p = parseInt(pos, 10);
    if (isNaN(p) || p < 1 || p > 8) return 0;
    return F1_POINTS.SPRINT[p - 1] || 0;
  }

  /**
   * Run simulation with current predictions
   */
  computeProjectedStandings(targetDriverId, leaderDriverId) {
    // Clone standings
    const standingsMap = new Map();
    this.initialStandings.forEach(s => {
      standingsMap.set(s.Driver.driverId, {
        driver: s.Driver,
        constructors: s.Constructors || [],
        initialPoints: parseFloat(s.points),
        projectedPoints: parseFloat(s.points),
        addedPoints: 0,
        wins: parseInt(s.wins || 0, 10)
      });
    });

    let clinchEvent = null;

    this.remainingRaces.forEach((race, raceIdx) => {
      const pred = this.predictions[race.round] || {};

      // Target points for this race
      let targetGained = this.getPointsForPos(pred.targetPos);
      if (pred.targetFL && targetGained > 0) targetGained += F1_POINTS.FASTEST_LAP;
      if (race.hasSprint && pred.targetSprintPos) {
        targetGained += this.getSprintPointsForPos(pred.targetSprintPos);
      }

      // Leader points for this race
      let leaderGained = this.getPointsForPos(pred.leaderPos);
      if (race.hasSprint && pred.leaderSprintPos) {
        leaderGained += this.getSprintPointsForPos(pred.leaderSprintPos);
      }

      const targetEntry = standingsMap.get(targetDriverId);
      const leaderEntry = standingsMap.get(leaderDriverId);

      if (targetEntry) {
        targetEntry.projectedPoints += targetGained;
        targetEntry.addedPoints += targetGained;
        if (parseInt(pred.targetPos, 10) === 1) targetEntry.wins += 1;
      }

      if (leaderEntry && targetDriverId !== leaderDriverId) {
        leaderEntry.projectedPoints += leaderGained;
        leaderEntry.addedPoints += leaderGained;
        if (parseInt(pred.leaderPos, 10) === 1) leaderEntry.wins += 1;
      }

      // Check if title has been mathematically clinched at this round
      const currentRemaining = this.remainingRaces.slice(raceIdx + 1).reduce((acc, r) => 
        acc + (r.hasSprint ? F1_POINTS.MAX_RACE_WEEKEND_SPRINT : F1_POINTS.MAX_RACE_WEEKEND_STANDARD), 0);

      const currentSorted = Array.from(standingsMap.values()).sort((a, b) => b.projectedPoints - a.projectedPoints);
      const leaderNow = currentSorted[0];
      const p2Now = currentSorted[1];

      if (!clinchEvent && (leaderNow.projectedPoints - p2Now.projectedPoints) > currentRemaining) {
        clinchEvent = {
          champion: leaderNow.driver,
          round: race.round,
          raceName: race.raceName,
          circuitName: race.circuitName,
          leadMargin: leaderNow.projectedPoints - p2Now.projectedPoints
        };
      }
    });

    const finalStandings = Array.from(standingsMap.values()).sort((a, b) => {
      if (b.projectedPoints !== a.projectedPoints) {
        return b.projectedPoints - a.projectedPoints;
      }
      return b.wins - a.wins; // tie breaker on countback
    });

    return {
      standings: finalStandings,
      clinchEvent,
      champion: finalStandings[0]
    };
  }

  /**
   * Monte Carlo probabilistic simulation (2,500 iterations)
   * Calculates realistic championship probability % for every driver
   */
  runMonteCarlo(simulationsCount = 2500) {
    const contenders = this.initialStandings.filter(s => parseFloat(s.points) > 0);
    const winsTracker = {};
    contenders.forEach(c => { winsTracker[c.Driver.driverId] = 0; });

    // Grid weights based on current points (performance proxy)
    const totalPoints = contenders.reduce((sum, c) => sum + parseFloat(c.points), 0);
    const weights = contenders.map(c => ({
      id: c.Driver.driverId,
      weight: (parseFloat(c.points) / totalPoints)
    }));

    for (let i = 0; i < simulationsCount; i++) {
      const simPoints = {};
      contenders.forEach(c => { simPoints[c.Driver.driverId] = parseFloat(c.points); });

      this.remainingRaces.forEach(race => {
        // Simulate race finishes using weighted probability
        const shuffled = [...weights].map(w => ({
          id: w.id,
          score: w.weight * (0.6 + Math.random() * 0.8) // form + variance
        })).sort((a, b) => b.score - a.score);

        // Top 10 award points
        shuffled.slice(0, 10).forEach((entry, idx) => {
          let pts = F1_POINTS.RACE[idx] || 0;
          if (idx === 0) pts += F1_POINTS.FASTEST_LAP; // winner bonus
          simPoints[entry.id] = (simPoints[entry.id] || 0) + pts;
        });

        // Sprint simulation
        if (race.hasSprint) {
          shuffled.slice(0, 8).forEach((entry, idx) => {
            const pts = F1_POINTS.SPRINT[idx] || 0;
            simPoints[entry.id] = (simPoints[entry.id] || 0) + pts;
          });
        }
      });

      // Find winner of this simulated season
      let maxPts = -1;
      let winnerId = null;
      Object.entries(simPoints).forEach(([id, pts]) => {
        if (pts > maxPts) {
          maxPts = pts;
          winnerId = id;
        }
      });

      if (winnerId && winsTracker[winnerId] !== undefined) {
        winsTracker[winnerId] += 1;
      }
    }

    // Convert to percentages
    const results = Object.entries(winsTracker).map(([driverId, wins]) => {
      const driverObj = contenders.find(c => c.Driver.driverId === driverId);
      const probability = ((wins / simulationsCount) * 100);
      return {
        driver: driverObj.Driver,
        constructors: driverObj.Constructors,
        points: parseFloat(driverObj.points),
        winsCount: wins,
        probability: probability.toFixed(1)
      };
    }).sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

    return results;
  }
}
