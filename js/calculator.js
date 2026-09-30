/**
 * Formula 1 Championship Permutations & Clinch Calculator Engine
 */

export const F1_POINTS = {
  RACE: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  SPRINT: [8, 7, 6, 5, 4, 3, 2, 1],
  FASTEST_LAP: 1,
  MAX_RACE_WEEKEND_STANDARD: 26, // 25 + 1 FL
  MAX_RACE_WEEKEND_SPRINT: 34     // 25 + 8 + 1 FL
};

export class ChampionshipCalculator {
  constructor(standings, remainingRaces) {
    this.standings = standings.map(s => ({
      position: parseInt(s.position, 10),
      points: parseFloat(s.points),
      wins: parseInt(s.wins || 0, 10),
      driver: s.Driver,
      constructors: s.Constructors || []
    })).sort((a, b) => a.position - b.position);

    this.remainingRaces = remainingRaces;
    this.totalRemainingPoints = this.calculateTotalRemainingPoints();
    this.leader = this.standings[0];
  }

  calculateTotalRemainingPoints() {
    return this.remainingRaces.reduce((total, race) => {
      const weekendMax = race.hasSprint 
        ? F1_POINTS.MAX_RACE_WEEKEND_SPRINT 
        : F1_POINTS.MAX_RACE_WEEKEND_STANDARD;
      return total + weekendMax;
    }, 0);
  }

  /**
   * Evaluates mathematical championship status for all drivers
   */
  evaluateAllDrivers() {
    const leaderPoints = this.leader.points;
    const p2Points = this.standings[1]?.points || 0;
    const isSeasonClinched = (leaderPoints - p2Points) > this.totalRemainingPoints;

    return this.standings.map(driver => {
      const maxPossiblePoints = driver.points + this.totalRemainingPoints;
      const deficitToLeader = leaderPoints - driver.points;
      
      let status = 'contender'; // 'leader', 'clinched', 'contender', 'eliminated'

      if (driver.position === 1) {
        status = isSeasonClinched ? 'clinched' : 'leader';
      } else if (maxPossiblePoints < leaderPoints) {
        status = 'eliminated';
      } else if (maxPossiblePoints === leaderPoints) {
        // Tie possible on countback
        status = 'contender';
      } else {
        status = isSeasonClinched ? 'eliminated' : 'contender';
      }

      return {
        ...driver,
        maxPossiblePoints,
        deficitToLeader,
        status,
        canWin: status === 'leader' || status === 'clinched' || status === 'contender',
        eliminationDeficit: maxPossiblePoints - leaderPoints
      };
    });
  }

  /**
   * Computes deep mathematical scenario permutations for a specific driver
   */
  calculateDriverScenarios(targetDriverId) {
    const evaluatedDrivers = this.evaluateAllDrivers();
    const target = evaluatedDrivers.find(d => d.driver.driverId === targetDriverId) || evaluatedDrivers[0];
    const leader = evaluatedDrivers[0];
    const isTargetLeader = target.driver.driverId === leader.driver.driverId;
    const remainingCount = this.remainingRaces.length;
    const remainingSprints = this.remainingRaces.filter(r => r.hasSprint).length;

    // Best case maximum points target driver can score
    const targetMaxPoints = target.points + this.totalRemainingPoints;
    const targetMaxWins = target.wins + remainingCount;

    // What leader can score before target driver cannot win:
    // If target scores targetMaxPoints:
    // Leader's maximum allowed points to finish behind target
    const maxLeaderAllowedPoints = targetMaxPoints - 1; // 1 point buffer to guarantee win
    const pointsLeaderCanScore = Math.max(0, maxLeaderAllowedPoints - leader.points);
    const avgPtsPerRaceLeaderAllowed = remainingCount > 0 ? (pointsLeaderCanScore / remainingCount) : 0;

    // Map average points to typical finishing position
    const getFinishPositionDescription = (avgPts) => {
      if (avgPts >= 18) return 'Leader can afford 2nd place in every race';
      if (avgPts >= 15) return 'Leader can finish on the podium (3rd place average)';
      if (avgPts >= 12) return 'Leader must finish 4th or lower on average';
      if (avgPts >= 10) return 'Leader must finish 5th or lower on average';
      if (avgPts >= 8)  return 'Leader must finish 6th or lower on average';
      if (avgPts >= 6)  return 'Leader must finish 7th or lower on average';
      if (avgPts >= 4)  return 'Leader must finish 8th or lower on average';
      if (avgPts >= 2)  return 'Leader must finish 9th or lower on average';
      if (avgPts > 0)   return 'Leader can only score minor points (10th place average)';
      return 'Leader must score 0 points (DNFs / outside top 10)';
    };

    // Calculate rivals matrix (top contenders who threaten this target driver)
    const rivals = evaluatedDrivers
      .filter(d => d.driver.driverId !== target.driver.driverId && d.status !== 'eliminated')
      .map(rival => {
        // Maximum points this rival is allowed to score before surpassing target's best case
        const maxRivalAllowed = targetMaxPoints - 1;
        const rivalCanScore = Math.max(0, maxRivalAllowed - rival.points);
        const rivalAvgAllowed = remainingCount > 0 ? (rivalCanScore / remainingCount) : 0;
        
        return {
          driver: rival.driver,
          position: rival.position,
          currentPoints: rival.points,
          maxAllowedPoints: maxRivalAllowed,
          pointsBuffer: rivalCanScore,
          maxFinishAllowed: getFinishPositionDescription(rivalAvgAllowed),
          mustFinishBehind: rival.points > target.points
        };
      });

    // Clinch requirements for the target driver:
    // Earliest round they could clinch if they win every remaining round and nearest rival scores minimum
    let earliestClinchRound = null;
    let runningTargetPoints = target.points;
    let runningP2Points = isTargetLeader ? (evaluatedDrivers[1]?.points || 0) : leader.points;

    for (let i = 0; i < this.remainingRaces.length; i++) {
      const race = this.remainingRaces[i];
      const maxRacePts = race.hasSprint ? F1_POINTS.MAX_RACE_WEEKEND_SPRINT : F1_POINTS.MAX_RACE_WEEKEND_STANDARD;
      runningTargetPoints += maxRacePts;
      // In best case scenario, rival finishes P2 (18 pts + 7 sprint) or P3 or DNF
      // Let's test clinching if rival scores conservative P3 (15 pts) vs DNF (0 pts)
      const remainingAfterRound = this.remainingRaces.slice(i + 1).reduce((acc, r) => 
        acc + (r.hasSprint ? F1_POINTS.MAX_RACE_WEEKEND_SPRINT : F1_POINTS.MAX_RACE_WEEKEND_STANDARD), 0);

      if ((runningTargetPoints - runningP2Points) > remainingAfterRound && !earliestClinchRound) {
        earliestClinchRound = {
          round: race.round,
          raceName: race.raceName,
          circuitName: race.circuitName,
          date: race.date
        };
      }
    }

    return {
      target,
      leader,
      isTargetLeader,
      totalRemainingPoints: this.totalRemainingPoints,
      remainingCount,
      remainingSprints,
      targetMaxPoints,
      targetMaxWins,
      pointsLeaderCanScore,
      avgPtsPerRaceLeaderAllowed: avgPtsPerRaceLeaderAllowed.toFixed(1),
      leaderFinishVerdict: getFinishPositionDescription(avgPtsPerRaceLeaderAllowed),
      rivals,
      earliestClinchRound
    };
  }
}
