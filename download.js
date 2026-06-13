const fs = require('fs');
const https = require('https');

https.get('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260610-20260725&limit=150', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('espn_full.json', data);
    });
});
