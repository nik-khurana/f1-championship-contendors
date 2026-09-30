/**
 * Formula 1 Championship Permutations & Multi-Contender UI Controller
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
   * Detailed Comprehensive Multi-Contender Permutations
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
        verdictSub.textContent = `Mathematical contender among ${scenarios.allContendersCount + 1} active drivers!`;
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
        gapEl.textContent = 'LEADER';
        gapEl.className = 'metric-value highlight-green';
      } else {
        gapEl.textContent = `-${target.deficitToLeader}`;
        gapEl.className = target.canWin ? 'metric-value highlight-yellow' : 'metric-value highlight-red';
      }

      document.getElementById('metricAvailPts').textContent = scenarios.totalRemainingPoints;

      // Progress bar
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
          <strong>Mathematical Elimination:</strong> Even if ${target.driver.givenName} ${target.driver.familyName} wins all ${scenarios.remainingCount} remaining races, sprints, and fastest laps (+${scenarios.totalRemainingPoints} pts), their ceiling is ${target.maxPossiblePoints} pts, which cannot surpass ${leader.driver.givenName} ${leader.driver.familyName}'s current total of ${leader.points} pts.
        </div>
      `;
      document.getElementById('rivalsTableBody').innerHTML = `
        <tr><td colspan="7" style="text-align:center; color: var(--f1-gray-400); padding: 2rem;">
          Driver is eliminated from title contention for this season.
        </td></tr>
      `;
      return;
    }

    const primaryThreat = scenarios.primaryThreat;

    // Multi-Contender scenario condition cards
    conditionsContainer.innerHTML = `
      <!-- Card 1: Critical Threat -->
      <div class="scenario-card" style="--scenario-color: var(--f1-red);">
        <div class="scenario-card-title">
          <span>Primary Title Threat</span>
          <span class="scenario-target-badge" style="background:rgba(225,6,0,0.2); color:#FF5252;">
            ${primaryThreat ? `${primaryThreat.driver.code || primaryThreat.driver.familyName}` : 'P1 LEADER'}
          </span>
        </div>
        <div class="scenario-card-desc">
          ${primaryThreat ? `
            <strong>${primaryThreat.driver.givenName} ${primaryThreat.driver.familyName}</strong> poses the smallest margin of error. 
            Can score at most <strong>${primaryThreat.maxAdditionalPointsAllowed} more points</strong> (Max Total: ${primaryThreat.maxAllowedPointsTotal} pts). 
            <em>${primaryThreat.finishConstraint}.</em>
          ` : 'No rivals currently pose an elimination threat.'}
        </div>
      </div>

      <!-- Card 2: Pack Cannibalism & Points Sharing -->
      <div class="scenario-card" style="--scenario-color: var(--f1-cyan);">
        <div class="scenario-card-title">
          <span>Podium Points-Sharing Rule</span>
          <span class="scenario-target-badge">P2 / P3 / P4 PACK</span>
        </div>
        <div class="scenario-card-desc">
          Because only <strong>one rival can finish P2 (18 pts)</strong> per race, ${target.driver.familyName} does NOT need all rivals to DNF! 
          If rivals trade 2nd, 3rd, and 4th places across the remaining ${scenarios.remainingCount} rounds, none will score enough points to challenge ${target.driver.familyName}'s ${scenarios.targetMaxPoints} pts ceiling.
        </div>
      </div>

      <!-- Card 3: Target Max Ceiling -->
      <div class="scenario-card" style="--scenario-color: var(--f1-neon-green);">
        <div class="scenario-card-title">
          <span>${target.driver.familyName}'s Maximum Reach</span>
          <span class="scenario-target-badge">${scenarios.targetMaxPoints} PTS CEILING</span>
        </div>
        <div class="scenario-card-desc">
          Winning all ${scenarios.remainingCount} remaining GPs and ${scenarios.remainingSprints} sprints brings ${target.driver.familyName} to <strong>${scenarios.targetMaxPoints} points</strong> and <strong>${scenarios.targetMaxWins} wins</strong>, virtually guaranteeing victory on countback ties.
        </div>
      </div>
    `;

    // Render All Active Contenders Table
    const tableBody = document.getElementById('rivalsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = scenarios.rivalRequirements.map(rival => {
      const threatColor = rival.threatLevel === 'CRITICAL' ? '#FF5252' : (rival.threatLevel === 'HIGH' ? '#FFA726' : '#66BB6A');
      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="team-indicator-dot" style="background:var(--team-${this.getTeamSlug(rival.constructors?.[0])}, #FFF);"></span>
              <strong>P${rival.position}</strong> ${rival.driver.givenName} ${rival.driver.familyName} (${rival.driver.code || ''})
            </div>
          </td>
          <td><strong>${rival.currentPoints}</strong> pts</td>
          <td><span class="tab-badge" style="color:var(--f1-neon-yellow);">${rival.maxAllowedPointsTotal} pts</span></td>
          <td><span style="color:#FFF; font-weight:700;">+${rival.maxAdditionalPointsAllowed} pts</span></td>
          <td>${rival.finishConstraint}</td>
          <td>Max ${rival.maxWinsAllowed} wins</td>
          <td>
            <span class="driver-status-badge" style="background: ${threatColor}22; color: ${threatColor}; border: 1px solid ${threatColor}66;">
              ${rival.threatLevel}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Interactive What-If Permutations Race-by-Race Multi-Contender Simulator
   */
  renderSimulatorView() {
    const container = document.getElementById('raceCardsContainer');
    if (!container) return;

    container.innerHTML = '';
    const target = this.standingsData.find(s => s.Driver.driverId === this.selectedDriverId) || this.standingsData[0];
    // Get top 4 active contenders (including leader and nearest rivals)
    const topContenders = this.standingsData.slice(0, 5);

    // Presets actions
    const btnSweep = document.getElementById('btnPresetSweep');
    const btnP1P2 = document.getElementById('btnPresetP1P2');
    const btnDnf = document.getElementById('btnPresetDnf');
    const btnReset = document.getElementById('btnPresetReset');

    btnSweep.onclick = () => {
      this.simulator.applyPreset('sweep_distributed', target.Driver.driverId, topContenders);
      this.renderSimulatorView();
    };
    btnP1P2.onclick = () => {
      this.simulator.applyPreset('rival_threat_p2', target.Driver.driverId, topContenders);
      this.renderSimulatorView();
    };
    btnDnf.onclick = () => {
      this.simulator.applyPreset('leader_dnf_chaos', target.Driver.driverId, topContenders);
      this.renderSimulatorView();
    };
    btnReset.onclick = () => {
      this.simulator.applyPreset('reset', target.Driver.driverId, topContenders);
      this.renderSimulatorView();
    };

    // Render individual remaining race cards with multi-driver selectors
    this.racesData.forEach(race => {
      const pred = this.simulator.predictions[race.round] || { driverPositions: {}, fastestLapDriverId: null };

      const card = document.createElement('div');
      card.className = 'race-round-card';

      // Build driver finish controls
      let driversControlsHtml = '';
      
      // Target driver row first
      const targetPos = pred.driverPositions[target.Driver.driverId] || 1;
      const isTargetFL = pred.fastestLapDriverId === target.Driver.driverId;

      driversControlsHtml += `
        <div class="race-prediction-control" style="border-left: 3px solid var(--f1-neon-green);">
          <div class="control-label-row">
            <span style="color:#FFF; font-weight:700;">★ ${target.Driver.code || target.Driver.familyName} (Selected)</span>
            <button class="fl-toggle-btn ${isTargetFL ? 'active' : ''}" data-round="${race.round}" data-driver="${target.Driver.driverId}">
              ⏱ +1 FL
            </button>
          </div>
          <div class="prediction-select-row">
            <select class="pos-select driver-pos-select" data-round="${race.round}" data-driver="${target.Driver.driverId}">
              ${this.renderPosOptions(targetPos)}
            </select>
          </div>
        </div>
      `;

      // Top rivals rows
      topContenders.filter(c => c.Driver.driverId !== target.Driver.driverId).slice(0, 3).forEach(rival => {
        const rPos = pred.driverPositions[rival.Driver.driverId] || 2;
        const teamSlug = this.getTeamSlug(rival.Constructors?.[0]);
        driversControlsHtml += `
          <div class="race-prediction-control" style="border-left: 3px solid var(--team-${teamSlug}, rgba(255,255,255,0.2)); margin-top: 6px;">
            <div class="control-label-row">
              <span>P${rival.position} ${rival.Driver.code || rival.Driver.familyName}</span>
            </div>
            <div class="prediction-select-row">
              <select class="pos-select driver-pos-select" data-round="${race.round}" data-driver="${rival.Driver.driverId}">
                ${this.renderPosOptions(rPos)}
              </select>
            </div>
          </div>
        `;
      });

      card.innerHTML = `
        <div class="round-header-row">
          <span class="round-pill">ROUND ${race.round}</span>
          ${race.hasSprint ? '<span class="round-sprint-badge">⚡ SPRINT WEEKEND</span>' : ''}
        </div>
        <div>
          <div class="race-name-text">${race.flag} ${race.raceName}</div>
          <div class="race-meta-text">${race.circuitName} • ${race.date}</div>
        </div>
        <div class="race-controls-wrap" style="margin-top: 6px;">
          ${driversControlsHtml}
        </div>
      `;

      // Event listeners for select changes
      card.querySelectorAll('.driver-pos-select').forEach(select => {
        select.addEventListener('change', (e) => {
          const round = e.target.dataset.round;
          const driverId = e.target.dataset.driver;
          this.simulator.setDriverRacePosition(round, driverId, e.target.value);
          this.updateProjectedStandingsUI();
        });
      });

      const flBtn = card.querySelector('.fl-toggle-btn');
      flBtn?.addEventListener('click', () => {
        const round = flBtn.dataset.round;
        const driverId = flBtn.dataset.driver;
        const currentFL = pred.fastestLapDriverId === driverId;
        const newFL = currentFL ? null : driverId;
        this.simulator.setFastestLapDriver(round, newFL);
        flBtn.classList.toggle('active', !currentFL);
        this.updateProjectedStandingsUI();
      });

      container.appendChild(card);
    });

    this.updateProjectedStandingsUI();
  }

  renderPosOptions(selectedVal) {
    const positions = [
      { val: '1', label: 'P1 (25 pts)' },
      { val: '2', label: 'P2 (18 pts)' },
      { val: '3', label: 'P3 (15 pts)' },
      { val: '4', label: 'P4 (12 pts)' },
      { val: '5', label: 'P5 (10 pts)' },
      { val: '6', label: 'P6 (8 pts)' },
      { val: '7', label: 'P7 (6 pts)' },
      { val: '8', label: 'P8 (4 pts)' },
      { val: '9', label: 'P9 (2 pts)' },
      { val: '10', label: 'P10 (1 pt)' },
      { val: 'DNF', label: 'DNF / 0 pts' }
    ];
    return positions.map(p => 
      `<option value="${p.val}" ${String(selectedVal) === p.val ? 'selected' : ''}>${p.label}</option>`
    ).join('');
  }

  updateProjectedStandingsUI() {
    const target = this.standingsData.find(s => s.Driver.driverId === this.selectedDriverId) || this.standingsData[0];
    const result = this.simulator.computeProjectedStandings(target.Driver.driverId);
    
    const bannerLead = document.getElementById('projectedOutcomeLead');
    const bannerSub = document.getElementById('projectedOutcomeSub');
    const leaderboardEl = document.getElementById('projectedLeaderboard');

    const champion = result.champion;
    const isTargetChampion = result.isTargetChampion;

    if (bannerLead && bannerSub) {
      if (isTargetChampion) {
        bannerLead.innerHTML = `🏆 PROJECTED CHAMPION: <span style="color:var(--f1-neon-green);">${champion.driver.givenName} ${champion.driver.familyName}</span>`;
        bannerSub.innerHTML = `Finishes with <strong>${champion.projectedPoints} points</strong> (+${champion.addedPoints} pts in remaining races). ${result.clinchEvent ? `Clinches title at Round ${result.clinchEvent.round} (${result.clinchEvent.raceName})!` : 'Sealed at season finale!'}`;
      } else {
        const targetEntry = result.standings.find(s => s.driver.driverId === target.Driver.driverId);
        const margin = champion.projectedPoints - (targetEntry?.projectedPoints || 0);
        bannerLead.innerHTML = `🏁 TITLE TAKEN BY: <span style="color:var(--f1-neon-yellow);">${champion.driver.givenName} ${champion.driver.familyName}</span> (${champion.projectedPoints} pts)`;
        bannerSub.innerHTML = `Notice that <strong>${champion.driver.familyName}</strong> took the championship ahead of ${target.Driver.familyName} (${targetEntry?.projectedPoints || 0} pts, -${margin} pts deficit). Adjust positions or use 'Clean Sweep' preset to keep rivals in check!`;
      }
    }

    // Render Top 5 projected leaderboard pills
    if (leaderboardEl) {
      leaderboardEl.innerHTML = result.standings.slice(0, 5).map((d, idx) => `
        <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 4px 8px; font-size: 0.75rem; text-align:center;">
          <div style="color:var(--f1-gray-400); font-size:0.65rem;">P${idx + 1}</div>
          <div style="font-weight:700; color:#FFF;">${d.driver.code || d.driver.familyName.substring(0,3)}</div>
          <div style="color:var(--f1-neon-yellow); font-family:var(--font-mono);">${d.projectedPoints}</div>
        </div>
      `).join('');
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
