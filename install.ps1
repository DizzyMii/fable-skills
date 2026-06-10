param([switch]$WriteClaudeMd)

$ErrorActionPreference = 'Stop'
$repoSkills = Join-Path $PSScriptRoot 'skills'
$target = Join-Path $env:USERPROFILE '.claude\skills'
$claudeMd = Join-Path $env:USERPROFILE '.claude\CLAUDE.md'
$blockFile = Join-Path $PSScriptRoot 'claude-md-block.md'

if (-not (Test-Path $target)) { New-Item -ItemType Directory -Force $target | Out-Null }

$installed = @()
Get-ChildItem $repoSkills -Directory -Filter 'fable-*' | ForEach-Object {
    $dest = Join-Path $target $_.Name
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    Copy-Item -Recurse $_.FullName $dest
    $installed += $_.Name
}
Write-Output ("Installed {0} skills to {1}:" -f $installed.Count, $target)
$installed | ForEach-Object { Write-Output ("  - " + $_) }

$block = Get-Content $blockFile -Raw
if ($WriteClaudeMd) {
    $start = '<!-- fable-skills:start -->'
    $end = '<!-- fable-skills:end -->'
    if (Test-Path $claudeMd) {
        $content = Get-Content $claudeMd -Raw
        $pattern = [regex]::Escape($start) + '[\s\S]*?' + [regex]::Escape($end)
        if ($content -match $pattern) {
            $content = [regex]::Replace($content, $pattern, $block.TrimEnd())
        } else {
            $content = $content.TrimEnd() + "`r`n`r`n" + $block.TrimEnd() + "`r`n"
        }
        Set-Content -Path $claudeMd -Value $content -Encoding utf8
    } else {
        Set-Content -Path $claudeMd -Value $block -Encoding utf8
    }
    Write-Output "Activation block written to $claudeMd"
} else {
    Write-Output "CLAUDE.md not modified. To activate, re-run with -WriteClaudeMd or paste claude-md-block.md into $claudeMd"
}
