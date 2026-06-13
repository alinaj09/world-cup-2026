const http = require('https');
http.get('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260610-20260725&limit=150', r => {
    let data = '';
    r.on('data', c => data += c);
    r.on('end', () => {
        const d = JSON.parse(data);
        console.log("Got events: ", d.events ? d.events.length : 0);
        if (d.events) {
            d.events.forEach(e => {
                if(e.name.includes('Canada') || e.name.includes('Bosnia')) {
                    console.log(e.name);
                    const comp = e.competitions[0];
                    console.log("Home:", comp.competitors.find(c => c.homeAway === 'home')?.team.name);
                    console.log("Away:", comp.competitors.find(c => c.homeAway === 'away')?.team.name);
                    console.log("Score:", comp.competitors.find(c => c.homeAway === 'home')?.score, "-", comp.competitors.find(c => c.homeAway === 'away')?.score);
                    console.log("Status:", e.status.type.name);
                }
            });
        }
    });
});
