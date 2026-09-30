/**
 * Formula 1 Multi-Contender What-If Permutations & Monte Carlo Simulation Engine
 */
import { F1_POINTS } from './calculator.js';

export class RaceSimulator {
  constructor(initialStandings, remainingRaces) {
    this.initialStandings = initialStandings;
    this.remainingRaces = remainingRaces;
    // user custom predictions: { [round]: { driverPositions: { [driverId]: pos }, fastestLapDriverId: null, sprintPositions: { [driverId]: pos } } }
    this.predictions = {};
    this.initDefaultPredictions();
  }

  initDefaultPredictions() {
    this.predictions = {};
    const topContenders = this.initialStandings.slice(0, 6);

    this.remainingRaces.forEach(race => {
      const driverPositions = {};
      const sprintPositions = {};

      topContenders.forEach((c, idx) => {
        driverPositions[c.Driver.driverId] = idx + 1; // P1, P2, P3, P4, etc.
        if (race.hasSprint) {
          sprintPositions[c.Driver.driverId] = idx + 1;
        }
      });

      this.predictions[race.round] = {
        driverPositions,
        sprintPositions,
        fastestLapDriverId: topContenders[0]?.Driver.driverId || null
      };
    });
  }

  setDriverRacePosition(round, driverId, position) {
    if (!this.predictions[round]) {
      this.predictions[round] = { driverPositions: {}, sprintPositions: {} };
    }
    this.predictions[round].driverPositions[driverId] = position;
  }

  setFastestLapDriver(round, driverId) {
    if (!this.predictions[round]) {
      this.predictions[round] = { driverPositions: {}, sprintPositions: {} };
    }
    this.predictions[round].fastestLapDriverId = driverId;
  }

  /**
   * Apply Multi-Contender Preset Scenarios
   */
  applyPreset(presetName, targetDriverId, contenders) {
    const rivalContenders = contenders.filter(c => c.Driver.driverId !== targetDriverId);

    this.remainingRaces.forEach((race, raceIdx) => {
      const pred = this.predictions[race.round];
      if (!pred) return;

      if (presetName === 'sweep_distributed') {
        // Target wins every race (P1)
        pred.driverPositions[targetDriverId] = 1;
        pred.fastestLapDriverId = targetDriverId;

        // Rivals take points off each other by rotating P2, P3, P4, P5!
        rivalContenders.forEach((rival, rivalIdx) => {
          // Rotate finish based on race index so no single rival monopolizes P2
          const rotatedPos = 2 + ((rivalIdx + raceIdx) % rivalContenders.length);
          pred.driverPositions[rival.Driver.driverId] = Math.min(10, rotatedPos);
        });
      } else if (presetName === 'rival_threat_p2') {
        // Target wins (P1), but highest rival takes P2 every race
        pred.driverPositions[targetDriverId] = 1;
        pred.fastestLapDriverId = targetDriverId;

        if (rivalContenders[0]) {
          pred.driverPositions[rivalContenders[0].Driver.driverId] = 2; // P2 lock
        }
        rivalContenders.slice(1).forEach((rival, idx) => {
          pred.driverPositions[rival.Driver.driverId] = 3 + idx;
        });
      } else if (presetName === 'leader_dnf_chaos') {
        // Leader and nearest rival DNF or outside points, target wins
        pred.driverPositions[targetDriverId] = 1;
        pred.fastestLapDriverId = targetDriverId;

        if (rivalContenders[0]) pred.driverPositions[rivalContenders[0].Driver.driverId] = 'DNF';
        if (rivalContenders[1]) pred.driverPositions[rivalContenders[1].Driver.driverId] = 'DNF';
        if (rivalContenders[2]) pred.driverPositions[rivalContenders[2].Driver.driverId] = 4;
        rivalContenders.slice(3).forEach((rival, idx) => {
          pred.driverPositions[rival.Driver.driverId] = 5 + idx;
        });
      } else if (presetName === 'reset') {
        // Natural ranking default
        pred.driverPositions[targetDriverId] = 1;
        pred.fastestLapDriverId = targetDriverId;
        rivalContenders.forEach((rival, idx) => {
          pred.driverPositions[rival.Driver.driverId] = 2 + idx;
        });
      }
    });
  }

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
   * Run simulation across ALL drivers on the grid
   */
  computeProjectedStandings(targetDriverId) {
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
      const pred = this.predictions[race.round] || { driverPositions: {}, sprintPositions: {} };

      // Calculate points for every driver in this round
      standingsMap.forEach((entry, driverId) => {
        const racePos = pred.driverPositions[driverId];
        let gained = this.getPointsForPos(racePos);

        // Fastest lap
        if (pred.fastestLapDriverId === driverId && gained > 0) {
          gained += F1_POINTS.FASTEST_LAP;
        }

        // Sprint
        if (race.hasSprint) {
          const sprintPos = pred.sprintPositions?.[driverId] || racePos;
          gained += this.getSprintPointsForPos(sprintPos);
        }

        entry.projectedPoints += gained;
        entry.addedPoints += gained;
        if (parseInt(racePos, 10) === 1) {
          entry.wins += 1;
        }
      });

      // Check mathematical clinch after this round
      const currentRemaining = this.remainingRaces.slice(raceIdx + 1).reduce((acc, r) => 
        acc + (r.hasSprint ? F1_POINTS.MAX_RACE_WEEKEND_SPRINT : F1_POINTS.MAX_RACE_WEEKEND_STANDARD), 0);

      const currentSorted = Array.from(standingsMap.values()).sort((a, b) => b.projectedPoints - a.projectedPoints);
      const leaderNow = currentSorted[0];
      const p2Now = currentSorted[1];

      if (!clinchEvent && p2Now && (leaderNow.projectedPoints - p2Now.projectedPoints) > currentRemaining) {
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
      champion: finalStandings[0],
      isTargetChampion: finalStandings[0].driver.driverId === targetDriverId
    };
  }

  /**
   * Monte Carlo probabilistic simulation (2,500 iterations)
   */
  runMonteCarlo(simulationsCount = 2500) {
    const contenders = this.initialStandings.filter(s => parseFloat(s.points) > 0);
    const winsTracker = {};
    contenders.forEach(c => { winsTracker[c.Driver.driverId] = 0; });

    const totalPoints = contenders.reduce((sum, c) => sum + parseFloat(c.points), 0);
    const weights = contenders.map(c => ({
      id: c.Driver.driverId,
      weight: (parseFloat(c.points) / totalPoints)
    }));

    for (let i = 0; i < simulationsCount; i++) {
      const simPoints = {};
      contenders.forEach(c => { simPoints[c.Driver.driverId] = parseFloat(c.points); });

      this.remainingRaces.forEach(race => {
        const shuffled = [...weights].map(w => ({
          id: w.id,
          score: w.weight * (0.6 + Math.random() * 0.8)
        })).sort((a, b) => b.score - a.score);

        shuffled.slice(0, 10).forEach((entry, idx) => {
          let pts = F1_POINTS.RACE[idx] || 0;
          if (idx === 0) pts += F1_POINTS.FASTEST_LAP;
          simPoints[entry.id] = (simPoints[entry.id] || 0) + pts;
        });

        if (race.hasSprint) {
          shuffled.slice(0, 8).forEach((entry, idx) => {
            const pts = F1_POINTS.SPRINT[idx] || 0;
            simPoints[entry.id] = (simPoints[entry.id] || 0) + pts;
          });
        }
      });

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

    return Object.entries(winsTracker).map(([driverId, wins]) => {
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
  }
}
