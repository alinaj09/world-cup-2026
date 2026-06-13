$json = Get-Content espn_test2.json | ConvertFrom-Json
$comp = $json.events[0].competitions[0].competitors[0]
$comp | ConvertTo-Json -Depth 5
