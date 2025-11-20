from django.urls import path
from .views import query, full_info, download_report, compare_areas, get_area_info,price_growth

urlpatterns = [
    path("query/", query),
    path("full_info/<str:area>/", full_info),
    path("download/<str:area>/", download_report),
    path("compare/", compare_areas),   # ← THIS MUST BE HERE
    path("price-growth/", price_growth), 
    path("area-info", get_area_info),
]
