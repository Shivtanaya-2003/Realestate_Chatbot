import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function AreaComparison({ areas: propAreas, onClose }) {
  const navigate = useNavigate();
  const areas = propAreas || [];
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (!areas || areas.length < 1) return;

    const fetchCompare = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/api/compare/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ areas }),
        });
        const data = await res.json();
        console.log("Backend response:", data);

        // Use data.comparison if present, otherwise fallback to top-level metrics
        if (data.comparison && Object.keys(data.comparison).length > 0) {
  setComparison(data.comparison);
} else {
  // fallback: take all numeric fields
  const fallback = {};
  areas.forEach(a => {
    Object.keys(data).forEach(k => {
      if (k !== "summary") {
        fallback[k] = fallback[k] || {};
        fallback[k][a] = data[k]?.[a] ?? "-";
      }
    });
  });
  setComparison(Object.keys(fallback).length > 0 ? fallback : null);
}


        if (data.summary) setSummary(data.summary);
        else setSummary(`Comparison generated for ${areas.join(", ")}`);
      } catch (err) {
        console.error(err);
        setSummary("Failed to load comparison.");
      } finally {
        setLoading(false);
      }
    };

    fetchCompare();
  }, [areas]);

  const downloadCSV = () => {
    if (!comparison) {
      alert("No data to download");
      return;
    }
    const metrics = Object.keys(comparison || {});
    const rows = [];
    const header = ["Metric", ...areas];
    rows.push(header.join(","));

    metrics.forEach((metric) => {
      const row = [metric];
      areas.forEach((a) => {
        let v = (comparison[metric] && comparison[metric][a]) ?? "";
        if (typeof v === "object") v = JSON.stringify(v);
        row.push(`"${String(v).replace(/"/g, '""')}"`);
      });
      rows.push(row.join(","));
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparison_${areas.join("_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data if pricing exists
 const chartData = [];
if (comparison) {
  for (const metric of Object.keys(comparison)) {
    const prices = areas.map(a => comparison[metric][a]).filter(v => typeof v === "number");
    if (prices.length === areas.length) {
      areas.forEach(a => chartData.push({ area: a, price: comparison[metric][a] }));
      break;
    }
  }
}


  return (
    <div className="container p-4">
      <div className="d-flex justify-content-between align-items-center">
        <h4>📊 Area Comparison</h4>
        <div>
          <button className="btn btn-secondary me-2" onClick={onClose}>Close</button>
          <button className="btn btn-success" onClick={downloadCSV}>Download CSV</button>
        </div>
      </div>

      {loading && <p>Loading comparison...</p>}

      <p className="mt-2"><b>{summary}</b></p>

      {comparison ? (
        <>
          <table className="table table-bordered mt-3">
            <thead className="table-dark">
              <tr>
                <th>Factor</th>
                {areas.map((a) => (
                  <th key={a}>{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(comparison).map((metric) => (
                <tr key={metric}>
                  <td style={{ textTransform: "capitalize" }}>{metric}</td>
                  {areas.map((a) => {
                    const value = (comparison[metric] && comparison[metric][a]) ?? "-";
                    return (
                      <td key={a}>
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {chartData.length > 0 && (
            <div className="mt-4">
              <BarChart width={700} height={300} data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="area" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="price" name="Average Price" />
              </BarChart>
            </div>
          )}
        </>
      ) : (
        <p>No detailed comparison data available.</p>
      )}
    </div>
  );
}
