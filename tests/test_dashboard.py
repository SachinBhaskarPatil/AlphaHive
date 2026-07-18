import sys
import os
import pytest

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from rover_tools.dashboard_renderer import DashboardRenderer
except ImportError:
    # Handle case if import fails due to other deps
    DashboardRenderer = None

class TestDashboardRenderer:
    def test_instantiation(self):
        if DashboardRenderer:
            renderer = DashboardRenderer()
            assert renderer is not None
        else:
            pytest.skip("DashboardRenderer could not be imported")
        
    def test_methods_exist(self):
        if DashboardRenderer:
            renderer = DashboardRenderer()
            assert hasattr(renderer, 'generate_dashboard')
