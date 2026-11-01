function ReturnsSet([int[]]$Items) { $p = [System.Collections.Generic.HashSet[int]]::new(); foreach ($i in $Items) { [void]$p.Add($i) }; $p }
function ReturnsSetWhole([int[]]$Items) { $p = [System.Collections.Generic.HashSet[int]]::new(); foreach ($i in $Items) { [void]$p.Add($i) }; ,$p }
foreach ($items in @(@(), @(8001), @(8001, 5908))) {
  $a = ReturnsSet $items; $b = ReturnsSetWhole $items
  $ta = if ($null -eq $a) { 'null' } else { $a.GetType().FullName }
  Write-Output ("{0} port(s): '`$p' returns {1}; ',`$p' returns {2}" -f $items.Count, $ta, $b.GetType().FullName)
}
try { $null = (ReturnsSet @()).Contains(1) } catch { Write-Output ("empty set .Contains: " + $_.Exception.Message) }
try { [void](ReturnsSet @(8001)).Add(5) } catch { Write-Output ("one-port set .Add: " + $_.Exception.Message) }
