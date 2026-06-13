$json = Get-Content espn_full.json | ConvertFrom-Json
$event = $json.events | Where-Object { $_.name -match 'Canada' -or $_.name -match 'Bosnia' }
if ($event) {
    foreach ($e in $event) {
        Write-Output "EVENT: $($e.name)"
        $comp = $e.competitions[0]
        foreach ($c in $comp.competitors) {
            Write-Output "Team: $($c.team.name) | homeAway: $($c.homeAway) | Score: $($c.score)"
        }
        Write-Output "---"
    }
} else {
    Write-Output "No match found"
}
