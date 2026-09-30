/**
 * Formula 1 Championship Permutations & Contenders UI Controller
 */
import { f1Api, FALLBACK_DATA_2026 } from './api.js';
import { ChampionshipCalculator } from './calculator.js';
import { RaceSimulator } from './simulator.js';

class F1ChampionshipApp {
  constructor() {
    this.currentSeason = 'current';
    this.selectedDriverId = 'norris'; // Default driver
    this.activeTab = 'scenarios'; // 'scenarios' | 'simulator' | 'montecarlo'
    
    this.calculator = null;
    this.simulator = null;
    this.standingsData = null;
    this.racesData = null;

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadData();
  }

  bindEvents() {
    // Season selector
    const seasonSelect = document.getElementById('seasonSelect');
    if (seasonSelect) {
      seasonSelect.addEventListener('change', async (e) => {
        this.currentSeason = e.target.value;
        await this.loadData();
      });
    }

    // View tabs
    const tabBtns = document.querySelectorAll('.view-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.dataset.tab;
        this.renderActiveTab();
      });
    });

    // Modals
    const btnSettings = document.getElementById('btnSettings');
    const modalSettings = document.getElementById('modalSettings');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettings = document.getElementById('saveSettings');

    btnSettings?.addEventListener('click', () => modalSettings?.classList.add('open'));
    closeSettings?.addEventListener('click', () => modalSettings?.classList.remove('open'));

    saveSettings?.addEventListener('click', () => {
      const provider = document.getElementById('apiProviderSelect')?.value || 'jolpica';
      const key = document.getElementById('apiKeyInput')?.value || '';
      f1Api.setProvider(provider, key);
      modalSettings?.classList.remove('open');
      this.loadData();
    });

    const btnDeployGuide = document.getElementById('btnDeployGuide');
    const modalDeploy = document.getElementById('modalDeploy');
    const closeDeploy = document.getElementById('closeDeploy');
    btnDeployGuide?.addEventListener('click', () => modalDeploy?.classList.add('open'));
    closeDeploy?.addEventListener('click', () => modalDeploy?.classList.remove('open'));

    // Close on overlay click
    [modalSettings, modalDeploy].forEach(modal => {
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    });

    // Monte Carlo trigger
    document.getElementById('btnRunMonteCarlo')?.addEventListener('click', () => {
      this.renderMonteCarlo();
    });
  }

  async loadData() {
    this.showLoading(true);
    try {
      const [standingsRes, racesRes] = await Promise.all([
        f1Api.getDriverStandings(this.currentSeason),
        f1Api.getSeasonRaces(this.currentSeason)
      ]);

      this.standingsData = standingsRes.standings;
      this.racesData = racesRes.remainingRaces;

      // Update season header ticker
      const seasonLabel = document.getElementById('tickerSeason');
      if (seasonLabel) seasonLabel.textContent = `${standingsRes.season} Season`;

      const apiStatus = document.getElementById('apiStatusLabel');
      if (apiStatus) apiStatus.textContent = standingsRes.source || 'Live Connected';

      // Initialize mathematical calculator and simulator
      this.calculator = new ChampionshipCalculator(this.standingsData, this.racesData);
      this.simulator = new RaceSimulator(this.standingsData, this.racesData);

      // Verify selected driver still exists in standings
      const exists = this.standingsData.some(s => s.Driver.driverId === this.selectedDriverId);
      if (!exists && this.standingsData.length > 0) {
        this.selectedDriverId = this.standingsData[0].Driver.driverId;
      }

      this.updateTickerMetrics();
      this.renderDriverList();
      this.renderActiveTab();
    } catch (err) {
      console.error("Error loading F1 data:", err);
    } finally {
      this.showLoading(false);
    }
  }

  showLoading(isLoading) {
    const loader = document.getElementById('globalLoader');
    if (loader) {
      loader.style.display = isLoading ? 'flex' : 'none';
    }
  }

  updateTickerMetrics() {
    const totalRemaining = this.calculator.totalRemainingPoints;
    const remainingRacesCount = this.racesData.length;
    const leader = this.standingsData[0];

    const elRaces = document.getElementById('tickerRacesRemaining');
    if (elRaces) elRaces.textContent = `${remainingRacesCount} Grands Prix`;

    const elPoints = document.getElementById('tickerMaxPoints');
    if (elPoints) elPoints.textContent = `${totalRemaining} PTS`;

    const elLeader = document.getElementById('tickerCurrentLeader');
    if (elLeader) elLeader.textContent = `${leader.Driver.givenName} ${leader.Driver.familyName} (${leader.points} pts)`;
  }

  getTeamSlug(constructor) {
    if (!constructor) return 'other';
    const id = (constructor.constructorId || constructor.name || '').toLowerCase();
    if (id.includes('mclaren')) return 'mclaren';
    if (id.includes('ferrari')) return 'ferrari';
    if (id.includes('red_bull') || id.includes('red bull')) return 'red_bull';
    if (id.includes('mercedes')) return 'mercedes';
    if (id.includes('aston')) return 'aston_martin';
    if (id.includes('alpine')) return 'alpine';
    if (id.includes('williams')) return 'williams';
    if (id.includes('rb') || id.includes('racing bulls') || id.includes('alphatauri')) return 'rb';
    if (id.includes('haas')) return 'haas';
    if (id.includes('audi') || id.includes('sauber') || id.includes('kick')) return 'audi';
    if (id.includes('cadillac')) return 'cadillac';
    return 'other';
  }

  /**
   * Renders Left Column Driver Standings List
   */
  renderDriverList() {
    const listEl = document.getElementById('driverListScroll');
    if (!listEl) return;

    const evaluatedDrivers = this.calculator.evaluateAllDrivers();
    listEl.innerHTML = '';

    evaluatedDrivers.forEach((driver) => {
      const isSelected = driver.driver.driverId === this.selectedDriverId;
      const team = driver.constructors[0];
      const teamSlug = this.getTeamSlug(team);

      const card = document.createElement('div');
      card.className = `driver-card-item ${isSelected ? 'selected' : ''}`;
      card.setAttribute('data-team', teamSlug);

      let rankClass = '';
      if (driver.position === 1) rankClass = 'p1';
      else if (driver.position === 2) rankClass = 'p2';
      else if (driver.position === 3) rankClass = 'p3';

      let statusBadgeHtml = '';
      if (driver.status === 'clinched') {
        statusBadgeHtml = `<span class="driver-status-badge clinched">🏆 Champion</span>`;
      } else if (driver.status === 'leader') {
        statusBadgeHtml = `<span class="driver-status-badge leader">⭐ Leader</span>`;
      } else if (driver.status === 'contender') {
        statusBadgeHtml = `<span class="driver-status-badge contender">⚡ Contender</span>`;
      } else {
        statusBadgeHtml = `<span class="driver-status-badge eliminated">❌ Eliminated</span>`;
      }

      card.innerHTML = `
        <div class="driver-rank ${rankClass}">${driver.position}</div>
        <div class="driver-avatar-box">
          ${driver.driver.code || driver.driver.familyName.substring(0, 3).toUpperCase()}
          <span class="driver-num-tag">${driver.driver.permanentNumber || driver.position}</span>
        </div>
        <div class="driver-info">
          <div class="driver-name-row">
            <span class="driver-fullname">${driver.driver.givenName} ${driver.driver.familyName}</span>
            <span class="driver-code-pill">${driver.driver.code || ''}</span>
          </div>
          <div class="driver-team-row">
            <span class="team-indicator-dot"></span>
            <span>${team ? team.name : 'Formula 1 Team'}</span>
          </div>
          <div>${statusBadgeHtml}</div>
        </div>
        <div class="driver-points-col">
          <div class="driver-pts">${driver.points}</div>
          <div class="driver-pts-label">Points</div>
          <div class="driver-gap">${driver.deficitToLeader === 0 ? 'LEADER' : `-${driver.deficitToLeader} pts`}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedDriverId = driver.driver.driverId;
        this.renderDriverList();
        this.renderActiveTab();
      });

      listEl.appendChild(card);
    });
  }

  /**
   * Renders the Active Tab Content in Right Column
   */
  renderActiveTab() {
    const tabScenarios = document.getElementById('tabContentScenarios');
    const tabSimulator = document.getElementById('tabContentSimulator');
    const tabMonteCarlo = document.getElementById('tabContentMonteCarlo');

    if (tabScenarios) tabScenarios.style.display = this.activeTab === 'scenarios' ? 'block' : 'none';
    if (tabSimulator) tabSimulator.style.display = this.activeTab === 'simulator' ? 'block' : 'none';
    if (tabMonteCarlo) tabMonteCarlo.style.display = this.activeTab === 'montecarlo' ? 'block' : 'none';

    if (this.activeTab === 'scenarios') {
      this.renderScenariosView();
    } else if (this.activeTab === 'simulator') {
      this.renderSimulatorView();
    } else if (this.activeTab === 'montecarlo') {
      this.renderMonteCarlo();
    }
  }

  /**
   * Detailed Permutations & Mathematical Path to Crown
   */
  renderScenariosView() {
    const scenarios = this.calculator.calculateDriverScenarios(this.selectedDriverId);
    const target = scenarios.target;
    const leader = scenarios.leader;
    const team = target.constructors[0];
    const teamSlug = this.getTeamSlug(team);

    // Spotlight Hero Element
    const spotlightCard = document.getElementById('spotlightCard');
    if (spotlightCard) {
      spotlightCard.setAttribute('data-team', teamSlug);
      
      const teamColors = {
        mclaren: '#FF8000', ferrari: '#E8002D', red_bull: '#1E41FF', mercedes: '#00D2BE',
        aston_martin: '#229971', alpine: '#0090FF', williams: '#00A0DE', rb: '#6692FF',
        haas: '#B6BABD', audi: '#52E252', cadillac: '#D4AF37'
      };
      const color = teamColors[teamSlug] || '#E10600';
      spotlightCard.style.setProperty('--spotlight-color', color);
      spotlightCard.style.setProperty('--spotlight-glow', `${color}66`);

      // Watermark
      const watermark = document.getElementById('spotlightWatermark');
      if (watermark) watermark.textContent = target.driver.permanentNumber || target.position;

      // Initials Avatar
      const avatar = document.getElementById('spotlightAvatar');
      if (avatar) avatar.textContent = target.driver.code || target.driver.familyName.substring(0, 3).toUpperCase();

      // Names
      const nameEl = document.getElementById('spotlightDriverName');
      if (nameEl) nameEl.textContent = `${target.driver.givenName} ${target.driver.familyName}`;

      const teamEl = document.getElementById('spotlightTeamName');
      if (teamEl) teamEl.textContent = `${team ? team.name : 'F1 Team'} • Car #${target.driver.permanentNumber || target.position}`;

      // Verdict Badge
      const verdictEl = document.getElementById('spotlightVerdict');
      const verdictSub = document.getElementById('spotlightVerdictSub');
      if (target.status === 'clinched') {
        verdictEl.className = 'verdict-badge clinched';
        verdictEl.innerHTML = `🏆 CHAMPIONSHIP CLINCHED`;
        verdictSub.textContent = `Mathematically guaranteed 1st place in the World Drivers' Championship!`;
      } else if (target.canWin) {
        verdictEl.className = 'verdict-badge can-win';
        verdictEl.innerHTML = `⚡ CAN STILL WIN CHAMPIONSHIP`;
        verdictSub.textContent = `Mathematical contender for the ${this.standingsData[0].season || '2026'} World Title!`;
      } else {
        verdictEl.className = 'verdict-badge eliminated';
        verdictEl.innerHTML = `❌ MATHEMATICALLY ELIMINATED`;
        verdictSub.textContent = `Max reachable points (${target.maxPossiblePoints}) is lower than leader's ${leader.points} pts.`;
      }

      // Metrics Grid
      document.getElementById('metricCurrentPts').textContent = target.points;
      document.getElementById('metricMaxPts').textContent = target.maxPossiblePoints;
      
      const gapEl = document.getElementById('metricGap');
      if (target.deficitToLeader === 0) {
        gapEl.textContent = 'CHAMPION';
        gapEl.className = 'metric-value highlight-green';
      } else {
        gapEl.textContent = `-${target.deficitToLeader}`;
        gapEl.className = target.canWin ? 'metric-value highlight-yellow' : 'metric-value highlight-red';
      }

      document.getElementById('metricAvailPts').textContent = scenarios.totalRemainingPoints;

      // Progress bar (Points / (Leader Points + Total Remaining))
      const totalCeiling = leader.points + scenarios.totalRemainingPoints;
      const pct = Math.min(100, Math.round((target.maxPossiblePoints / totalCeiling) * 100));
      const fillBar = document.getElementById('clinchProgressBarFill');
      const pctLabel = document.getElementById('clinchProgressPct');
      if (fillBar) fillBar.style.width = `${pct}%`;
      if (pctLabel) pctLabel.textContent = `${pct}% Title Range`;
    }

    // Permutations & Rival Conditions
    const conditionsContainer = document.getElementById('scenarioCardsList');
    if (!conditionsContainer) return;

    if (!target.canWin) {
      conditionsContainer.innerHTML = `
        <div class="info-callout warning" style="grid-column: 1 / -1;">
          <strong>Mathematical Elimination:</strong> Even if ${target.driver.givenName} ${target.driver.familyName} wins all ${scenarios.remainingCount} remaining races, sprints, and fastest laps (+${scenarios.totalRemainingPoints} pts), their ceiling is ${target.maxPossiblePoints} pts, which cannot reach ${leader.driver.givenName} ${leader.driver.familyName}'s current total of ${leader.points} pts.
        </div>
      `;
      document.getElementById('rivalsTableBody').innerHTML = `
        <tr><td colspan="5" style="text-align:center; color: var(--f1-gray-400); padding: 2rem;">
          Driver is eliminated from title contention for this season.
        </td></tr>
      `;
      return;
    }

    if (scenarios.isTargetLeader) {
      // Selected driver IS the leader!
      conditionsContainer.innerHTML = `
        <div class="scenario-card" style="--scenario-color: var(--f1-gold);">
          <div class="scenario-card-title">
            <span>Crown Defense Objective</span>
            <span class="scenario-target-badge">P1 LEADER</span>
          </div>
          <div class="scenario-card-desc">
            ${target.driver.familyName} currently leads the championship by <strong>${target.points - (this.standingsData[1]?.points || 0)} points</strong> over ${this.standingsData[1]?.Driver.familyName}.
          </div>
        </div>

        <div class="scenario-card" style="--scenario-color: var(--f1-neon-green);">
          <div class="scenario-card-title">
            <span>Clinch Threshold</span>
            <span class="scenario-target-badge">+${scenarios.totalRemainingPoints} PTS REMAINING</span>
          </div>
          <div class="scenario-card-desc">
            To clinch without relying on rival results, ${target.driver.familyName} needs <strong>${Math.max(0, (this.standingsData[1]?.points || 0) + scenarios.totalRemainingPoints - target.points + 1)} more points</strong>.
          </div>
        </div>

        <div class="scenario-card" style="--scenario-color: var(--f1-cyan);">
          <div class="scenario-card-title">
            <span>Earliest Clinch Round</span>
            <span class="scenario-target-badge">${scenarios.earliestClinchRound ? `ROUND ${scenarios.earliestClinchRound.round}` : 'SEASON FINALE'}</span>
          </div>
          <div class="scenario-card-desc">
            ${scenarios.earliestClinchRound ? 
              `Title can be clinched as early as the <strong>${scenarios.earliestClinchRound.raceName}</strong> if maximum points are achieved and rivals drop points.` : 
              'The championship battle is projected to go all the way down to the wire in Abu Dhabi!'}
          </div>
        </div>
      `;
    } else {
      // Selected driver is chasing the leader!
      conditionsContainer.innerHTML = `
        <div class="scenario-card" style="--scenario-color: var(--f1-neon-green);">
          <div class="scenario-card-title">
            <span>Maximum Driver Ceiling</span>
            <span class="scenario-target-badge">${scenarios.targetMaxPoints} PTS</span>
          </div>
          <div class="scenario-card-desc">
            If ${target.driver.familyName} achieves a clean sweep (wins all ${scenarios.remainingCount} remaining races + ${scenarios.remainingSprints} sprints + fastest laps), they will finish with <strong>${scenarios.targetMaxPoints} points</strong>.
          </div>
        </div>

        <div class="scenario-card" style="--scenario-color: var(--f1-red);">
          <div class="scenario-card-title">
            <span>Leader Limit (${leader.driver.familyName})</span>
            <span class="scenario-target-badge">MAX ${scenarios.pointsLeaderCanScore} PTS</span>
          </div>
          <div class="scenario-card-desc">
            For ${target.driver.familyName} to take the crown, ${leader.driver.familyName} can score <strong>at most ${scenarios.pointsLeaderCanScore} points</strong> out of ${scenarios.totalRemainingPoints} available.
          </div>
        </div>

        <div class="scenario-card" style="--scenario-color: var(--f1-neon-yellow);">
          <div class="scenario-card-title">
            <span>Leader Finishing Requirement</span>
            <span class="scenario-target-badge">${scenarios.avgPtsPerRaceLeaderAllowed} PTS / RACE</span>
          </div>
          <div class="scenario-card-desc">
            ${scenarios.leaderFinishVerdict}. Any higher average finish by ${leader.driver.familyName} seals their championship defense.
          </div>
        </div>
      `;
    }

    // Render Rivals Elimination Threshold Table
    const tableBody = document.getElementById('rivalsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = scenarios.rivals.map(rival => {
      const rivalSlug = this.getTeamSlug(rival.driver.Constructors?.[0] || rival.constructors?.[0]);
      return `
        <tr>
          <td>
            <strong>P${rival.position}</strong> ${rival.driver.givenName} ${rival.driver.familyName} (${rival.driver.code || ''})
          </td>
          <td>${rival.currentPoints} pts</td>
          <td><span class="tab-badge" style="color:var(--f1-neon-yellow);">${rival.pointsBuffer} pts</span></td>
          <td>${rival.maxFinishAllowed}</td>
          <td>
            ${rival.pointsBuffer <= 0 ? 
              '<span class="driver-status-badge eliminated">Blocked</span>' : 
              '<span class="driver-status-badge contender">Active Threat</span>'}
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Interactive What-If Permutations Race-by-Race Simulator
   */
  renderSimulatorView() {
    const container = document.getElementById('raceCardsContainer');
    if (!container) return;

    container.innerHTML = '';
    const leader = this.standingsData[0];
    const target = this.standingsData.find(s => s.Driver.driverId === this.selectedDriverId) || leader;

    // Presets actions
    const btnSweep = document.getElementById('btnPresetSweep');
    const btnDnf = document.getElementById('btnPresetDnf');
    const btnP1P2 = document.getElementById('btnPresetP1P2');
    const btnReset = document.getElementById('btnPresetReset');

    btnSweep.onclick = () => {
      this.simulator.applyPreset('sweep', target.Driver.driverId, leader.Driver.driverId);
      this.renderSimulatorView();
    };
    btnDnf.onclick = () => {
      this.simulator.applyPreset('leader_dnf', target.Driver.driverId, leader.Driver.driverId);
      this.renderSimulatorView();
    };
    btnP1P2.onclick = () => {
      this.simulator.applyPreset('p1_p2', target.Driver.driverId, leader.Driver.driverId);
      this.renderSimulatorView();
    };
    btnReset.onclick = () => {
      this.simulator.applyPreset('reset', target.Driver.driverId, leader.Driver.driverId);
      this.renderSimulatorView();
    };

    // Render individual remaining race cards
    this.racesData.forEach(race => {
      const pred = this.simulator.predictions[race.round] || { targetPos: 1, leaderPos: 2, targetFL: false };

      const card = document.createElement('div');
      card.className = 'race-round-card';
      card.innerHTML = `
        <div class="round-header-row">
          <span class="round-pill">ROUND ${race.round}</span>
          ${race.hasSprint ? '<span class="round-sprint-badge">⚡ SPRINT WEEKEND</span>' : ''}
        </div>
        <div>
          <div class="race-name-text">${race.flag} ${race.raceName}</div>
          <div class="race-meta-text">${race.circuitName} • ${race.date}</div>
        </div>

        <div class="race-prediction-control">
          <div class="control-label-row">
            <span>${target.Driver.code || target.Driver.familyName} (Selected)</span>
            <button class="fl-toggle-btn ${pred.targetFL ? 'active' : ''}" data-round="${race.round}">
              ⏱ +1 FL
            </button>
          </div>
          <div class="prediction-select-row">
            <select class="pos-select target-pos-select" data-round="${race.round}">
              <option value="1" ${pred.targetPos == 1 ? 'selected' : ''}>P1 (25 pts)</option>
              <option value="2" ${pred.targetPos == 2 ? 'selected' : ''}>P2 (18 pts)</option>
              <option value="3" ${pred.targetPos == 3 ? 'selected' : ''}>P3 (15 pts)</option>
              <option value="4" ${pred.targetPos == 4 ? 'selected' : ''}>P4 (12 pts)</option>
              <option value="5" ${pred.targetPos == 5 ? 'selected' : ''}>P5 (10 pts)</option>
              <option value="6" ${pred.targetPos == 6 ? 'selected' : ''}>P6 (8 pts)</option>
              <option value="7" ${pred.targetPos == 7 ? 'selected' : ''}>P7 (6 pts)</option>
              <option value="8" ${pred.targetPos == 8 ? 'selected' : ''}>P8 (4 pts)</option>
              <option value="9" ${pred.targetPos == 9 ? 'selected' : ''}>P9 (2 pts)</option>
              <option value="10" ${pred.targetPos == 10 ? 'selected' : ''}>P10 (1 pt)</option>
              <option value="DNF" ${pred.targetPos === 'DNF' ? 'selected' : ''}>DNF / 0 pts</option>
            </select>
          </div>
        </div>

        ${target.Driver.driverId !== leader.Driver.driverId ? `
          <div class="race-prediction-control">
            <div class="control-label-row">
              <span>${leader.Driver.code || leader.Driver.familyName} (Leader)</span>
            </div>
            <div class="prediction-select-row">
              <select class="pos-select leader-pos-select" data-round="${race.round}">
                <option value="1" ${pred.leaderPos == 1 ? 'selected' : ''}>P1 (25 pts)</option>
                <option value="2" ${pred.leaderPos == 2 ? 'selected' : ''}>P2 (18 pts)</option>
                <option value="3" ${pred.leaderPos == 3 ? 'selected' : ''}>P3 (15 pts)</option>
                <option value="4" ${pred.leaderPos == 4 ? 'selected' : ''}>P4 (12 pts)</option>
                <option value="5" ${pred.leaderPos == 5 ? 'selected' : ''}>P5 (10 pts)</option>
                <option value="6" ${pred.leaderPos == 6 ? 'selected' : ''}>P6 (8 pts)</option>
                <option value="7" ${pred.leaderPos == 7 ? 'selected' : ''}>P7 (6 pts)</option>
                <option value="8" ${pred.leaderPos == 8 ? 'selected' : ''}>P8 (4 pts)</option>
                <option value="9" ${pred.leaderPos == 9 ? 'selected' : ''}>P9 (2 pts)</option>
                <option value="10" ${pred.leaderPos == 10 ? 'selected' : ''}>P10 (1 pt)</option>
                <option value="DNF" ${pred.leaderPos === 'DNF' ? 'selected' : ''}>DNF / 0 pts</option>
              </select>
            </div>
          </div>
        ` : ''}
      `;

      // Event listeners for select changes
      const targetSelect = card.querySelector('.target-pos-select');
      targetSelect?.addEventListener('change', (e) => {
        this.simulator.setRacePrediction(race.round, 'targetPos', e.target.value);
        this.updateProjectedStandingsUI();
      });

      const leaderSelect = card.querySelector('.leader-pos-select');
      leaderSelect?.addEventListener('change', (e) => {
        this.simulator.setRacePrediction(race.round, 'leaderPos', e.target.value);
        this.updateProjectedStandingsUI();
      });

      const flBtn = card.querySelector('.fl-toggle-btn');
      flBtn?.addEventListener('click', () => {
        pred.targetFL = !pred.targetFL;
        this.simulator.setRacePrediction(race.round, 'targetFL', pred.targetFL);
        flBtn.classList.toggle('active', pred.targetFL);
        this.updateProjectedStandingsUI();
      });

      container.appendChild(card);
    });

    this.updateProjectedStandingsUI();
  }

  updateProjectedStandingsUI() {
    const leader = this.standingsData[0];
    const target = this.standingsData.find(s => s.Driver.driverId === this.selectedDriverId) || leader;

    const result = this.simulator.computeProjectedStandings(target.Driver.driverId, leader.Driver.driverId);
    
    const bannerLead = document.getElementById('projectedOutcomeLead');
    const bannerSub = document.getElementById('projectedOutcomeSub');

    const champion = result.champion;
    const isTargetChampion = champion.driver.driverId === target.Driver.driverId;

    if (bannerLead && bannerSub) {
      if (isTargetChampion) {
        bannerLead.innerHTML = `🏆 PROJECTED CHAMPION: <span style="color:var(--f1-neon-green);">${champion.driver.givenName} ${champion.driver.familyName}</span>`;
        bannerSub.innerHTML = `Final Points: <strong>${champion.projectedPoints} pts</strong> (+${champion.addedPoints} pts gained in remaining races). ${result.clinchEvent ? `Clinches at Round ${result.clinchEvent.round} (${result.clinchEvent.raceName})!` : 'Decided at the season finale!'}`;
      } else {
        bannerLead.innerHTML = `🏁 PROJECTED WINNER: <span style="color:var(--f1-neon-yellow);">${champion.driver.givenName} ${champion.driver.familyName}</span> (${champion.projectedPoints} pts)`;
        const targetEntry = result.standings.find(s => s.driver.driverId === target.Driver.driverId);
        bannerSub.innerHTML = `${target.Driver.givenName} finishes with ${targetEntry?.projectedPoints || 0} pts (Deficit: ${(champion.projectedPoints - (targetEntry?.projectedPoints || 0))} pts). Adjust rival positions above to engineer a winning path!`;
      }
    }
  }

  /**
   * Monte Carlo Simulation Runner
   */
  renderMonteCarlo() {
    const resultsContainer = document.getElementById('monteCarloOddsList');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div style="text-align:center; padding: 2rem; color:var(--f1-gray-400);">
        ⚡ Running 2,500 race iterations across the remaining calendar...
      </div>
    `;

    setTimeout(() => {
      const results = this.simulator.runMonteCarlo(2500);
      resultsContainer.innerHTML = '';

      results.forEach(res => {
        const team = res.constructors?.[0];
        const teamSlug = this.getTeamSlug(team);
        const prob = parseFloat(res.probability);

        if (prob < 0.1 && res.points < 50) return; // filter non-contenders

        const row = document.createElement('div');
        row.className = 'mc-driver-row';
        row.setAttribute('data-team', teamSlug);

        row.innerHTML = `
          <div class="mc-driver-meta">
            <span class="team-indicator-dot"></span>
            <strong>${res.driver.code || res.driver.familyName.substring(0, 3)}</strong>
            <span style="font-size:0.8rem; color:var(--f1-gray-400);">${res.driver.familyName}</span>
          </div>
          <div class="mc-bar-container">
            <div class="mc-bar-fill" style="width: ${Math.max(2, prob)}%;"></div>
          </div>
          <div class="mc-prob-val" style="color: ${prob > 40 ? 'var(--f1-neon-green)' : (prob > 10 ? 'var(--f1-neon-yellow)' : '#FFF')}">
            ${prob}%
          </div>
        `;

        resultsContainer.appendChild(row);
      });
    }, 150);
  }
}

// Boot up app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.f1App = new F1ChampionshipApp();
});
