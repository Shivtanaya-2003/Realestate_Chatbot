# api/views.py
import os
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from django.http import HttpResponse
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import pandas as pd
from .utils import load_dataset, filter_by_location, aggregate_time_series
from rest_framework import status

# load dataset once (update path to your excel)
EXCEL_PATH = r"E:\RealestateChatbot\backend\api\realestate_sample.xlsx"
DF = load_dataset(EXCEL_PATH)

@api_view(["GET"])
def full_info(request, area):
    filtered = DF[DF["final location"].str.lower() == area.lower()]
    if filtered.empty:
        return Response({"error": "No records found"})
    return Response({"data": filtered.to_dict(orient="records")})

@api_view(["GET"])
def download_report(request, area):
    filtered = DF[DF["final location"].str.lower() == area.lower()]
    if filtered.empty:
        return HttpResponse("No data found", status=404)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{area}_report.csv"'
    filtered.to_csv(response, index=False)
    return response


@api_view(["POST"])
def query(request):
    user_query = (request.data.get("query") or "").strip().lower()
    if not user_query:
        return Response({"detail": "query required"}, status=400)

    # Match area
    candidates = DF['final location'].dropna().unique().tolist()
    matched = next((c for c in candidates if str(c).lower() in user_query), None)
    if not matched:
        token = user_query.split()[-1]
        matched = next((c for c in candidates if token in str(c).lower()), None)

    if not matched:
        return Response({"response": "Area not found. Try: Analyze Wakad"})

    # Filter rows
    filtered = filter_by_location(DF, matched, column='final location')
    if filtered.empty:
        return Response({"response": f"No data found for {matched.title()}."})

    def get_value(col):
        return filtered.iloc[0][col] if col in filtered.columns else None

    # LLM-style summary
    summary = f"""
Area: {matched.title()}
City: {get_value('city')}
Total Sales: {get_value('total_sales - igr') or get_value('total sold - igr')}
Total Units Sold: {get_value('total sold - igr') or get_value('total_sales - igr')}
"""

    # Time series aggregation for chart
    ts = aggregate_time_series(filtered,
                               year_col='year',
                               price_col_candidates=['flat - weighted average rate','flat - most prevailing rate - range','price'],
                               demand_col_candidates=['total_sales - igr','total sold - igr','flat_sold - igr','total_units'])

    chart = {
        "years": ts['year'].tolist(),
        "price": [float(x) for x in ts['price'].tolist()],
        "demand": [int(x) for x in ts['demand'].tolist()],
    }

    # Send **full table for report page**
    table_full = filtered.to_dict(orient='records')

    return Response({
        "basic": {
            "area": matched.title(),
            "city": get_value("city"),
            "summary": summary
        },
        "chart": chart,
        "table_sample": table_full[:10],
        "table_full": table_full
    })

@api_view(["POST"])
def compare_areas(request):
    """
    Accepts JSON: { "areas": ["wakad", "aundh"] }
    Returns a structured comparison object (mock or computed).
    """
    areas = request.data.get("areas") or request.data.get("areas", [])
    # also accept if someone sent JSON body like {"areas":"wakad,aundh"}
    if isinstance(areas, str):
        areas = [a.strip() for a in areas.split(",") if a.strip()]

    if not areas or len(areas) < 2:
        return Response({"error": "Please provide two or more areas in 'areas' list."}, status=status.HTTP_400_BAD_REQUEST)

    # take first two (you can extend for multiple)
    a1 = areas[0].lower()
    a2 = areas[1].lower()

    df1 = DF[DF["final location"].str.lower() == a1]
    df2 = DF[DF["final location"].str.lower() == a2]

    if df1.empty or df2.empty:
        return Response({"error": "One or both areas not found"}, status=status.HTTP_404_NOT_FOUND)

    # Build simple "comparison" object. Replace with more advanced calcs if needed.
    # Example structure: { pricing: { wakad: 9000, aundh:11000 }, connectivity: {...}, rental: {...} }
    def avg_price(df):
        for col in ['flat - weighted average rate','flat - most prevailing rate - range','price']:
            if col in df.columns:
                try:
                    return float(df[col].dropna().astype(float).mean())
                except:
                    continue
        return None

    comparison = {
        "pricing": {
            a1: avg_price(df1),
            a2: avg_price(df2),
        },
        "total_records": {
            a1: len(df1),
            a2: len(df2),
        },
        # example other metrics (you can expand)
        "city": {
            a1: df1.iloc[0].get("city") if not df1.empty else None,
            a2: df2.iloc[0].get("city") if not df2.empty else None,
        }
    }

    summary = f"Comparison generated for: {a1.title()} and {a2.title()}. Open full details for pricing and tables."

    return Response({
        "summary": summary,
        "comparison": comparison,
        "areas": [a1.title(), a2.title()]
    })


# --- Add this new endpoint for price growth ---
@api_view(["POST"])
def price_growth(request):
    """
    Accepts JSON: { "area": "akurdi" }
    Returns last 3 years average price for that area (as list of {year, price})
    """
   

    area = (request.data.get("area") or "").strip()
    if not area:
        return Response({"error": "Area required"}, status=status.HTTP_400_BAD_REQUEST)

    filtered = DF[DF["final location"].str.lower() == area.lower()]
    if filtered.empty:
        return Response({"error": "Area not found"}, status=status.HTTP_404_NOT_FOUND)

    # find price column
    price_col = None
    for c in ['flat - weighted average rate','flat - most prevailing rate - range','price']:
        if c in filtered.columns:
            price_col = c
            break

    if price_col is None or 'year' not in filtered.columns:
        return Response({"error": "Dataset missing required columns"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # group by year and take mean, then pick last 3 years
    try:
        df_year = filtered[[ 'year', price_col ]].dropna()
        # Ensure numeric
        df_year[price_col] = pd.to_numeric(df_year[price_col], errors='coerce')
        df_group = df_year.groupby('year')[price_col].mean().reset_index().sort_values('year', ascending=False)
        last3 = df_group.head(3).sort_values('year')  # ascending for plotting
        growth = last3.to_dict(orient='records')
    except Exception as e:
        return Response({"error": f"Failed to compute growth: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        "area": area.title(),
        "price_col": price_col,
        "growth": growth
    })



@csrf_exempt
def get_area_info(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)

    data = json.loads(request.body)
    area = data.get("area")

    if not area:
        return JsonResponse({"error": "No area provided"}, status=400)

    # Use already loaded DF and correct column name
    filtered = DF[DF["final location"].str.lower() == area.lower()]

    if filtered.empty:
        return JsonResponse({"error": "Area not found"}, status=404)

    return JsonResponse({
        "area": area.title(),
        "details": filtered.to_dict(orient="records")
    })
