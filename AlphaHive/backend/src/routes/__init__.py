"""Modular routes package for the Market-Rover API."""
from fastapi import APIRouter
from src.routes.auth import router as auth_router
from src.routes.analyze import router as analyze_router
from src.routes.profile import router as profile_router
from src.routes.forecast import router as forecast_router
from src.routes.shadow import router as shadow_router
from src.routes.calendar import router as calendar_router
from src.routes.heatmap import router as heatmap_router
from src.routes.portfolio import router as portfolio_router
from src.routes.market import router as market_router
from src.routes.brain import router as brain_router
from src.routes.health import router as health_router
from src.routes.reports import router as reports_router

router = APIRouter()
router.include_router(auth_router,     prefix="/auth",      tags=["Authentication"])
router.include_router(analyze_router,  prefix="/analyze",   tags=["Intelligence"])
router.include_router(profile_router,  prefix="/profile",   tags=["Profile"])
router.include_router(forecast_router, prefix="/forecasts", tags=["Forecasts"])
router.include_router(shadow_router,   prefix="/shadow",    tags=["Shadow"])
router.include_router(calendar_router, prefix="/calendar",  tags=["Calendar"])
router.include_router(heatmap_router,  prefix="/heatmap",   tags=["Heatmap"])
router.include_router(portfolio_router, prefix="/portfolios", tags=["Portfolios"])
router.include_router(market_router,   prefix="/market",    tags=["Market"])
router.include_router(brain_router,    prefix="/brain",     tags=["Brain"])
router.include_router(health_router,   prefix="/health",    tags=["Health"])
router.include_router(reports_router,  prefix="/reports",   tags=["Reports"])
