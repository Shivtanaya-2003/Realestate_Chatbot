# api/utils.py
import pandas as pd

def load_dataset(path):
    """
    Read Excel and normalize column names.
    Return a pandas DataFrame.
    """
    df = pd.read_excel(path)
    # normalize column names (strip + lower)
    df.columns = df.columns.str.strip().str.lower()
    # normalize specific key we use for location
    # e.g. "final location" or similar -- ensure consistent lowercase column name
    return df

def filter_by_location(df, location, column='final location'):
    """
    Return rows for the location (exact match, case-insensitive).
    """
    if column not in df.columns:
        return pd.DataFrame(columns=df.columns)
    return df[df[column].str.lower() == str(location).lower()].copy()

def aggregate_time_series(df, year_col='year', price_col_candidates=None, demand_col_candidates=None):
    """
    Create a simple time-series DataFrame with columns: year, price, demand.
    - year_col: column name for year (must exist in df)
    - price_col_candidates: list of possible column names for price (try first available)
    - demand_col_candidates: list of possible column names for demand
    Returns a pandas.DataFrame sorted by year with numeric price and demand columns (filled zeros if missing).
    """
    if df is None or df.empty:
        return pd.DataFrame(columns=['year','price','demand'])

    # standardize column names (already lowercased by load_dataset)
    cols = df.columns.tolist()

    # guess price column
    if not price_col_candidates:
        price_col_candidates = [
            'price', 'flat - weighted average rate', 'flat - weighted average rate',
            'flat - weighted average rate', 'flat - weighted average rate'  # fallback duplicates ok
        ]
    price_col = next((c for c in price_col_candidates if c in cols), None)

    # guess demand column
    if not demand_col_candidates:
        demand_col_candidates = ['demand', 'total_sales - igr', 'total sold - igr', 'total_units', 'flat_sold - igr']
    demand_col = next((c for c in demand_col_candidates if c in cols), None)

    # use year column if present
    if year_col not in cols:
        # try common alternatives
        year_col = next((c for c in ['year', 'yr'] if c in cols), None)

    # Build aggregation: group by year and compute average price and sum/mean demand
    agg = None
    try:
        group = df.groupby(year_col)
        price_series = group[price_col].mean() if price_col in cols else pd.Series(dtype=float)
        demand_series = group[demand_col].sum() if demand_col in cols else pd.Series(dtype=float)

        # join into DataFrame
        agg = pd.DataFrame({
            'year': price_series.index.astype(int) if not price_series.empty else demand_series.index.astype(int),
            'price': price_series.values if not price_series.empty else [0]*len(demand_series),
            'demand': demand_series.values if not demand_series.empty else [0]*len(price_series)
        })
        # If one of series empty, fill zeros appropriately:
        if 'price' not in agg.columns:
            agg['price'] = 0
        if 'demand' not in agg.columns:
            agg['demand'] = 0

        agg = agg.sort_values('year').reset_index(drop=True)
        # Ensure numeric types and fill NaN
        agg['price'] = pd.to_numeric(agg['price'], errors='coerce').fillna(0)
        agg['demand'] = pd.to_numeric(agg['demand'], errors='coerce').fillna(0).astype(int)
    except Exception:
        agg = pd.DataFrame(columns=['year','price','demand'])

    return agg
