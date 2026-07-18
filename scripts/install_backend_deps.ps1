# Install all Python dependencies for AlphaHive / Market-Rover backend.
# Run from repo root:  .\scripts\install_backend_deps.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "Installing backend requirements..." -ForegroundColor Cyan
pip install -r "$Root\market_rover\backend\requirements.txt"

Write-Host "Installing shared agent / analytics requirements..." -ForegroundColor Cyan
pip install -r "$Root\requirements.txt"

Write-Host "Verifying critical imports..." -ForegroundColor Cyan
python -c @"
import importlib, sys
from pathlib import Path
root = Path(r'$Root')
sys.path[:0] = [str(root / 'market_rover' / 'backend'), str(root)]
mods = [
  'src.server', 'plotly', 'nsepython', 'nselib', 'matplotlib', 'seaborn',
  'newspaper', 'duckduckgo_search', 'utils.report_visualizer',
]
for m in mods:
    importlib.import_module(m)
    print('  OK', m)
print('All critical imports passed.')
"@

Write-Host "Done. Start backend: cd market_rover\backend; uvicorn src.server:app --reload --port 8080" -ForegroundColor Green
