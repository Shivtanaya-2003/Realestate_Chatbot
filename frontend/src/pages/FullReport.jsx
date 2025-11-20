import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/*
FullReport.jsx
- Reads ?area=... from URL
- Calls POST /api/query/ with query=<area> to obtain chart + table
- Renders table and Recharts line chart
- Provides Download CSV and Close buttons
*/

export default function FullReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const area = searchParams.get("area") || "";
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (!area) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/api/query/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: area }),
        });
        const data = await res.json();

        // Try to build chart data from returned structure
        if (data.chart && Array.isArray(data.chart.years)) {
          const years = data.chart.years;
          const prices = data.chart.price || [];
          const demand = data.chart.demand || [];
          const rows = years.map((y, idx) => ({
            year: y,
            price: prices[idx] != null ? prices[idx] : null,
            demand: demand[idx] != null ? demand[idx] : null,
          }));
          setChartData(rows);
        }

        if (data.table_full) {
          setTableData(data.table_full);
        } else if (data.table_sample) {
          setTableData(data.table_sample);
        } else if (Array.isArray(data)) {
          setTableData(data);
        }

        if (data.basic && data.basic.summary) setSummary(data.basic.summary);
        else if (data.summary) setSummary(data.summary);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [area]);

  const downloadCSV = () => {
    if (!tableData || !tableData.length) {
      alert("No table data to download");
      return;
    }
    const keys = Object.keys(tableData[0]);
    const csvRows = [
      keys.join(","),
      ...tableData.map((row) =>
        keys.map((k) => {
          const v = row[k];
          if (v == null) return "";
          // escape quotes
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ];
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${area || "report"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center">
        <h4>📊 Full Market Report {area ? `— ${area}` : ""}</h4>
        <div>
          <button className="btn btn-secondary me-2" onClick={() => navigate(-1)}>
            Close
          </button>
          <button className="btn btn-success" onClick={downloadCSV}>
            Download CSV
          </button>
        </div>
      </div>

      {loading && <p>Loading...</p>}

      {summary && (
        <div className="mt-3 p-3 bg-light border rounded">
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{summary}</pre>
        </div>
      )}

      <div className="mt-4">
        {tableData && tableData.length > 0 ? (
          <table className="table table-bordered table-striped">
            <thead>
              <tr>
                {Object.keys(tableData[0]).map((k) => (
                  <th key={k}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i}>
                  {Object.keys(tableData[0]).map((k) => (
                    <td key={k}>{String(row[k] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No table data available.</p>
        )}
      </div>

      <div className="mt-4">
        {chartData && chartData.length > 0 ? (
          <LineChart width={700} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="price" name="Price" />
            <Line type="monotone" dataKey="demand" name="Demand" />
          </LineChart>
        ) : (
          <p>No chart data available.</p>
        )}
      </div>
    </div>
  );
}

/* Note: this file uses Recharts LineChart. Ensure you have installed `recharts`:
   npm install recharts
   (If you already have it, keep it)
*/
