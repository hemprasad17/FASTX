// --- STATE OBJECT ---
let gameState = {
  runs: 0,
  wickets: 0,
  totalLegalBalls: 0,
  currentTeam1: "FCG Challengers",
  currentTeam2: "Warriors",
  team1Squad: [],
  team2Squad: [],
  matchMaxOvers: 10,
  currentInnings: 1,
  firstInningsRuns: 0,
  targetRuns: 0,
  isMatchOver: false,
  fixtures: [],
  striker: { name: "Anup", runs: 0, balls: 0, fours: 0, sixes: 0 },
  nonStriker: { name: "Hem", runs: 0, balls: 0, fours: 0, sixes: 0 },
  bowler: { name: "Siraj", legalBalls: 0, runsConceded: 0, wickets: 0 },
  currentOverBalls: [],
  history: [],
  tournamentTeams: {}
};

// --- DOM REFERENCES ---
const runsDisplay = document.getElementById("score-runs");
const wicketsDisplay = document.getElementById("score-wickets");
const oversDisplay = document.getElementById("score-overs");
const matchTitle = document.getElementById("current-match-title");
const battingTeamDisplay = document.getElementById("batting-team");
const fixturesList = document.getElementById("fixtures-list");
const recentBallsContainer = document.getElementById("recent-balls");
const pointsBody = document.getElementById("points-body");
const voiceToggle = document.getElementById("voice-toggle");

const chaseInfoBox = document.getElementById("chase-info");
const targetText = document.getElementById("target-text");
const requiredText = document.getElementById("required-text");
const endInningsBtn = document.getElementById("btn-end-innings");

// --- VOICE COMMENTARY SYNTHESIZER ---
function announceCommentary(text) {
  if (!voiceToggle || !voiceToggle.checked) return;
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error", e);
    }
  }
}

// --- LOCAL STORAGE HELPERS ---
function saveToStorage() {
  try {
    localStorage.setItem("cricketGameState", JSON.stringify(gameState));
  } catch (e) {
    console.error("Storage save failed", e);
  }
}

function loadFromStorage() {
  const saved = localStorage.getItem("cricketGameState");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge saved state safely over defaults so missing fields don't cause crashes
      gameState = Object.assign({}, gameState, parsed);
      if (!Array.isArray(gameState.history)) gameState.history = [];
      if (!Array.isArray(gameState.currentOverBalls)) gameState.currentOverBalls = [];
      if (!Array.isArray(gameState.team1Squad)) gameState.team1Squad = [];
      if (!Array.isArray(gameState.team2Squad)) gameState.team2Squad = [];
      if (!gameState.tournamentTeams || typeof gameState.tournamentTeams !== 'object') gameState.tournamentTeams = {};
      if (!gameState.striker) gameState.striker = { name: "Anup", runs: 0, balls: 0, fours: 0, sixes: 0 };
      if (!gameState.nonStriker) gameState.nonStriker = { name: "Hem", runs: 0, balls: 0, fours: 0, sixes: 0 };
      if (!gameState.bowler) gameState.bowler = { name: "Siraj", legalBalls: 0, runsConceded: 0, wickets: 0 };
    } catch (e) {
      console.error("Storage corrupted, resetting default state", e);
      localStorage.removeItem("cricketGameState");
    }
  }
}

function recordHistory() {
  const snapshot = JSON.stringify({
    runs: gameState.runs,
    wickets: gameState.wickets,
    totalLegalBalls: gameState.totalLegalBalls,
    striker: { ...gameState.striker },
    nonStriker: { ...gameState.nonStriker },
    bowler: { ...gameState.bowler },
    currentInnings: gameState.currentInnings,
    isMatchOver: gameState.isMatchOver,
    currentOverBalls: [...gameState.currentOverBalls]
  });
  gameState.history.push(snapshot);
}

// --- RENDER FUNCTIONS ---
function renderAll() {
  if (runsDisplay) runsDisplay.textContent = gameState.runs;
  if (wicketsDisplay) wicketsDisplay.textContent = gameState.wickets;
  
  const completedOvers = Math.floor(gameState.totalLegalBalls / 6);
  const remainingBalls = gameState.totalLegalBalls % 6;
  if (oversDisplay) oversDisplay.textContent = `${completedOvers}.${remainingBalls}`;

  if (matchTitle) matchTitle.textContent = `${gameState.currentTeam1} vs ${gameState.currentTeam2}`;
  if (battingTeamDisplay) {
    battingTeamDisplay.textContent = gameState.currentInnings === 1 ? gameState.currentTeam1 : gameState.currentTeam2;
  }

  // Chase calculations
  if (chaseInfoBox && targetText && requiredText && endInningsBtn) {
    if (gameState.currentInnings === 2) {
      chaseInfoBox.style.display = "flex";
      targetText.textContent = `Target: ${gameState.targetRuns}`;
      const totalMatchBalls = gameState.matchMaxOvers * 6;
      const ballsRemaining = Math.max(0, totalMatchBalls - gameState.totalLegalBalls);
      const runsNeeded = Math.max(0, gameState.targetRuns - gameState.runs);

      if (gameState.isMatchOver) {
        if (gameState.runs >= gameState.targetRuns) {
          requiredText.textContent = `${gameState.currentTeam2} WON!`;
        } else if (gameState.runs === gameState.targetRuns - 1) {
          requiredText.textContent = `MATCH TIED! 🤝`;
        } else {
          requiredText.textContent = `${gameState.currentTeam1} WON!`;
        }
      } else {
        requiredText.textContent = `Need ${runsNeeded} runs in ${ballsRemaining} balls`;
      }
      endInningsBtn.textContent = "Innings 2 Active";
      endInningsBtn.disabled = true;
      endInningsBtn.style.opacity = "0.6";
    } else {
      chaseInfoBox.style.display = "none";
      endInningsBtn.textContent = "End 1st Innings";
      endInningsBtn.disabled = false;
      endInningsBtn.style.opacity = "1";
    }
  }

  // Batters & Bowler
  renderBatter("striker", gameState.striker);
  renderBatter("non-striker", gameState.nonStriker);

  const bNameEl = document.getElementById("name-bowler");
  if (bNameEl) bNameEl.textContent = gameState.bowler.name;

  const bOvers = Math.floor(gameState.bowler.legalBalls / 6);
  const bBalls = gameState.bowler.legalBalls % 6;
  const oBowlEl = document.getElementById("o-bowler");
  const rBowlEl = document.getElementById("r-bowler");
  const wBowlEl = document.getElementById("w-bowler");
  const econBowlEl = document.getElementById("econ-bowler");

  if (oBowlEl) oBowlEl.textContent = `${bOvers}.${bBalls}`;
  if (rBowlEl) rBowlEl.textContent = gameState.bowler.runsConceded;
  if (wBowlEl) wBowlEl.textContent = gameState.bowler.wickets;

  const totalBowlerOvers = (gameState.bowler.legalBalls / 6) || 1;
  const econ = (gameState.bowler.runsConceded / totalBowlerOvers).toFixed(1);
  if (econBowlEl) econBowlEl.textContent = gameState.bowler.legalBalls === 0 ? "0.0" : econ;

  renderBallStrip();
  renderFixtures();
  renderPointsTable();
}

function renderBatter(prefix, batter) {
  const n = document.getElementById(`name-${prefix}`);
  const r = document.getElementById(`r-${prefix}`);
  const b = document.getElementById(`b-${prefix}`);
  const f = document.getElementById(`f-${prefix}`);
  const s = document.getElementById(`s-${prefix}`);
  const sr = document.getElementById(`sr-${prefix}`);

  if (n) n.textContent = batter.name;
  if (r) r.textContent = batter.runs;
  if (b) b.textContent = batter.balls;
  if (f) f.textContent = batter.fours;
  if (s) s.textContent = batter.sixes;
  const strikeRate = batter.balls > 0 ? ((batter.runs / batter.balls) * 100).toFixed(1) : "0.0";
  if (sr) sr.textContent = strikeRate;
}

function renderBallStrip() {
  if (!recentBallsContainer) return;
  recentBallsContainer.innerHTML = "";
  if (!gameState.currentOverBalls || gameState.currentOverBalls.length === 0) {
    recentBallsContainer.innerHTML = "<span style='color:#64748b; font-size:0.8rem;'>New over</span>";
    return;
  }

  gameState.currentOverBalls.forEach(ball => {
    const circle = document.createElement("div");
    circle.className = "ball-circle";
    circle.textContent = ball;
    if (ball === "4") circle.classList.add("four");
    else if (ball === "6") circle.classList.add("six");
    else if (ball === "W") circle.classList.add("wicket");
    else if (ball.includes("wd") || ball.includes("nb")) circle.classList.add("extra");
    recentBallsContainer.appendChild(circle);
  });
}

function renderFixtures() {
  if (!fixturesList) return;
  fixturesList.innerHTML = "";
  if (!gameState.fixtures || gameState.fixtures.length === 0) {
    fixturesList.innerHTML = "<p style='color: #64748b;'>No matches scheduled yet.</p>";
  } else {
    gameState.fixtures.forEach(f => {
      const card = document.createElement("div");
      card.className = "fixture-item";
      card.innerHTML = `
        <div>
          <strong>${f.t1} vs ${f.t2}</strong>
          <p style="font-size: 0.8rem; color: #64748b;">${f.overs} Overs • ${f.date}</p>
        </div>
        <span class="badge">Scheduled</span>
      `;
      fixturesList.appendChild(card);
    });
  }
}

function renderPointsTable() {
  if (!pointsBody) return;
  pointsBody.innerHTML = "";
  const teams = Object.keys(gameState.tournamentTeams || {});

  if (teams.length === 0) {
    pointsBody.innerHTML = `<tr><td colspan="6" style="color: #64748b; text-align: center;">Complete matches to generate standings</td></tr>`;
    return;
  }

  const teamList = teams.map(name => {
    const t = gameState.tournamentTeams[name];
    const forOvers = (t.ballsFaced || 0) / 6 || 1;
    const againstOvers = (t.ballsBowled || 0) / 6 || 1;
    const runRateFor = (t.runsScored || 0) / forOvers;
    const runRateAgainst = (t.runsConceded || 0) / againstOvers;
    const nrr = (runRateFor - runRateAgainst).toFixed(3);
    return { name, ...t, nrr };
  });

  teamList.sort((a, b) => b.pts - a.pts || b.nrr - a.nrr);

  teamList.forEach(team => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${team.name}</strong></td>
      <td>${team.p}</td>
      <td style="color: #4ade80;">${team.w}</td>
      <td style="color: #f87171;">${team.l}</td>
      <td><strong>${team.pts}</strong></td>
      <td style="color: ${team.nrr >= 0 ? '#4ade80' : '#f87171'}; font-weight:700;">${team.nrr > 0 ? '+' + team.nrr : team.nrr}</td>
    `;
    pointsBody.appendChild(tr);
  });
}

function updateTournamentRecord(winner, loser, isTie) {
  if (!gameState.tournamentTeams) gameState.tournamentTeams = {};

  const initTeam = (t) => {
    if (!gameState.tournamentTeams[t]) {
      gameState.tournamentTeams[t] = { p: 0, w: 0, l: 0, pts: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 };
    }
  };

  initTeam(gameState.currentTeam1);
  initTeam(gameState.currentTeam2);

  const t1 = gameState.tournamentTeams[gameState.currentTeam1];
  const t2 = gameState.tournamentTeams[gameState.currentTeam2];

  t1.p += 1;
  t2.p += 1;

  if (isTie) {
    t1.pts += 1;
    t2.pts += 1;
  } else {
    gameState.tournamentTeams[winner].w += 1;
    gameState.tournamentTeams[winner].pts += 2;
    gameState.tournamentTeams[loser].l += 1;
  }

  t1.runsScored += gameState.firstInningsRuns;
  t1.ballsFaced += gameState.matchMaxOvers * 6;
  t1.runsConceded += gameState.runs;
  t1.ballsBowled += gameState.totalLegalBalls;

  t2.runsScored += gameState.runs;
  t2.ballsFaced += gameState.totalLegalBalls;
  t2.runsConceded += gameState.firstInningsRuns;
  t2.ballsBowled += gameState.matchMaxOvers * 6;

  saveToStorage();
  renderAll();
}

function swapStrike() {
  const temp = gameState.striker;
  gameState.striker = gameState.nonStriker;
  gameState.nonStriker = temp;
}

function promptPlayerName(role, currentName) {
  const isTeam1Batting = gameState.currentInnings === 1;
  const battingSquad = isTeam1Batting ? gameState.team1Squad : gameState.team2Squad;
  const bowlingSquad = isTeam1Batting ? gameState.team2Squad : gameState.team1Squad;
  const squad = role === "bowler" ? bowlingSquad : battingSquad;

  if (squad && squad.length > 0) {
    const list = squad.map((p, idx) => `${idx + 1}. ${p}`).join("\n");
    const choice = prompt(`Select ${role} (enter number) or type a name:\n\n${list}`, currentName);
    if (!choice) return currentName;
    const num = parseInt(choice);
    if (!isNaN(num) && squad[num - 1]) return squad[num - 1];
    return choice.trim();
  }
  return prompt(`Enter ${role} name:`, currentName) || currentName;
}

// Click to rename
const nameStr = document.getElementById("name-striker");
const nameNonStr = document.getElementById("name-non-striker");
const nameBowl = document.getElementById("name-bowler");

if (nameStr) nameStr.addEventListener("click", () => {
  gameState.striker.name = promptPlayerName("Striker", gameState.striker.name);
  saveToStorage();
  renderAll();
});
if (nameNonStr) nameNonStr.addEventListener("click", () => {
  gameState.nonStriker.name = promptPlayerName("Non-Striker", gameState.nonStriker.name);
  saveToStorage();
  renderAll();
});
if (nameBowl) nameBowl.addEventListener("click", () => {
  gameState.bowler.name = promptPlayerName("bowler", gameState.bowler.name);
  saveToStorage();
  renderAll();
});

// --- MATCH STATUS CHECKER ---
function checkInningsAndMatchStatus() {
  const maxBalls = gameState.matchMaxOvers * 6;

  if (gameState.currentInnings === 1) {
    if (gameState.wickets >= 10 || gameState.totalLegalBalls >= maxBalls) {
      announceCommentary(`Innings complete! ${gameState.currentTeam1} scored ${gameState.runs} runs.`);
      alert("Innings 1 Completed! Click 'End 1st Innings' to begin the chase.");
    }
    return;
  }

  if (gameState.currentInnings === 2 && !gameState.isMatchOver) {
    const ballsRemaining = maxBalls - gameState.totalLegalBalls;

    if (gameState.runs >= gameState.targetRuns) {
      gameState.isMatchOver = true;
      const margin = 10 - gameState.wickets;
      announceCommentary(`What a finish! ${gameState.currentTeam2} wins the match by ${margin} wickets!`);
      updateTournamentRecord(gameState.currentTeam2, gameState.currentTeam1, false);
      alert(`🎉 ${gameState.currentTeam2} won by ${margin} wicket(s)!`);
      return;
    }

    if (ballsRemaining <= 0 || gameState.wickets >= 10) {
      gameState.isMatchOver = true;
      if (gameState.runs === gameState.targetRuns - 1) {
        announceCommentary("Incredible scenes! The match has ended in a thrilling tie!");
        updateTournamentRecord(gameState.currentTeam1, gameState.currentTeam2, true);
        alert("Match Tied! 🤝");
      } else {
        const margin = (gameState.targetRuns - 1) - gameState.runs;
        announceCommentary(`${gameState.currentTeam1} has defended the target, winning by ${margin} runs!`);
        updateTournamentRecord(gameState.currentTeam1, gameState.currentTeam2, false);
        alert(`🏆 ${gameState.currentTeam1} won by ${margin} runs!`);
      }
      return;
    }
  }
}

// --- SCORING ACTIONS ---
function addRuns(runValue) {
  if (gameState.isMatchOver) {
    alert("Match is finished! Click 'Reset' to start a new fixture.");
    return;
  }

  const maxBalls = gameState.matchMaxOvers * 6;
  if (gameState.totalLegalBalls >= maxBalls) return;

  recordHistory();

  if (gameState.totalLegalBalls % 6 === 0) {
    gameState.currentOverBalls = [];
  }

  gameState.runs += runValue;
  gameState.totalLegalBalls += 1;
  gameState.currentOverBalls.push(runValue === 0 ? "•" : `${runValue}`);

  gameState.striker.runs += runValue;
  gameState.striker.balls += 1;
  if (runValue === 4) {
    gameState.striker.fours += 1;
    announceCommentary(`Shot! Four runs to ${gameState.striker.name}!`);
  } else if (runValue === 6) {
    gameState.striker.sixes += 1;
    announceCommentary(`Massive hit! Six runs from ${gameState.striker.name}!`);
  } else if (runValue === 1) {
    announceCommentary(`Single taken.`);
  }

  gameState.bowler.legalBalls += 1;
  gameState.bowler.runsConceded += runValue;

  if (runValue % 2 !== 0) swapStrike();
  if (gameState.totalLegalBalls % 6 === 0) {
    swapStrike();
    announceCommentary(`End of the over. Score is ${gameState.runs} for ${gameState.wickets}.`);
  }

  saveToStorage();
  renderAll();
  checkInningsAndMatchStatus();
}

// Button Events
const bDot = document.getElementById("btn-dot");
const bOne = document.getElementById("btn-one");
const bFour = document.getElementById("btn-four");
const bSix = document.getElementById("btn-six");
const bSwap = document.getElementById("btn-swap-strike");
const bWicket = document.getElementById("btn-wicket");
const bExtra = document.getElementById("btn-extra");
const bUndo = document.getElementById("btn-undo");
const bReset = document.getElementById("btn-reset");

if (bDot) bDot.addEventListener("click", () => addRuns(0));
if (bOne) bOne.addEventListener("click", () => addRuns(1));
if (bFour) bFour.addEventListener("click", () => addRuns(4));
if (bSix) bSix.addEventListener("click", () => addRuns(6));
if (bSwap) bSwap.addEventListener("click", () => {
  recordHistory();
  swapStrike();
  saveToStorage();
  renderAll();
});

if (bWicket) bWicket.addEventListener("click", () => {
  if (gameState.isMatchOver) return;
  const maxBalls = gameState.matchMaxOvers * 6;
  if (gameState.totalLegalBalls >= maxBalls) return;

  if (gameState.wickets < 10) {
    recordHistory();
    if (gameState.totalLegalBalls % 6 === 0) gameState.currentOverBalls = [];

    gameState.wickets += 1;
    gameState.totalLegalBalls += 1;
    gameState.currentOverBalls.push("W");
    gameState.striker.balls += 1;
    gameState.bowler.legalBalls += 1;
    gameState.bowler.wickets += 1;

    announceCommentary(`Out! Wicket down! ${gameState.striker.name} has to walk back!`);

    const defaultName = `Batter ${gameState.wickets + 2}`;
    const nextBatter = promptPlayerName("Next Batter", defaultName);
    gameState.striker = { name: (nextBatter || defaultName).trim(), runs: 0, balls: 0, fours: 0, sixes: 0 };

    if (gameState.totalLegalBalls % 6 === 0) swapStrike();

    saveToStorage();
    renderAll();
    checkInningsAndMatchStatus();
  }
});

if (bExtra) bExtra.addEventListener("click", () => {
  if (gameState.isMatchOver) return;
  recordHistory();
  gameState.runs += 1;
  gameState.bowler.runsConceded += 1;
  gameState.currentOverBalls.push("wd");
  announceCommentary("Wide ball signaled by the umpire.");
  saveToStorage();
  renderAll();
  checkInningsAndMatchStatus();
});

if (bUndo) bUndo.addEventListener("click", () => {
  if (!gameState.history || gameState.history.length === 0) {
    alert("Nothing to undo!");
    return;
  }
  const prev = JSON.parse(gameState.history.pop());
  gameState.runs = prev.runs;
  gameState.wickets = prev.wickets;
  gameState.totalLegalBalls = prev.totalLegalBalls;
  gameState.striker = prev.striker;
  gameState.nonStriker = prev.nonStriker;
  gameState.bowler = prev.bowler;
  gameState.currentInnings = prev.currentInnings;
  gameState.isMatchOver = prev.isMatchOver;
  gameState.currentOverBalls = prev.currentOverBalls;

  saveToStorage();
  renderAll();
});

if (endInningsBtn) endInningsBtn.addEventListener("click", () => {
  if (gameState.currentInnings === 2) return;
  recordHistory();
  gameState.firstInningsRuns = gameState.runs;
  gameState.targetRuns = gameState.runs + 1;
  gameState.currentInnings = 2;
  gameState.runs = 0;
  gameState.wickets = 0;
  gameState.totalLegalBalls = 0;
  gameState.currentOverBalls = [];

  const b1 = promptPlayerName("2nd Innings Striker", "Batter 1");
  const b2 = promptPlayerName("2nd Innings Non-Striker", "Batter 2");
  const bowl = promptPlayerName("bowler", "Bowler");

  gameState.striker = { name: (b1 || "Batter 1").trim(), runs: 0, balls: 0, fours: 0, sixes: 0 };
  gameState.nonStriker = { name: (b2 || "Batter 2").trim(), runs: 0, balls: 0, fours: 0, sixes: 0 };
  gameState.bowler = { name: (bowl || "Bowler").trim(), legalBalls: 0, runsConceded: 0, wickets: 0 };

  saveToStorage();
  renderAll();
  announceCommentary(`Target set! ${gameState.currentTeam2} requires ${gameState.targetRuns} runs to win.`);
});

if (bReset) bReset.addEventListener("click", () => {
  if (confi
