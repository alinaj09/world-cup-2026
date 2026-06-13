[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$response = Invoke-RestMethod -Uri 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260610-20260725&limit=150'
foreach ($event in $response.events) {
    if ($event.name -match 'Canada' -or $event.name -match 'Bosnia') {
        Write-Output "Name: $($event.name)"
        $comp = $event.competitions[0]
        $home = $comp.competitors | Where-Object { $_.homeAway -eq 'home' }
        $away = $comp.competitors | Where-Object { $_.homeAway -eq 'away' }
        Write-Output "Home: $($home.team.name) Score: $($home.score)"
        Write-Output "Away: $($away.team.name) Score: $($away.score)"
        Write-Output "Status: $($event.status.type.name)"
        Write-Output "---"
    }
}
