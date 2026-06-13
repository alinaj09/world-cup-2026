// --- Data State Management ---
let appState = {
    resultsR1: {},
    resultsR2: {},
    resultsR3: {},
    resultsR32: {},
    resultsR16: {},
    resultsQF: {},
    resultsSF: {},
    resultsFinal: {},
    knockoutMatches: {
        r32: [], r16: [], qf: [], sf: [], final: []
    },
    actualQualifiers: {},
    thirdPlaceQualifiers: [],
    predictions: APP_DATA.predictions
};

// Generate R2 and R3 Matches based on standard FIFA format
// For 4 teams: A, B, C, D
// R1: A-B, C-D
// R2: A-C, B-D
// R3: A-D, B-C
const matchesR2 = [];
const matchesR3 = [];
let matchIdR2 = 1;
let matchIdR3 = 1;

for (const [group, teams] of Object.entries(APP_DATA.groups)) {
    const [A, B, C, D] = teams;
    
    matchesR2.push({ id: `R2-${matchIdR2++}`, home: A, away: C, group: group });
    matchesR2.push({ id: `R2-${matchIdR2++}`, home: B, away: D, group: group });
    
    matchesR3.push({ id: `R3-${matchIdR3++}`, home: A, away: D, group: group });
    matchesR3.push({ id: `R3-${matchIdR3++}`, home: B, away: C, group: group });
}

APP_DATA.matchesR2 = matchesR2;
APP_DATA.matchesR3 = matchesR3;

const API_URL = "https://script.google.com/macros/s/AKfycbzhp03eYnblJv8crECn1WWhgwUi-pBPvlK9FBEUupChawykNGw0rwnDsK2EhgNX11_L/exec";

// Load from LocalStorage if exists for Admin data
const savedState = localStorage.getItem('wc2026State');
if (savedState) {
    const parsed = JSON.parse(savedState);
    appState.resultsR1 = parsed.resultsR1 || {};
    appState.resultsR2 = parsed.resultsR2 || {};
    appState.resultsR3 = parsed.resultsR3 || {};
    appState.actualQualifiers = parsed.actualQualifiers || {};
    appState.thirdPlaceQualifiers = parsed.thirdPlaceQualifiers || [];
    
    appState.resultsR32 = parsed.resultsR32 || {};
    appState.resultsR16 = parsed.resultsR16 || {};
    appState.resultsQF = parsed.resultsQF || {};
    appState.resultsSF = parsed.resultsSF || {};
    appState.resultsFinal = parsed.resultsFinal || {};
    if (parsed.knockoutMatches) appState.knockoutMatches = parsed.knockoutMatches;
    
    // Merge predictions carefully so we don't lose R1 from data.js
    if (parsed.predictions) {
        Object.keys(parsed.predictions).forEach(p => {
            if (!appState.predictions[p]) appState.predictions[p] = { r1: {}, r2: {}, r3: {}, qualifiers: {}, r32: {}, r16: {}, qf: {}, sf: {}, final: {} };
            appState.predictions[p].r2 = { ...appState.predictions[p].r2, ...(parsed.predictions[p].r2 || {}) };
            appState.predictions[p].r3 = { ...appState.predictions[p].r3, ...(parsed.predictions[p].r3 || {}) };
            appState.predictions[p].qualifiers = { ...appState.predictions[p].qualifiers, ...(parsed.predictions[p].qualifiers || {}) };
            appState.predictions[p].r32 = { ...appState.predictions[p].r32, ...(parsed.predictions[p].r32 || {}) };
            appState.predictions[p].r16 = { ...appState.predictions[p].r16, ...(parsed.predictions[p].r16 || {}) };
            appState.predictions[p].qf = { ...appState.predictions[p].qf, ...(parsed.predictions[p].qf || {}) };
            appState.predictions[p].sf = { ...appState.predictions[p].sf, ...(parsed.predictions[p].sf || {}) };
            appState.predictions[p].final = { ...appState.predictions[p].final, ...(parsed.predictions[p].final || {}) };
        });
    }
}

// Deadlines (Oman Time GMT+4)
const ROUND_2_DEADLINE = new Date('2026-06-18T00:00:00+04:00'); 
const isRound2Locked = new Date() > ROUND_2_DEADLINE;

const ROUND_3_DEADLINE = new Date('2026-06-23T00:00:00+04:00'); 
const isRound3Locked = new Date() > ROUND_3_DEADLINE;

const ROUND_32_DEADLINE = new Date('2026-06-28T00:00:00+04:00');
const isRound32Locked = new Date() > ROUND_32_DEADLINE;

const ROUND_16_DEADLINE = new Date('2026-07-02T00:00:00+04:00');
const isRound16Locked = new Date() > ROUND_16_DEADLINE;

const QF_DEADLINE = new Date('2026-07-08T00:00:00+04:00');
const isQFLocked = new Date() > QF_DEADLINE;

const SF_DEADLINE = new Date('2026-07-13T00:00:00+04:00');
const isSFLocked = new Date() > SF_DEADLINE;

const FINAL_DEADLINE = new Date('2026-07-18T00:00:00+04:00');
const isFinalLocked = new Date() > FINAL_DEADLINE;

const knockoutDeadlines = {
    r32: isRound32Locked,
    r16: isRound16Locked,
    qf: isQFLocked,
    sf: isSFLocked,
    final: isFinalLocked
};

const knockoutDeadlineDates = {
    r32: ROUND_32_DEADLINE,
    r16: ROUND_16_DEADLINE,
    qf: QF_DEADLINE,
    sf: SF_DEADLINE,
    final: FINAL_DEADLINE
};

function formatDeadline(dateObj) {
    const options = { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' 
    };
    return new Intl.DateTimeFormat('ar-OM', options).format(dateObj);
}


// Fetch predictions from Google Sheet
async function loadPredictionsFromSheet() {
    try {
        const response = await fetch(API_URL, { redirect: "follow" });
        const data = await response.json();
        
        data.forEach(row => {
            if (!appState.predictions[row.participant]) {
                appState.predictions[row.participant] = { r1: {}, r2: {}, r3: {}, qualifiers: {} };
            }
            if (!appState.predictions[row.participant][row.round]) {
                appState.predictions[row.participant][row.round] = {};
            }
            appState.predictions[row.participant][row.round][row.matchId] = row.prediction;
        });
        
        // Recalculate leaderboard with new data
        calculateLeaderboard();
        renderRound1Tab();
        renderQualifiersTab();
        console.log("Loaded predictions from sheet successfully");
    } catch (e) {
        console.error("Error loading predictions from sheet:", e);
    }
}

// Auto-refresh predictions every 30 seconds
setInterval(loadPredictionsFromSheet, 30000);

// ESPN Automation
async function fetchESPNData() {
    try {
        const url = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260610-20260725&limit=150";
        const res = await fetch(url);
        const data = await res.json();
        
        if (!data || !data.events) return;
        
        let updated = false;
        
        data.events.forEach(event => {
            try {
                const comp = event.competitions?.[0];
                if (!comp || !comp.competitors) return;
                
                const homeTeamEng = comp.competitors.find(c => c.homeAway === 'home')?.team?.name;
                const awayTeamEng = comp.competitors.find(c => c.homeAway === 'away')?.team?.name;
                
                // Map using TEAM_MAP from data.js
                const homeTeam = typeof TEAM_MAP !== 'undefined' && TEAM_MAP[homeTeamEng] ? TEAM_MAP[homeTeamEng] : homeTeamEng;
                const awayTeam = typeof TEAM_MAP !== 'undefined' && TEAM_MAP[awayTeamEng] ? TEAM_MAP[awayTeamEng] : awayTeamEng;
                
                const homeScore = parseInt(comp.competitors.find(c => c.homeAway === 'home')?.score || '0');
                const awayScore = parseInt(comp.competitors.find(c => c.homeAway === 'away')?.score || '0');
                
                const status = event.status?.type?.name || '';
                
                if (status && !status.includes('SCHEDULED') && !status.includes('POSTPONED') && !status.includes('CANCELED')) {
                // Find match in our group stage data
                const allMatches = [
                    { list: APP_DATA.matchesR1, dest: appState.resultsR1 },
                    { list: APP_DATA.matchesR2, dest: appState.resultsR2 },
                    { list: APP_DATA.matchesR3, dest: appState.resultsR3 }
                ];
                
                let foundInGroup = false;
                for (const round of allMatches) {
                    const match = round.list.find(m => 
                        (m.home === homeTeam && m.away === awayTeam) || 
                        (m.home === awayTeam && m.away === homeTeam)
                    );
                    if (match) {
                        foundInGroup = true;
                        // Ensure we respect the home/away assignment in our DB
                        if (match.home === homeTeam) {
                            round.dest[match.id] = { home: homeScore, away: awayScore };
                        } else {
                            round.dest[match.id] = { home: awayScore, away: homeScore };
                        }
                        updated = true;
                        break;
                    }
                }
                
                // If not found in group, it's a knockout match
                if (!foundInGroup && homeTeam && awayTeam) {
                    // Determine round
                    let koRound = 'r32';
                    const notes = comp.notes?.[0]?.headline?.toLowerCase() || '';
                    if (notes.includes('16')) koRound = 'r16';
                    else if (notes.includes('quarter')) koRound = 'qf';
                    else if (notes.includes('semi')) koRound = 'sf';
                    else if (notes.includes('final')) koRound = 'final';
                    
                    if (!appState.knockoutMatches[koRound]) appState.knockoutMatches[koRound] = [];
                    
                    // Add to bracket if not exists
                    let matchObj = appState.knockoutMatches[koRound].find(m => 
                        (m.home === homeTeam && m.away === awayTeam) || 
                        (m.home === awayTeam && m.away === homeTeam)
                    );
                    
                    if (!matchObj) {
                        const newId = `${koRound}-${appState.knockoutMatches[koRound].length + 1}`;
                        matchObj = { id: newId, home: homeTeam, away: awayTeam };
                        appState.knockoutMatches[koRound].push(matchObj);
                        updated = true;
                    }
                    
                    // Update result
                    const resultsMap = {
                        'r32': appState.resultsR32,
                        'r16': appState.resultsR16,
                        'qf': appState.resultsQF,
                        'sf': appState.resultsSF,
                        'final': appState.resultsFinal
                    };
                    
                    if (matchObj.home === homeTeam) {
                        resultsMap[koRound][matchObj.id] = { home: homeScore, away: awayScore };
                    } else {
                        resultsMap[koRound][matchObj.id] = { home: awayScore, away: homeScore };
                    }
                    updated = true;
                }
                } // This closes the if (status && !status.includes('SCHEDULED') ...) block!
            } catch (err) {
                console.warn("Skipped an event due to missing data", err);
            }
        });
        
        if (updated) {
            propagateKnockoutWinners();
            saveState();
            console.log("ESPN data applied successfully.");
        }
    } catch (e) {
        console.error("Error fetching ESPN data:", e);
    }
}

// Fetch ESPN data immediately and then every minute
fetchESPNData();
setInterval(fetchESPNData, 60000);



// Save state helper
function saveState() {
    localStorage.setItem('wc2026State', JSON.stringify(appState));
    calculateLeaderboard();
    renderRound1Tab();
    renderQualifiersTab();
}

// --- Scoring Logic ---

// Calculate match score (0, 1, 2, 3, or 5 points)
function calculateMatchPoints(actualHome, actualAway, predHome, predAway) {
    if (actualHome === undefined || actualAway === undefined) return 0;
    if (predHome === undefined || predAway === undefined) return 0;
    
    const actualDiff = actualHome - actualAway;
    const predDiff = predHome - predAway;
    
    const actualWinner = actualDiff > 0 ? 'home' : (actualDiff < 0 ? 'away' : 'draw');
    const predWinner = predDiff > 0 ? 'home' : (predDiff < 0 ? 'away' : 'draw');
    
    // — توقعت النتيجة كاملة صح → 5 نقاط
    if (actualHome === predHome && actualAway === predAway) return 5;
    
    const winnerCorrect = actualWinner === predWinner;
    let goalsCorrect = 0;
    if (actualHome === predHome) goalsCorrect++;
    if (actualAway === predAway) goalsCorrect++;
    
    // — توقعت الفائز صح ونتيجة فريق واحد صح → 3 نقاط
    if (winnerCorrect && goalsCorrect === 1) return 3;
    
    // — توقعت الفائز صح فقط → 2 نقطتين
    if (winnerCorrect && goalsCorrect === 0) return 2;
    
    // — توقعت أهداف فريق واحد صح فقط → 1 نقطة
    if (!winnerCorrect && goalsCorrect === 1) return 1;
    
    // — الفائز غلط والنتيجة غلط → 0 نقاط
    return 0;
}

// Calculate qualifiers score
function calculateQualifierPoints(actualFirst, actualSecond, predFirst, predSecond) {
    if (!actualFirst || !actualSecond) return 0;
    if (!predFirst && !predSecond) return 0;
    
    let points = 0;
    
    // Check first place
    if (predFirst === actualFirst) points += 4;
    else if (predFirst === actualSecond) points += 2;
    
    // Check second place
    if (predSecond === actualSecond) points += 4;
    else if (predSecond === actualFirst) points += 2;
    
    return points;
}

function calculateLeaderboard() {
    const leaderboard = [];
    
    APP_DATA.participants.forEach(p => {
        let r1Points = 0;
        let r2Points = 0;
        let r3Points = 0;
        let qualPoints = 0;
        
        const preds = appState.predictions[p] || {};
        
        // Calculate R1
        if (preds.r1) {
            APP_DATA.matchesR1.forEach(m => {
                const actual = (appState.resultsR1 || {})[m.id];
                const pred = preds.r1[m.id];
                if (actual && pred) {
                    r1Points += calculateMatchPoints(actual.home, actual.away, pred.home, pred.away);
                }
            });
        }
        
        // Calculate R2
        if (preds.r2) {
            APP_DATA.matchesR2.forEach(m => {
                const actual = (appState.resultsR2 || {})[m.id];
                const pred = preds.r2[m.id];
                if (actual && pred) {
                    r2Points += calculateMatchPoints(actual.home, actual.away, pred.home, pred.away);
                }
            });
        }

        // Calculate R3
        if (preds.r3) {
            APP_DATA.matchesR3.forEach(m => {
                const actual = (appState.resultsR3 || {})[m.id];
                const pred = preds.r3[m.id];
                if (actual && pred) {
                    r3Points += calculateMatchPoints(actual.home, actual.away, pred.home, pred.away);
                }
            });
        }
        
        // Calculate Qualifiers
        if (preds.qualifiers) {
            Object.keys(APP_DATA.groups).forEach(g => {
                const actual = (appState.actualQualifiers || {})[g];
                const pred = preds.qualifiers[g];
                if (actual && pred) {
                    qualPoints += calculateQualifierPoints(actual.first, actual.second, pred.first, pred.second);
                }
            });
        }

        let koPoints = 0;
        const koRounds = ['r32', 'r16', 'qf', 'sf', 'final'];
        const resultsMap = {
            'r32': appState.resultsR32,
            'r16': appState.resultsR16,
            'qf': appState.resultsQF,
            'sf': appState.resultsSF,
            'final': appState.resultsFinal
        };
        
        koRounds.forEach(round => {
            if (preds[round]) {
                const matches = appState.knockoutMatches[round] || [];
                matches.forEach(m => {
                    const actual = (resultsMap[round] || {})[m.id];
                    const pred = preds[round][m.id];
                    if (actual && pred) {
                        koPoints += calculateMatchPoints(actual.home, actual.away, pred.home, pred.away);
                    }
                });
            }
        });
        
        leaderboard.push({
            name: p,
            groupsStage: r1Points + r2Points + r3Points,
            qual: qualPoints,
            knockouts: koPoints,
            total: r1Points + r2Points + r3Points + qualPoints + koPoints
        });
    });
    
    // Sort descending
    leaderboard.sort((a, b) => b.total - a.total);
    renderLeaderboard(leaderboard);
}

// --- UI Rendering ---

function renderLeaderboard(data) {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    data.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.className = `rank-${idx + 1}`;
        
        tr.innerHTML = `
            <td><span class="rank-badge">${idx + 1}</span></td>
            <td><strong>${row.name}</strong></td>
            <td>${row.groupsStage}</td>
            <td>${row.qual}</td>
            <td>${row.knockouts}</td>
            <td class="total-points">${row.total}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAdminPanel() {
    let scoreOptions = '<option value="">-</option>';
    for(let i=0; i<=15; i++) scoreOptions += `<option value="${i}">${i}</option>`;

    // Render R1 Results Admin
    const r1Admin = document.getElementById('admin-round1-matches');
    if (r1Admin) {
        let r1Html = '';
        const safeResultsR1 = appState.resultsR1 || {};
        APP_DATA.matchesR1.forEach(m => {
            const res = safeResultsR1[m.id] || { home: '', away: '' };
            r1Html += `
                <div class="score-input-group">
                    <span style="flex:1; text-align:right;">${m.home}</span>
                    <select class="score-input" id="act-home-${m.id}">
                        ${scoreOptions.replace(`value="${res.home}"`, `value="${res.home}" selected`)}
                    </select>
                    <span> - </span>
                    <select class="score-input" id="act-away-${m.id}">
                        ${scoreOptions.replace(`value="${res.away}"`, `value="${res.away}" selected`)}
                    </select>
                    <span style="flex:1; text-align:left;">${m.away}</span>
                </div>
            `;
        });
        r1Admin.innerHTML = r1Html;
    }

    // Render R2 Results Admin
    const r2Admin = document.getElementById('admin-round2-matches');
    if (r2Admin) {
        let r2Html = '';
        const safeResultsR2 = appState.resultsR2 || {};
        APP_DATA.matchesR2.forEach(m => {
            const res = safeResultsR2[m.id] || { home: '', away: '' };
            r2Html += `
                <div class="score-input-group">
                    <span style="flex:1; text-align:right;">${m.home}</span>
                    <select class="score-input" id="act-home-${m.id}">
                        ${scoreOptions.replace(`value="${res.home}"`, `value="${res.home}" selected`)}
                    </select>
                    <span> - </span>
                    <select class="score-input" id="act-away-${m.id}">
                        ${scoreOptions.replace(`value="${res.away}"`, `value="${res.away}" selected`)}
                    </select>
                    <span style="flex:1; text-align:left;">${m.away}</span>
                </div>
            `;
        });
        r2Admin.innerHTML = r2Html;
    }

    // Render R3 Results Admin
    const r3Admin = document.getElementById('admin-round3-matches');
    if (r3Admin) {
        let r3Html = '';
        const safeResultsR3 = appState.resultsR3 || {};
        APP_DATA.matchesR3.forEach(m => {
            const res = safeResultsR3[m.id] || { home: '', away: '' };
            r3Html += `
                <div class="score-input-group">
                    <span style="flex:1; text-align:right;">${m.home}</span>
                    <select class="score-input" id="act-home-${m.id}">
                        ${scoreOptions.replace(`value="${res.home}"`, `value="${res.home}" selected`)}
                    </select>
                    <span> - </span>
                    <select class="score-input" id="act-away-${m.id}">
                        ${scoreOptions.replace(`value="${res.away}"`, `value="${res.away}" selected`)}
                    </select>
                    <span style="flex:1; text-align:left;">${m.away}</span>
                </div>
            `;
        });
        r3Admin.innerHTML = r3Html;
    }
    
    // Render Qualifiers Admin
    const qualAdmin = document.getElementById('admin-qualifiers');
    if (qualAdmin) {
        let qualHtml = '';
        const safeQualifiers = appState.actualQualifiers || {};
        Object.keys(APP_DATA.groups).forEach(g => {
            const teams = APP_DATA.groups[g];
            const res = safeQualifiers[g] || { first: '', second: '' };
            
            let teamOptions = '<option value="">--</option>';
            teams.forEach(t => teamOptions += `<option value="${t}">${t}</option>`);
            
            qualHtml += `
                <div class="form-group" style="margin-bottom: 10px;">
                    <label>مجموعة ${g}</label>
                    <div style="display:flex; gap:10px;">
                        <select id="act-qual-1-${g}">
                            ${teamOptions.replace(`value="${res.first}"`, `value="${res.first}" selected`)}
                        </select>
                        <select id="act-qual-2-${g}">
                            ${teamOptions.replace(`value="${res.second}"`, `value="${res.second}" selected`)}
                        </select>
                    </div>
                </div>
            `;
        });
        qualAdmin.innerHTML = qualHtml;
    }

    // Render 3rd Place Admin
    const thirdPlaceAdmin = document.getElementById('admin-third-place');
    if (thirdPlaceAdmin) {
        let tpHtml = '';
        const safeThirdPlace = appState.thirdPlaceQualifiers || [];
        
        // Collect all teams to allow selection
        let allTeams = [];
        Object.values(APP_DATA.groups).forEach(teams => allTeams.push(...teams));
        allTeams.sort();
        
        let allTeamOptions = '<option value="">-- اختر فريق --</option>';
        allTeams.forEach(t => allTeamOptions += `<option value="${t}">${t}</option>`);
        
        for (let i = 0; i < 8; i++) {
            const res = safeThirdPlace[i] || '';
            tpHtml += `
                <div class="form-group" style="margin-bottom: 10px;">
                    <label>أفضل ثالث (${i+1})</label>
                    <select id="act-third-place-${i}">
                        ${allTeamOptions.replace(`value="${res}"`, `value="${res}" selected`)}
                    </select>
                </div>
            `;
        }
        thirdPlaceAdmin.innerHTML = tpHtml;
    }
    
    // Bind Generate R32 Bracket button
    const genBtn = document.getElementById('generate-r32-btn');
    if (genBtn) {
        // remove existing listener to avoid duplicates if re-rendered
        const newBtn = genBtn.cloneNode(true);
        genBtn.parentNode.replaceChild(newBtn, genBtn);
        
        newBtn.addEventListener('click', () => {
            generateR32Bracket();
        });
    }

    // Populate Admin View Predictions Dropdown
    const adminViewParticipant = document.getElementById('admin-view-participant');
    if (adminViewParticipant && adminViewParticipant.options.length <= 1) {
        APP_DATA.participants.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            adminViewParticipant.appendChild(opt);
        });
    }
}

function saveAdminResults() {
    // Save R1
    APP_DATA.matchesR1.forEach(m => {
        const h = document.getElementById(`act-home-${m.id}`).value;
        const a = document.getElementById(`act-away-${m.id}`).value;
        if (h !== '' && a !== '') {
            appState.resultsR1[m.id] = { home: parseInt(h), away: parseInt(a) };
        } else {
            delete appState.resultsR1[m.id];
        }
    });

    // Save R2
    APP_DATA.matchesR2.forEach(m => {
        const h = document.getElementById(`act-home-${m.id}`).value;
        const a = document.getElementById(`act-away-${m.id}`).value;
        if (h !== '' && a !== '') {
            appState.resultsR2[m.id] = { home: parseInt(h), away: parseInt(a) };
        } else {
            delete appState.resultsR2[m.id];
        }
    });

    // Save R3
    APP_DATA.matchesR3.forEach(m => {
        const h = document.getElementById(`act-home-${m.id}`).value;
        const a = document.getElementById(`act-away-${m.id}`).value;
        if (h !== '' && a !== '') {
            appState.resultsR3[m.id] = { home: parseInt(h), away: parseInt(a) };
        } else {
            delete appState.resultsR3[m.id];
        }
    });
    
    // Save Qualifiers
    Object.keys(APP_DATA.groups).forEach(g => {
        const f = document.getElementById(`act-qual-1-${g}`).value;
        const s = document.getElementById(`act-qual-2-${g}`).value;
        if (f !== '' && s !== '') {
            appState.actualQualifiers[g] = { first: f, second: s };
        } else {
            delete appState.actualQualifiers[g];
        }
    });
    
    // Save 3rd place
    appState.thirdPlaceQualifiers = [];
    for (let i = 0; i < 8; i++) {
        const val = document.getElementById(`act-third-place-${i}`)?.value;
        if (val) appState.thirdPlaceQualifiers.push(val);
    }
    
    // Save current active knockout results
    if (document.getElementById('admin-ko-results-round')) {
        saveKnockoutResults();
    }
    
    propagateKnockoutWinners();
    saveState();
    alert('تم حفظ النتائج بنجاح!');
}

function getMatchWinner(matchId, round) {
    const resultsMap = {
        'r32': appState.resultsR32,
        'r16': appState.resultsR16,
        'qf': appState.resultsQF,
        'sf': appState.resultsSF,
        'final': appState.resultsFinal
    };
    const res = resultsMap[round][matchId];
    if (!res) return null;
    
    if (res.home > res.away) {
        const matchObj = appState.knockoutMatches[round].find(m => m.id === matchId);
        return matchObj ? matchObj.home : null;
    } else if (res.away > res.home) {
        const matchObj = appState.knockoutMatches[round].find(m => m.id === matchId);
        return matchObj ? matchObj.away : null;
    }
    return null;
}

function propagateKnockoutWinners() {
    const rounds = [
        { current: 'r32', next: 'r16', count: 16 },
        { current: 'r16', next: 'qf', count: 8 },
        { current: 'qf', next: 'sf', count: 4 },
        { current: 'sf', next: 'final', count: 2 }
    ];
    
    rounds.forEach(r => {
        const currentMatches = appState.knockoutMatches[r.current] || [];
        if (currentMatches.length >= r.count) {
            const nextMatches = [];
            for (let i = 0; i < r.count / 2; i++) {
                const m1 = currentMatches[i * 2];
                const m2 = currentMatches[i * 2 + 1];
                
                let w1 = `الفائز من ${m1.id}`;
                let w2 = `الفائز من ${m2.id}`;
                
                if (m1) {
                    const actualW1 = getMatchWinner(m1.id, r.current);
                    if (actualW1) w1 = actualW1;
                }
                if (m2) {
                    const actualW2 = getMatchWinner(m2.id, r.current);
                    if (actualW2) w2 = actualW2;
                }
                
                const nextId = `${r.next}-${i + 1}`;
                nextMatches.push({ id: nextId, home: w1, away: w2 });
            }
            appState.knockoutMatches[r.next] = nextMatches;
        }
    });
}

function initTabs() {
    const btns = document.querySelectorAll('.nav-btn');
    const panes = document.querySelectorAll('.tab-pane');
    
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });
}

function renderPredictionForm() {
    const r2Tab = document.getElementById('round2-form');
    if (r2Tab && !document.getElementById('r2-deadline-info')) {
        const p = document.createElement('p');
        p.id = 'r2-deadline-info';
        p.className = 'deadline-info';
        p.style.cssText = 'background:#fff3cd; color:#856404; padding:8px 12px; border-radius:5px; margin-top:10px; display:inline-block; font-size:0.9em;';
        p.innerHTML = `⏳ <strong>الموعد النهائي:</strong> <span>${formatDeadline(ROUND_2_DEADLINE)}</span>`;
        const header = r2Tab.querySelector('.section-header');
        if (header) header.appendChild(p);
    }

    // Populate participants dropdown
    const select = document.getElementById('participant-name');
    if (!select) return;
    APP_DATA.participants.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        select.appendChild(opt);
    });
    
    let scoreOptions = '<option value="">-</option>';
    for(let i=0; i<=15; i++) scoreOptions += `<option value="${i}">${i}</option>`;

    // Render R2 Matches in Form
    const r2Form = document.getElementById('round2-form-matches');
    if (!r2Form) return;
    let html = '';
    
    APP_DATA.matchesR2.forEach(m => {
        html += `
            <div class="match-card">
                <div class="match-title">مجموعة ${m.group}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${m.home}</span>
                    <div style="display:flex; gap:10px;">
                        <select class="score-input" required id="pred-home-${m.id}">${scoreOptions}</select>
                        <span>-</span>
                        <select class="score-input" required id="pred-away-${m.id}">${scoreOptions}</select>
                    </div>
                    <span>${m.away}</span>
                </div>
            </div>
        `;
    });
    
    r2Form.innerHTML = html;
    
    // Handle form submit
    const predictionForm = document.getElementById('prediction-form');
    if (isRound2Locked) {
        predictionForm.innerHTML = '<div class="alert alert-warning">عذراً، لقد انتهى وقت إرسال التوقعات للجولة الثانية.</div>';
        return;
    }

    predictionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pName = document.getElementById('participant-name').value;
        if (!pName) return;
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'جاري الإرسال...';
        submitBtn.disabled = true;

        const promises = [];

        APP_DATA.matchesR2.forEach(m => {
            const h = document.getElementById(`pred-home-${m.id}`).value;
            const a = document.getElementById(`pred-away-${m.id}`).value;
            if (h !== '' && a !== '') {
                const prediction = { home: parseInt(h), away: parseInt(a) };
                
                // Update local state
                if (!appState.predictions[pName]) appState.predictions[pName] = { r1: {}, r2: {}, r3: {}, qualifiers: {} };
                if (!appState.predictions[pName].r2) appState.predictions[pName].r2 = {};
                appState.predictions[pName].r2[m.id] = prediction;
                
                // Post to Google Sheet
                promises.push(fetch(API_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        participant: pName,
                        round: 'r2',
                        matchId: m.id,
                        prediction: prediction
                    })
                }));
            }
        });
        
        try {
            await Promise.all(promises);
            saveState(); // Save to local storage as backup
            alert(`تم حفظ توقعات ${pName} بنجاح في قاعدة البيانات!`);
            e.target.reset();
        } catch (error) {
            console.error("Error saving to sheet:", error);
            alert("حدث خطأ أثناء إرسال التوقعات. يرجى المحاولة مرة أخرى.");
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            calculateLeaderboard();
        }
    });
}

function renderPredictionFormR3() {
    const r3Tab = document.getElementById('round3-form');
    if (r3Tab && !document.getElementById('r3-deadline-info')) {
        const p = document.createElement('p');
        p.id = 'r3-deadline-info';
        p.className = 'deadline-info';
        p.style.cssText = 'background:#fff3cd; color:#856404; padding:8px 12px; border-radius:5px; margin-top:10px; display:inline-block; font-size:0.9em;';
        p.innerHTML = `⏳ <strong>الموعد النهائي:</strong> <span>${formatDeadline(ROUND_3_DEADLINE)}</span>`;
        const header = r3Tab.querySelector('.section-header');
        if (header) header.appendChild(p);
    }

    // Populate participants dropdown
    const select = document.getElementById('participant-name-r3');
    if (!select) return;
    APP_DATA.participants.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        select.appendChild(opt);
    });
    
    let scoreOptions = '<option value="">-</option>';
    for(let i=0; i<=15; i++) scoreOptions += `<option value="${i}">${i}</option>`;

    // Render R3 Matches in Form
    const r3Form = document.getElementById('round3-form-matches');
    if (!r3Form) return;
    let html = '';
    
    APP_DATA.matchesR3.forEach(m => {
        html += `
            <div class="match-card">
                <div class="match-title">مجموعة ${m.group}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>${m.home}</span>
                    <div style="display:flex; gap:10px;">
                        <select class="score-input" required id="pred-home-${m.id}">${scoreOptions}</select>
                        <span>-</span>
                        <select class="score-input" required id="pred-away-${m.id}">${scoreOptions}</select>
                    </div>
                    <span>${m.away}</span>
                </div>
            </div>
        `;
    });
    
    r3Form.innerHTML = html;
    
    // Handle form submit
    const predictionForm = document.getElementById('prediction-form-r3');
    if (isRound3Locked) {
        predictionForm.innerHTML = '<div class="alert alert-warning">عذراً، لقد انتهى وقت إرسال التوقعات للجولة الثالثة.</div>';
        return;
    }

    predictionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pName = document.getElementById('participant-name-r3').value;
        if (!pName) return;
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'جاري الإرسال...';
        submitBtn.disabled = true;

        const promises = [];

        APP_DATA.matchesR3.forEach(m => {
            const h = document.getElementById(`pred-home-${m.id}`).value;
            const a = document.getElementById(`pred-away-${m.id}`).value;
            if (h !== '' && a !== '') {
                const prediction = { home: parseInt(h), away: parseInt(a) };
                
                // Update local state
                if (!appState.predictions[pName]) appState.predictions[pName] = { r1: {}, r2: {}, r3: {}, qualifiers: {} };
                if (!appState.predictions[pName].r3) appState.predictions[pName].r3 = {};
                appState.predictions[pName].r3[m.id] = prediction;
                
                // Post to Google Sheet
                promises.push(fetch(API_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        participant: pName,
                        round: 'r3',
                        matchId: m.id,
                        prediction: prediction
                    })
                }));
            }
        });
        
        try {
            await Promise.all(promises);
            saveState(); // Save to local storage as backup
            alert(`تم حفظ توقعات ${pName} بنجاح في قاعدة البيانات!`);
            e.target.reset();
        } catch (error) {
            console.error("Error saving to sheet:", error);
            alert("حدث خطأ أثناء إرسال التوقعات. يرجى المحاولة مرة أخرى.");
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            calculateLeaderboard();
        }
    });
}

function renderRound1Tab() {
    const container = document.getElementById('round1-matches');
    if (!container) return;
    container.innerHTML = '';

    APP_DATA.matchesR1.forEach(m => {
        const actual = appState.resultsR1[m.id];
        const actualStr = actual !== undefined ? `${actual.home} - ${actual.away}` : '-';
        
        const card = document.createElement('div');
        card.className = 'match-card';
        
        let predsHtml = '<div class="match-predictions" style="display:none; margin-top:10px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px; font-size: 0.9em;">';
        predsHtml += '<table style="width:100%; border-collapse:collapse;">';
        predsHtml += '<thead><tr><th style="text-align:right;">المشارك</th><th style="text-align:center;">التوقع</th><th style="text-align:center;">النقاط</th></tr></thead><tbody>';
        
        APP_DATA.participants.forEach(p => {
            const pred = (appState.predictions[p]?.r1 || {})[m.id];
            let predStr = '-';
            let pts = 0;
            if (pred) {
                predStr = `${pred.home} - ${pred.away}`;
                if (actual) {
                    pts = calculateMatchPoints(actual.home, actual.away, pred.home, pred.away);
                }
            }
            predsHtml += `<tr>
                <td style="padding:4px 0;">${p}</td>
                <td style="text-align:center; padding:4px 0;">${predStr}</td>
                <td style="text-align:center; padding:4px 0; font-weight:bold; color:var(--accent-color);">${actual !== undefined ? pts : '-'}</td>
            </tr>`;
        });
        predsHtml += '</tbody></table></div>';

        card.innerHTML = `
            <div class="match-title" style="display:flex; justify-content:space-between;">
                <span>مجموعة ${m.group}</span>
                <span class="match-id" style="font-size:0.8em; opacity:0.6;">#${m.id}</span>
            </div>
            <div class="match-teams" style="display:flex; justify-content:space-between; align-items:center; margin: 15px 0;">
                <span style="font-weight:600; flex:1; text-align:right;">${m.home}</span>
                <span class="match-score-badge" style="background:rgba(255,255,255,0.1); padding:5px 12px; border-radius:15px; font-weight:800; font-size:1.1em; margin:0 10px;">${actualStr}</span>
                <span style="font-weight:600; flex:1; text-align:left;">${m.away}</span>
            </div>
            <button class="btn-toggle-preds" style="background:none; border:none; color:var(--primary-color); cursor:pointer; width:100%; text-align:center; font-size:0.9em; padding: 5px 0; font-family:inherit;">عرض توقعات المشاركين ⬇️</button>
            ${predsHtml}
        `;
        
        const btn = card.querySelector('.btn-toggle-preds');
        const predsDiv = card.querySelector('.match-predictions');
        btn.addEventListener('click', () => {
            if (predsDiv.style.display === 'none') {
                predsDiv.style.display = 'block';
                btn.textContent = 'إخفاء توقعات المشاركين ⬆️';
            } else {
                predsDiv.style.display = 'none';
                btn.textContent = 'عرض توقعات المشاركين ⬇️';
            }
        });

        container.appendChild(card);
    });
}

function renderQualifiersTab() {
    const container = document.getElementById('qualifiers-groups');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(APP_DATA.groups).forEach(g => {
        const teams = APP_DATA.groups[g];
        const actual = appState.actualQualifiers[g];
        const actualStr = actual ? `الأول: ${actual.first} | الثاني: ${actual.second}` : 'لم تحدد بعد';

        const card = document.createElement('div');
        card.className = 'group-card';
        
        let participantsHtml = '<div class="qual-predictions" style="display:none; margin-top:10px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px; font-size: 0.9em;">';
        participantsHtml += '<table style="width:100%; border-collapse:collapse;">';
        participantsHtml += '<thead><tr><th style="text-align:right;">المشارك</th><th style="text-align:center;">الأول / الثاني</th><th style="text-align:center;">النقاط</th></tr></thead><tbody>';

        APP_DATA.participants.forEach(p => {
            const pred = (appState.predictions[p]?.qualifiers || {})[g];
            let predStr = '-';
            let pts = 0;
            if (pred) {
                predStr = `${pred.first || '-'} / ${pred.second || '-'}`;
                if (actual) {
                    pts = calculateQualifierPoints(actual.first, actual.second, pred.first, pred.second);
                }
            }
            participantsHtml += `<tr>
                <td style="padding:4px 0;">${p}</td>
                <td style="text-align:center; padding:4px 0;">${predStr}</td>
                <td style="text-align:center; padding:4px 0; font-weight:bold; color:var(--accent-color);">${actual ? pts : '-'}</td>
            </tr>`;
        });
        participantsHtml += '</tbody></table></div>';

        card.innerHTML = `
            <div class="group-title" style="font-weight:800; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px; margin-bottom:10px;">مجموعة ${g}</div>
            <div style="font-size:0.9em; opacity:0.8; margin-bottom:8px;"><strong>فرق المجموعة:</strong> ${teams.join(', ')}</div>
            <div style="font-size:0.95em; color:var(--secondary-color); margin-bottom:10px;"><strong>الفعلي:</strong> ${actualStr}</div>
            <button class="btn-toggle-quals" style="background:none; border:none; color:var(--primary-color); cursor:pointer; width:100%; text-align:center; font-size:0.9em; padding: 5px 0; font-family:inherit;">عرض توقعات المشاركين ⬇️</button>
            ${participantsHtml}
        `;

        const btn = card.querySelector('.btn-toggle-quals');
        const qualsDiv = card.querySelector('.qual-predictions');
        btn.addEventListener('click', () => {
            if (qualsDiv.style.display === 'none') {
                qualsDiv.style.display = 'block';
                btn.textContent = 'إخفاء توقعات المشاركين ⬆️';
            } else {
                qualsDiv.style.display = 'none';
                btn.textContent = 'عرض توقعات المشاركين ⬇️';
            }
        });

        container.appendChild(card);
    });
}

// --- Knockouts Admin Setup ---
function renderKnockoutAdminSetup() {
    const round = document.getElementById('admin-ko-setup-round').value;
    const container = document.getElementById('admin-setup-ko-matches');
    if (!container) return;
    
    let html = '';
    const matches = appState.knockoutMatches[round] || [];
    
    matches.forEach((m, idx) => {
        html += `
            <div class="score-input-group knockout-setup-row" style="margin-bottom: 10px;" data-index="${idx}">
                <input type="text" class="score-input ko-home-input" value="${m.home}" placeholder="الفريق الأول" style="width: 120px;">
                <span> VS </span>
                <input type="text" class="score-input ko-away-input" value="${m.away}" placeholder="الفريق الثاني" style="width: 120px;">
                <button class="btn delete-ko-match-btn" type="button" style="background:#ff4d4d; padding: 5px 10px;">حذف</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    container.querySelectorAll('.delete-ko-match-btn').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            appState.knockoutMatches[round].splice(idx, 1);
            renderKnockoutAdminSetup();
        });
    });
}

function saveKnockoutSetup() {
    const round = document.getElementById('admin-ko-setup-round').value;
    const container = document.getElementById('admin-setup-ko-matches');
    const rows = container.querySelectorAll('.knockout-setup-row');
    
    const newMatches = [];
    rows.forEach((row, idx) => {
        const home = row.querySelector('.ko-home-input').value.trim();
        const away = row.querySelector('.ko-away-input').value.trim();
        if (home && away) {
            newMatches.push({ id: `${round}-${idx+1}`, home, away });
        }
    });
    
    appState.knockoutMatches[round] = newMatches;
    propagateKnockoutWinners();
    saveState();
    alert('تم حفظ إعدادات المباريات!');
    renderKnockoutPredictionForm();
    renderKnockoutAdminResults();
}

// --- Knockouts Admin Results ---
function renderKnockoutAdminResults() {
    const round = document.getElementById('admin-ko-results-round').value;
    const container = document.getElementById('admin-results-ko-matches');
    if (!container) return;
    
    let html = '';
    const matches = appState.knockoutMatches[round] || [];
    const safeResults = {
        'r32': appState.resultsR32,
        'r16': appState.resultsR16,
        'qf': appState.resultsQF,
        'sf': appState.resultsSF,
        'final': appState.resultsFinal
    }[round] || {};
    
    let scoreOptions = '<option value="">-</option>';
    for(let i=0; i<=15; i++) scoreOptions += `<option value="${i}">${i}</option>`;
    
    matches.forEach(m => {
        const res = safeResults[m.id] || { home: '', away: '' };
        html += `
            <div class="score-input-group">
                <span style="flex:1; text-align:right;">${m.home}</span>
                <select class="score-input" id="act-ko-home-${m.id}">
                    ${scoreOptions.replace(`value="${res.home}"`, `value="${res.home}" selected`)}
                </select>
                <span> - </span>
                <select class="score-input" id="act-ko-away-${m.id}">
                    ${scoreOptions.replace(`value="${res.away}"`, `value="${res.away}" selected`)}
                </select>
                <span style="flex:1; text-align:left;">${m.away}</span>
            </div>
        `;
    });
    
    if (matches.length === 0) {
        html = '<p>لم يتم إعداد مباريات هذا الدور بعد.</p>';
    }
    
    container.innerHTML = html;
}

function saveKnockoutResults() {
    const round = document.getElementById('admin-ko-results-round').value;
    const matches = appState.knockoutMatches[round] || [];
    const targetResultsObj = {
        'r32': appState.resultsR32,
        'r16': appState.resultsR16,
        'qf': appState.resultsQF,
        'sf': appState.resultsSF,
        'final': appState.resultsFinal
    }[round];
    
    matches.forEach(m => {
        const hElem = document.getElementById(`act-ko-home-${m.id}`);
        const aElem = document.getElementById(`act-ko-away-${m.id}`);
        if(hElem && aElem) {
            const h = hElem.value;
            const a = aElem.value;
            if (h !== '' && a !== '') {
                targetResultsObj[m.id] = { home: parseInt(h), away: parseInt(a) };
            } else {
                delete targetResultsObj[m.id];
            }
        }
    });
}

// --- Knockouts Prediction Form ---
function renderKnockoutPredictionForm() {
    const round = document.getElementById('knockout-round-select').value;
    
    let info = document.getElementById('ko-deadline-info');
    if (!info) {
        info = document.createElement('p');
        info.id = 'ko-deadline-info';
        info.className = 'deadline-info';
        info.style.cssText = 'background:#fff3cd; color:#856404; padding:8px 12px; border-radius:5px; margin-top:10px; display:inline-block; font-size:0.9em;';
        const header = document.querySelector('#knockouts-form .section-header');
        if (header) header.appendChild(info);
    }
    if (info) {
        info.innerHTML = `⏳ <strong>الموعد النهائي:</strong> <span>${formatDeadline(knockoutDeadlineDates[round])}</span>`;
    }

    const select = document.getElementById('participant-name-knockouts');
    if (select && select.options.length === 1) {
        APP_DATA.participants.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            select.appendChild(opt);
        });
    }

    const container = document.getElementById('knockouts-form-matches');
    if (!container) return;
    
    const isLocked = knockoutDeadlines[round];
    if (isLocked) {
        container.innerHTML = '<div class="lock-message" style="background:#ff4d4d20; color:#ff4d4d; padding:10px; border-radius:8px; text-align:center;">عذراً، انتهى وقت التوقعات لهذا الدور! 🔒</div>';
        const submitBtn = document.querySelector('#prediction-form-knockouts button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        return;
    } else {
        const submitBtn = document.querySelector('#prediction-form-knockouts button[type="submit"]');
        if (submitBtn) submitBtn.disabled = false;
    }
    
    const matches = appState.knockoutMatches[round] || [];
    if (matches.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px;">المباريات لم تحدد بعد.</p>';
        return;
    }

    let scoreOptions = '<option value="">-</option>';
    for(let i=0; i<=15; i++) scoreOptions += `<option value="${i}">${i}</option>`;
    
    let html = '';
    matches.forEach(m => {
        html += `
            <div class="match-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; font-size:1.1em;">${m.home}</span>
                    <div style="display:flex; gap:10px;">
                        <select class="score-input" required id="pred-ko-home-${m.id}">${scoreOptions}</select>
                        <span>-</span>
                        <select class="score-input" required id="pred-ko-away-${m.id}">${scoreOptions}</select>
                    </div>
                    <span style="font-weight:bold; font-size:1.1em;">${m.away}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Event handlers for Knockout Prediction Form
const koForm = document.getElementById('prediction-form-knockouts');
if (koForm) {
    koForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('participant-name-knockouts').value;
        const round = document.getElementById('knockout-round-select').value;
        const matches = appState.knockoutMatches[round] || [];
        
        if (!name) {
            alert('الرجاء اختيار اسمك!');
            return;
        }
        if (knockoutDeadlines[round]) {
            alert('عذراً، انتهى وقت التوقعات!');
            return;
        }
        
        matches.forEach(m => {
            const homeScore = document.getElementById(`pred-ko-home-${m.id}`).value;
            const awayScore = document.getElementById(`pred-ko-away-${m.id}`).value;
            if (homeScore !== '' && awayScore !== '') {
                if (!appState.predictions[name][round]) appState.predictions[name][round] = {};
                appState.predictions[name][round][m.id] = {
                    home: parseInt(homeScore),
                    away: parseInt(awayScore)
                };
            }
        });
        
        saveState();
        alert('تم إرسال توقعات الأدوار الإقصائية وحفظها بنجاح!');
        calculateLeaderboard();
    });
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    renderAdminPanel();
    
    // Knockouts Initial Renders
    if (document.getElementById('admin-ko-setup-round')) {
        renderKnockoutAdminSetup();
        document.getElementById('admin-ko-setup-round').addEventListener('change', renderKnockoutAdminSetup);
        document.getElementById('add-ko-match-btn').addEventListener('click', () => {
            const round = document.getElementById('admin-ko-setup-round').value;
            if (!appState.knockoutMatches[round]) appState.knockoutMatches[round] = [];
            appState.knockoutMatches[round].push({ id: `temp`, home: '', away: '' });
            renderKnockoutAdminSetup();
        });
        document.getElementById('save-ko-setup-btn').addEventListener('click', saveKnockoutSetup);
    }
    
    if (document.getElementById('admin-ko-results-round')) {
        renderKnockoutAdminResults();
        document.getElementById('admin-ko-results-round').addEventListener('change', renderKnockoutAdminResults);
    }

    if (document.getElementById('knockout-round-select')) {
        renderKnockoutPredictionForm();
        document.getElementById('knockout-round-select').addEventListener('change', renderKnockoutPredictionForm);
    }

    renderPredictionForm();
    renderPredictionFormR3();
    calculateLeaderboard();
    renderRound1Tab();
    renderQualifiersTab();
    
    // Load remote data
    loadPredictionsFromSheet();
    
    document.getElementById('save-results-btn')?.addEventListener('click', saveAdminResults);
    
    // Bind Admin View Predictions Button
    const viewPredsBtn = document.getElementById('admin-view-preds-btn');
    if (viewPredsBtn) {
        viewPredsBtn.addEventListener('click', () => {
            const pName = document.getElementById('admin-view-participant').value;
            const round = document.getElementById('admin-view-round').value;
            const resContainer = document.getElementById('admin-view-preds-result');
            
            if (!pName || !round) {
                resContainer.innerHTML = '<p style="text-align:center; color:#ff4d4d;">الرجاء اختيار المشارك والدور</p>';
                return;
            }
            
            const preds = (appState.predictions[pName] || {})[round];
            if (!preds || Object.keys(preds).length === 0) {
                resContainer.innerHTML = '<p style="text-align:center; opacity:0.7;">لا توجد توقعات لهذا المشارك في هذا الدور</p>';
                return;
            }
            
            let html = '<ul style="list-style:none; padding:0; margin:0;">';
            if (round === 'qualifiers') {
                Object.keys(preds).forEach(g => {
                    html += `<li style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
                        <strong>مجموعة ${g}:</strong> الأول (${preds[g].first || '-'}) - الثاني (${preds[g].second || '-'})
                    </li>`;
                });
            } else {
                Object.keys(preds).forEach(matchId => {
                    // Try to find match names
                    let matchObj = null;
                    const allMatches = [
                        ...APP_DATA.matchesR1, ...APP_DATA.matchesR2, ...APP_DATA.matchesR3,
                        ...(appState.knockoutMatches.r32 || []), ...(appState.knockoutMatches.r16 || []),
                        ...(appState.knockoutMatches.qf || []), ...(appState.knockoutMatches.sf || []), ...(appState.knockoutMatches.final || [])
                    ];
                    matchObj = allMatches.find(m => m.id === matchId);
                    
                    const matchText = matchObj ? `${matchObj.home} ضد ${matchObj.away}` : `مباراة ${matchId}`;
                    html += `<li style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between;">
                        <span>${matchText}</span>
                        <span style="font-weight:bold; color:var(--primary-color);">${preds[matchId].home} - ${preds[matchId].away}</span>
                    </li>`;
                });
            }
            html += '</ul>';
            resContainer.innerHTML = html;
        });
    }
});
