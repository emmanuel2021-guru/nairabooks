<#
.SYNOPSIS
Bootstrap a new or existing project with Antigravity Dynamic Vibecode Kit.
If -WizardJson is supplied, compiles the dynamic 100%-coverage workflow immediately.
If omitted, installs the base kit so the user can open wizard/skills_decision_wizard.html and paste their choice straight into Antigravity.
#>
param(
    [Parameter(Mandatory = $false)]
    [string]$TargetDir = ".",

    [Parameter(Mandatory = $false)]
    [string]$WizardJson = "",

    [Parameter(Mandatory = $false)]
    [string]$ProjectName = "",

    [Parameter(Mandatory = $false)]
    [ValidateSet("link", "copy")]
    [string]$Mode = "copy",

    [Parameter(Mandatory = $false)]
    [string]$SkillsDir = "",

    [switch]$PreserveDocs
)

$ErrorActionPreference = "Stop"
$KitRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if ([System.IO.Path]::IsPathRooted($TargetDir)) {
    $ResolvedTarget = [System.IO.Path]::GetFullPath($TargetDir)
} else {
    $ResolvedTarget = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $TargetDir))
}

if (-not (Test-Path $ResolvedTarget)) {
    New-Item -ItemType Directory -Force -Path $ResolvedTarget | Out-Null
}

if ($WizardJson) {
    $ResolvedWizard = (Resolve-Path $WizardJson).Path
    $pyArgs = @(
        (Join-Path $KitRoot "scripts\generate_workflow.py"),
        "--wizard", $ResolvedWizard,
        "--output", $ResolvedTarget,
        "--mode", $Mode
    )
    if ($ProjectName) { $pyArgs += @("--project-name", $ProjectName) }
    if ($SkillsDir) { $pyArgs += @("--skills-dir", $SkillsDir) }
    if ($PreserveDocs) { $pyArgs += "--preserve-docs" }

    python @pyArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    python (Join-Path $ResolvedTarget "scripts\verify_workflow.py") --project $ResolvedTarget
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host ""
    Write-Host "[READY] Open $ResolvedTarget in Google Antigravity and describe your app idea (or type '1')!"
    exit 0
}

# Pre-wizard bootstrap: install base orchestrator skills, rules, wizard, and self-contained compiler
New-Item -ItemType Directory -Force -Path (Join-Path $ResolvedTarget ".agents\rules") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ResolvedTarget ".agents\skills") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ResolvedTarget ".agents\kit\scripts") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ResolvedTarget ".agents\kit\catalog") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ResolvedTarget ".agents\kit\templates") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ResolvedTarget ".agents\kit\kit_skills") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ResolvedTarget ".agents\kit\skills") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ResolvedTarget "wizard") | Out-Null

Copy-Item (Join-Path $KitRoot "templates\.agents\rules\*") (Join-Path $ResolvedTarget ".agents\rules") -Force
Copy-Item (Join-Path $KitRoot "kit_skills\*") (Join-Path $ResolvedTarget ".agents\skills") -Recurse -Force
Copy-Item (Join-Path $KitRoot "scripts\generate_workflow.py") (Join-Path $ResolvedTarget ".agents\kit\scripts\generate_workflow.py") -Force
Copy-Item (Join-Path $KitRoot "scripts\verify_workflow.py") (Join-Path $ResolvedTarget ".agents\kit\scripts\verify_workflow.py") -Force
Copy-Item (Join-Path $KitRoot "catalog\*") (Join-Path $ResolvedTarget ".agents\kit\catalog") -Recurse -Force
Copy-Item (Join-Path $KitRoot "templates\*") (Join-Path $ResolvedTarget ".agents\kit\templates") -Recurse -Force
Copy-Item (Join-Path $KitRoot "kit_skills\*") (Join-Path $ResolvedTarget ".agents\kit\kit_skills") -Recurse -Force
Copy-Item (Join-Path $KitRoot "skills\*") (Join-Path $ResolvedTarget ".agents\kit\skills") -Recurse -Force
Copy-Item (Join-Path $KitRoot "wizard\skills_decision_wizard.html") (Join-Path $ResolvedTarget "wizard\skills_decision_wizard.html") -Force
Copy-Item (Join-Path $KitRoot "NON_DEV_GUIDE.md") (Join-Path $ResolvedTarget "NON_DEV_GUIDE.md") -Force

$BootAgents = @"
# Vibecode Setup Pending Wizard Selection (``AGENTS.md``)

Your **Antigravity Dynamic Vibecode Kit** is installed and waiting for your **Skills Decision Wizard** answers.

## Next Step (For Developers & Non-Developers)
1. Open ``wizard/skills_decision_wizard.html`` in your browser and answer the simple questions (or pick a Quick Example).
2. Click **"Copy Chat Prompt (No Terminal Needed)"** and paste it right here into Antigravity (or click **"Download wizard-selection.json"** and save it in this folder).
3. Antigravity will use ``dynamic-workflow-architect`` + ``python .agents/kit/scripts/generate_workflow.py --wizard wizard-selection.json --output .`` to compile your tailored workflow ensuring 100% of your selected skills, context checkpoints, and stage docs are wired!
"@
Set-Content -Path (Join-Path $ResolvedTarget "AGENTS.md") -Value $BootAgents -Encoding UTF8

Write-Host "[BOOTSTRAPPED] Base Dynamic Vibecode Kit installed in $ResolvedTarget"
Write-Host "Next: Open $ResolvedTarget\wizard\skills_decision_wizard.html, click 'Copy Chat Prompt', and paste into Antigravity!"
