// --- STATE OBJECT ---
let gameState = {
  runs: 0,
  wickets: 0,
  totalLegalBalls: 0,
  currentTeam1: "Team 1",
  currentTeam2: "Team 2",
  matchMaxOvers: 10,
  currentInnings: 1,
  firstInningsRuns: 0,
  targetRuns: 0,
  isMatchOver: false,
  fixtures: [],
  striker: { name: "Batter 1", runs: 0, balls: 0, fours: 0, sixes: 0 },
  nonStriker: { name: "Batter 2", runs: 0, balls: 0, fours: 0, sixes: 0 },
  bowler: { name: "Bowler", legalBalls: 0, runsConceded: 0, wickets: 0 }
};

// --- DOM ELEMENTS ---
const runsDisplay = document.getElementById("score-runs");
const wicketsDisplay = document.getElementById("score-wickets");
const oversDisplay = document.getElementById("score-overs");
const matchTitle = document.getElementById("current-match-title");
const battingTeamDisplay = document.getElementById("batting-team");
const fixturesList = document.getElementById("fixtures-list");

const chaseInfoBox = document.getElementById("chase-info");
const targetText = document.getElementById("target-text");
const requiredText = document.getElementById("required-text");
const endInningsBtn = document.getElementById("btn-end-innings");

// --- LOCAL STORAGE HELPERS ---
function saveToStorage() {
  localStorage.setItem("cricketGameState", JSON.stringify(gameState));
}

function loadFromStorage() {
  const saved = localStorage.getItem("cricketGameState");
  if (saved) {
    try {
      gameState = JSON.parse(saved);
      renderAll();
    } catch (e) {
      console.error("Could not parse saved state", e);
    }
  }
}

// --- RENDER FUNCTIONS ---
function renderAll() {
  // Score summary
  runsDisplay.textContent = gameState.runs;
  wicketsDisplay.textContent = gameState.wickets;
  const completedOvers = Math.floor(gameState.totalLegalBalls / 6);
  const remainingBalls = gameState.totalLegalBalls % 6;
  oversDisplay.textContent = `${completedOvers}.${remainingBalls}`;

  // Headers
  matchTitle.textContent = `${gameState.currentTeam1} vs ${gameState.currentTeam2} (${gameState.matchMaxOvers} Overs)`;
  battingTeamDisplay.textContent = gameState.currentInnings === 1 ? gameState.currentTeam1 : gameState.currentTeam2;

  // Chase banner
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

  // Render Batters
  renderBatter("striker", gameState.striker);
  renderBatter("non-striker", gameState.nonStriker);

  // Render Bowler
  const bOvers = Math.floor(gameState.bowler.legalBalls / 6);
  const bBalls = gameState.bowler.legalBalls % 6;
  document.getElementById("o-bowler").textContent = `${bOvers}.${bBalls}`;
  document.getElementById("r-bowler").textContent = gameState.bowler.runsConceded;
  document.getElementById("w-bowler").textContent = gameState.bowler.wickets;
  const totalBowlerOvers = (gameState.bowler.legalBalls / 6) || 1;
  const econ = (gameState.bowler.runsConceded / totalBowlerOvers).toFixed(1);
  document.getElementById("econ-bowler").textContent = gameState.bowler.legalBalls === 0 ? "0.0" : econ;

  // Render Fixtures list
  fixturesList.innerHTML = "";
  if (!gameState.fixtures || gameState.fixtures.length === 0) {
    fixturesList.innerHTML = "<p>No matches scheduled yet.</p>";
  } else {
    gameState.fixtures.forEach(f => {
      const card = document.createElement("div");
      card.className = "fixture-item";
      card.innerHTML = `
        <div>
          <strong>${f.t1} vs ${f.t2}</strong>
          <p style="font-size: 0.85rem; color: #64748b;">${f.overs} Overs • Date: ${f.date}</p>
        </div>
        <span class="badge">Scheduled</span>
      `;
      fixturesList.appendChild(card);
    });
  }
}

function renderBatter(prefix, batter) {
  document.getElementById(`name-${prefix}`).textContent = batter.name;
  document.getElementById(`r-${prefix}`).textContent = batter.runs;
  document.getElementById(`b-${prefix}`).textContent = batter.balls;
  document.getElementById(`f-${prefix}`).textContent = batter.fours;
  document.getElementById(`s-${prefix}`).textContent = batter.sixes;
  const sr = batter.balls > 0 ? ((batter.runs / batter.balls) * 100).toFixed(1) : "0.0";
  document.getElementById(`sr-${prefix}`).textContent = sr;
}

function swapStrike() {
  const temp = gameState.striker;
  gameState.striker = gameState.nonStriker;
  gameState.nonStriker = temp;
}

// --- CENTRAL STATUS CHECKER ---
function checkInningsAndMatchStatus() {
  const maxBalls = gameState.matchMaxOvers * 6;

  // 1st Innings: Check if overs or all-out reached
  if (gameState.currentInnings === 1) {
    if (gameState.wickets >= 10 || gameState.totalLegalBalls >= maxBalls) {
      alert("Innings 1 Completed! Click 'End 1st Innings' to begin the chase.");
    }
    return;
  }

  // 2nd Innings: Check victory/loss/tie
  if (gameState.currentInnings === 2 && !gameState.isMatchOver) {
    const ballsRemaining = maxBalls - gameState.totalLegalBalls;

    // A: Chasing team achieved target
    if (gameState.runs >= gameState.targetRuns) {
      gameState.isMatchOver = true;
      saveToStorage();
      renderAll();
      alert(`🎉 ${gameState.currentTeam2} won by ${10 - gameState.wickets} wicket(s)!`);
      return;
    }

    // B: Balls finished OR All Out
    if (ballsRemaining <= 0 || gameState.wickets >= 10) {
      gameState.isMatchOver = true;
      saveToStorage();
      renderAll();
      if (gameState.runs === gameState.targetRuns - 1) {
        alert("Match Tied! 🤝");
      } else {
        const margin = (gameState.targetRuns - 1) - gameState.runs;
        alert(`🏆 ${gameState.currentTeam1} won by ${margin} runs!`);
      }
      return;
    }
  }
}

// --- GAME LOGIC ---
function addRuns(runValue) {
  if (gameState.isMatchOver) {
    alert("Match is already finished! Click 'Reset Match' to start a new match.");
    return;
  }

  const maxBalls = gameState.matchMaxOvers * 6;
  if (gameState.totalLegalBalls >= maxBalls) {
    alert("All overs for this innings have been bowled!");
    return;
  }

  // Update Score
  gameState.runs += runValue;
  gameState.totalLegalBalls += 1;

  // Update Striker
  gameState.striker.runs += runValue;
  gameState.striker.balls += 1;
  if (runValue === 4) gameState.striker.fours += 1;
  if (runValue === 6) gameState.striker.sixes += 1;

  // Update Bowler
  gameState.bowler.legalBalls += 1;
  gameState.bowler.runsConceded += runValue;

  // Swap strike on odd runs
  if (runValue % 2 !== 0) {
    swapStrike();
  }

  // Swap strike at end of over
  if (gameState.totalLegalBalls % 6 === 0) {
    swapStrike();
  }

  saveToStorage();
  renderAll();
  checkInningsAndMatchStatus();
}

// --- BUTTONS ---
document.getElementById("btn-dot").addEventListener("click", () => addRuns(0));
document.getElementById("btn-one").addEventListener("click", () => addRuns(1));
document.getElementById("btn-four").addEventListener("click", () => addRuns(4));
document.getElementById("btn-six").addEventListener("click", () => addRuns(6));

document.getElementById("btn-swap-strike").addEventListener("click", () => {
  swapStrike();
  saveToStorage();
  renderAll();
});

document.getElementById("btn-wicket").addEventListener("click", () => {
  if (gameState.isMatchOver) {
    alert("Match is already finished! Click 'Reset Match' to start a new match.");
    return;
  }

  const maxBalls = gameState.matchMaxOvers * 6;
  if (gameState.totalLegalBalls >= maxBalls) {
    alert("All overs for this innings have been bowled!");
    return;
  }

  if (gameState.wickets < 10) {
    gameState.wickets += 1;
    gameState.totalLegalBalls += 1;
    gameState.striker.balls += 1;
    gameState.bowler.legalBalls += 1;
    gameState.bowler.wickets += 1;

    // Next batter comes in
    const nextBatterNum = gameState.wickets + 2;
    gameState.striker = { name: `Batter ${nextBatterNum}`, runs: 0, balls: 0, fours: 0, sixes: 0 };

    if (gameState.totalLegalBalls % 6 === 0) {
      swapStrike();
    }

    saveToStorage();
    renderAll();
    checkInningsAndMatchStatus();
  }
});

document.getElementById("btn-extra").addEventListener("click", () => {
  if (gameState.isMatchOver) return;
  gameState.runs += 1;
  gameState.bowler.runsConceded += 1;
  saveToStorage();
  renderAll();
  checkInningsAndMatchStatus();
});

endInningsBtn.addEventListener("click", () => {
  if (gameState.currentInnings === 2) return;

  gameState.firstInningsRuns = gameState.runs;
  gameState.targetRuns = gameState.runs + 1;
  gameState.currentInnings = 2;
  gameState.runs = 0;
  gameState.wickets = 0;
  gameState.totalLegalBalls = 0;

  // Reset batter & bowler for chase
  gameState.striker = { name: "Batter 1", runs: 0, balls: 0, fours: 0, sixes: 0 };
  gameState.nonStriker = { name: "Batter 2", runs: 0, balls: 0, fours: 0, sixes: 0 };
  gameState.bowler = { name: "Bowler", legalBalls: 0, runsConceded: 0, wickets: 0 };

  saveToStorage();
  renderAll();
  alert(`Innings 1 over! ${gameState.currentTeam2} needs ${gameState.targetRuns} runs to win.`);
});

document.getElementById("btn-reset").addEventListener("click", () => {
  if (confirm("Reset current match score?")) {
    gameState.runs = 0;
    gameState.wickets = 0;
    gameState.totalLegalBalls = 0;
    gameState.currentInnings = 1;
    gameState.isMatchOver = false;
    gameState.firstInningsRuns = 0;
    gameState.targetRuns = 0;
    gameState.striker = { name: "Batter 1", runs: 0, balls: 0, fours: 0, sixes: 0 };
    gameState.nonStriker = { name: "Batter 2", runs: 0, balls: 0, fours: 0, sixes: 0 };
    gameState.bowler = { name: "Bowler", legalBalls: 0, runsConceded: 0, wickets: 0 };
    saveToStorage();
    renderAll();
  }
});

// --- FIXTURE FORM ---
document.getElementById("match-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const t1 = document.getElementById("team-a").value.trim();
  const t2 = document.getElementById("team-b").value.trim();
  const overs = parseInt(document.getElementById("match-overs").value) || 10;
  const date = document.getElementById("match-date").value;

  gameState.currentTeam1 = t1;
  gameState.currentTeam2 = t2;
  gameState.matchMaxOvers = overs;
  if (!gameState.fixtures) gameState.fixtures = [];
  gameState.fixtures.unshift({ t1, t2, overs, date });

  // Reset match for new fixture
  gameState.runs = 0;
  gameState.wickets = 0;
  gameState.totalLegalBalls = 0;
  gameState.currentInnings = 1;
  gameState.isMatchOver = false;
  gameState.firstInningsRuns = 0;
  gameState.targetRuns = 0;
  gameState.striker = { name: "Batter 1", runs: 0, balls: 0, fours: 0, sixes: 0 };
  gameState.nonStriker = { name: "Batter 2", runs: 0, balls: 0, fours: 0, sixes: 0 };
  gameState.bowler = { name: "Bowler", legalBalls: 0, runsConceded: 0, wickets: 0 };

  saveToStorage();
  renderAll();
  this.reset();
});

// --- INITIAL LOAD ---
loadFromStorage();
if (!localStorage.getItem("cricketGameState")) {
  renderAll();
}