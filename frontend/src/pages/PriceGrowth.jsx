import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function PriceGrowth({ area, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [growthData, setGrowthData] = useState(null);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (!area) return;

    const fetchPriceGrowth = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/api/price_growth/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ area }),
        });

        const data = await res.json();
        console.log("PriceGrowth backend response:", data);

        if (data && Object.keys(data).length > 0) {
          setGrowthData(data);
          setSummary(data.summary || `Price growth analysis for ${area}`);
        } else {
          setGrowthData(null);
          setSummary(`No price growth data available for ${area}`);
        }
      } catch (err) {
        console.error(err);
        setSummary("Failed to load price growth data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPriceGrowth();
  }, [area]);

  const downloadCSV = () => {
    if (!growthData) {
      alert("No data to download");
      return;
    }

    const metrics = Object.keys(growthData).filter(k => k !== "summary");
    const rows = [];
    const header = ["Year", "Price"];
    rows.push(header.join(","));

    metrics.forEach(year => {
      const price = growthData[year] ?? "";
      rows.push([year, price].join(","));
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `price_growth_${area}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const chartData = [];
  if (growthData) {
    for (const key of Object.keys(growthData)) {
      if (key === "summary") continue;
      chartData.push({ year: key, price: growthData[key] });
    }
  }

  return (
    <div className="container p-4">
      <div className="d-flex justify-content-between align-items-center">
        <h4>📈 Price Growth - {area}</h4>
        <div>
          <button className="btn btn-secondary me-2" onClick={onClose}>Close</button>
          <button className="btn btn-success" onClick={downloadCSV}>Download CSV</button>
        </div>
      </div>

      {loading && <p>Loading price growth data...</p>}

      <p className="mt-2"><b>{summary}</b></p>

      {growthData ? (
        <>
          <table className="table table-bordered mt-3">
            <thead className="table-dark">
              <tr>
                <th>Year</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td>{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {chartData.length > 0 && (
            <div className="mt-4">
              <BarChart width={700} height={300} data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="price" name="Price" fill="#82ca9d" />
              </BarChart>
            </div>
          )}
        </>
      ) : (
        <p>No detailed price growth data available.</p>
      )}
    </div>
  );
}
