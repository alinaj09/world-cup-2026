const fs = require('fs');

const appState = {
    resultsR1: {}, resultsR2: {}, resultsR3: {}
};

const TEAM_MAP = {
    "Canada": "كندا", "Bosnia-Herzegovina": "البوسنة", "Bosnia": "البوسنة"
};

const APP_DATA = {
    matchesR1: [ { "id": "R1-3", "home": "كندا", "away": "البوسنة", "group": "B" } ],
    matchesR2: [], matchesR3: []
};

const data = JSON.parse(fs.readFileSync('espn_full.json', 'utf8'));

let updated = false;

data.events.forEach(event => {
    const comp = event.competitions[0];
    if (!comp) return;
    
    const homeTeamEng = comp.competitors.find(c => c.homeAway === 'home')?.team.name;
    const awayTeamEng = comp.competitors.find(c => c.homeAway === 'away')?.team.name;
    
    const homeTeam = TEAM_MAP[homeTeamEng] ? TEAM_MAP[homeTeamEng] : homeTeamEng;
    const awayTeam = TEAM_MAP[awayTeamEng] ? TEAM_MAP[awayTeamEng] : awayTeamEng;
    
    if (homeTeamEng && (homeTeamEng.includes('Canada') || homeTeamEng.includes('Bosnia') || awayTeamEng.includes('Canada') || awayTeamEng.includes('Bosnia'))) {
        console.log("MATCH FOUND IN JSON:");
        console.log("Eng:", homeTeamEng, "vs", awayTeamEng);
        console.log("Mapped:", homeTeam, "vs", awayTeam);
    }
    
    const homeScore = parseInt(comp.competitors.find(c => c.homeAway === 'home')?.score || '0');
    const awayScore = parseInt(comp.competitors.find(c => c.homeAway === 'away')?.score || '0');
    
    const status = event.status.type.name;
    
    if (!status.includes('SCHEDULED') && !status.includes('POSTPONED') && !status.includes('CANCELED')) {
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
                console.log("UPDATING SCORE FOR:", match.home, "vs", match.away, "->", homeScore, awayScore);
                foundInGroup = true;
                if (match.home === homeTeam) {
                    round.dest[match.id] = { home: homeScore, away: awayScore };
                } else {
                    round.dest[match.id] = { home: awayScore, away: homeScore };
                }
                updated = true;
                break;
            }
        }
    }
});
console.log("Final State:", appState);
