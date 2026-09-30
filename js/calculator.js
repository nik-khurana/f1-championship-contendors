/**
 * Formula 1 Championship Permutations & Multi-Contender Clinch Calculator Engine
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
        status = 'contender'; // Tie possible on countback
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
   * Helper translating permissible average points to human-readable finishing position constraint
   */
  getFinishPositionDescription(avgPts, maxPtsTotal, remainingCount) {
    if (maxPtsTotal <= 0) {
      return 'Must score 0 points (DNFs / finish P11 or lower in every race)';
    }
    if (avgPts >= 18) {
      return 'Can afford P2 in every remaining Grand Prix';
    }
    if (avgPts >= 15) {
      return 'Can average a podium finish (P3 or lower)';
    }
    if (avgPts >= 12) {
      return 'Must average P4 or worse (cannot regularly finish on podium)';
    }
    if (avgPts >= 10) {
      return 'Must average P5 or worse';
    }
    if (avgPts >= 8) {
      return 'Must average P6 or worse';
    }
    if (avgPts >= 6) {
      return 'Must average P7 or worse';
    }
    if (avgPts >= 4) {
      return 'Must average P8 or worse';
    }
    if (avgPts >= 2) {
      return 'Must average P9 or worse';
    }
    if (avgPts >= 1) {
      return 'Can only score single points (P10 average)';
    }
    return `Can score at most ${maxPtsTotal} points total across all ${remainingCount} remaining races`;
  }

  /**
   * Computes comprehensive multi-contender mathematical scenarios for a specific target driver
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

    // Identify all other drivers who are mathematically in contention
    const allContenders = evaluatedDrivers.filter(d => 
      d.driver.driverId !== target.driver.driverId && d.canWin
    );

    // For EACH rival contender in contention:
    // Determine the maximum points they can score before surpassing the target driver
    const rivalRequirements = allContenders.map(rival => {
      // For target to guarantee winning (or tie with win countback):
      // If rival reaches targetMaxPoints, rival could tie or beat target.
      // Target wins if targetMaxPoints > rival.finalPoints OR (equal and target has more wins)
      const maxAllowedPointsTotal = targetMaxPoints - 1;
      const maxAdditionalPointsAllowed = Math.max(0, maxAllowedPointsTotal - rival.points);
      const avgPtsPerRaceAllowed = remainingCount > 0 ? (maxAdditionalPointsAllowed / remainingCount) : 0;

      // Maximum wins this rival could take before taking too many points
      const maxWinsAllowed = Math.min(remainingCount, Math.floor(maxAdditionalPointsAllowed / 25));
      // Maximum podiums this rival could take (15 pts min per podium)
      const maxPodiumsAllowed = Math.min(remainingCount, Math.floor(maxAdditionalPointsAllowed / 15));

      // Finishing position rule
      const finishConstraint = this.getFinishPositionDescription(
        avgPtsPerRaceAllowed, 
        maxAdditionalPointsAllowed, 
        remainingCount
      );

      // Threat severity: how close this rival already is to target's max points
      const pointsBuffer = maxAdditionalPointsAllowed;
      const isAheadOfTarget = rival.points > target.points;
      const pointsAheadOfTarget = isAheadOfTarget ? (rival.points - target.points) : 0;
      const pointsBehindTarget = !isAheadOfTarget ? (target.points - rival.points) : 0;

      return {
        driver: rival.driver,
        constructors: rival.constructors,
        position: rival.position,
        currentPoints: rival.points,
        currentWins: rival.wins,
        isAheadOfTarget,
        pointsAheadOfTarget,
        pointsBehindTarget,
        maxAllowedPointsTotal,
        maxAdditionalPointsAllowed,
        avgPtsPerRaceAllowed: avgPtsPerRaceAllowed.toFixed(1),
        maxWinsAllowed,
        maxPodiumsAllowed,
        finishConstraint,
        threatLevel: pointsBuffer < 50 ? 'CRITICAL' : (pointsBuffer < 100 ? 'HIGH' : 'MODERATE')
      };
    }).sort((a, b) => a.maxAdditionalPointsAllowed - b.maxAdditionalPointsAllowed); // Sort by lowest buffer (biggest threat first)

    // Primary mathematical threat: the contender who gives target the smallest margin of error
    const primaryThreat = rivalRequirements[0] || null;

    // Multi-Car Podiums Distribution Analysis:
    // If target driver finishes P1 in every race, who can take P2, P3, P4, P5?
    // In each standard race, P2=18, P3=15, P4=12, P5=10.
    // If the top 2 rivals split P2 and P3:
    const rivalsP2P3Split = rivalRequirements.slice(0, 4).map(r => {
      // Half P2 (18) and half P3 (15) average = 16.5 pts per race
      const projectedScoreIfP2P3 = r.currentPoints + (remainingCount * 16.5);
      const canSurviveP2P3 = projectedScoreIfP2P3 < targetMaxPoints;
      return {
        driver: r.driver,
        projectedScore: Math.round(projectedScoreIfP2P3),
        canSurviveP2P3,
        margin: Math.round(targetMaxPoints - projectedScoreIfP2P3)
      };
    });

    // Clinch requirements for the target driver:
    let earliestClinchRound = null;
    let runningTargetPoints = target.points;
    let runningHighestRivalPoints = allContenders[0]?.points || leader.points;

    for (let i = 0; i < this.remainingRaces.length; i++) {
      const race = this.remainingRaces[i];
      const maxRacePts = race.hasSprint ? F1_POINTS.MAX_RACE_WEEKEND_SPRINT : F1_POINTS.MAX_RACE_WEEKEND_STANDARD;
      runningTargetPoints += maxRacePts;
      
      const remainingAfterRound = this.remainingRaces.slice(i + 1).reduce((acc, r) => 
        acc + (r.hasSprint ? F1_POINTS.MAX_RACE_WEEKEND_SPRINT : F1_POINTS.MAX_RACE_WEEKEND_STANDARD), 0);

      if ((runningTargetPoints - runningHighestRivalPoints) > remainingAfterRound && !earliestClinchRound) {
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
      allContendersCount: allContenders.length,
      rivalRequirements,
      primaryThreat,
      rivalsP2P3Split,
      earliestClinchRound
    };
  }
}
