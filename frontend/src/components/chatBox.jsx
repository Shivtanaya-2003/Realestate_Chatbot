import React, {useState} from "react";
import axios from "axios";
import ChartPanel from "./ChartPanel";
import DataTable from "./DataTable";

const API_URL = "http://127.0.0.1:8000/api/query/";

export default function ChatBox(){
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  

  async function sendQuery(){
    if(!query.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    try{
      const res = await axios.post(API_URL, { query });
      setResponse(res.data);
    }catch(err){
      console.error(err);
      setError(err.response?.data || err.message);
    }finally{
      setLoading(false);
      setQuery("");
    }
  }

  function downloadCSV(rows){
    if(!rows || rows.length===0) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(",")].concat(rows.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))).join("\n");
    const blob = new Blob([csv], {type: "text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filtered_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const getTableRows = () => {
    if(response?.table) return response.table;
    if(response?.compare) return response.compare.flatMap(c => c.table || []);
    return [];
  }

  const getChartData = () => {
    if(response?.chart) return response.chart;
    if(response?.compare) return { compare: response.compare };
    return null;
  }

  return (
    <div className="card p-3 shadow-sm">
      <div className="input-group mb-2">
        <input className="form-control" placeholder="Ask about a locality (e.g., Analyze Wakad)" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=> e.key==="Enter" && sendQuery()} />
        <button className="btn btn-primary" onClick={sendQuery} disabled={loading}>{loading ? "..." : "Ask"}</button>
      </div>

      {error && <div className="alert alert-danger">{JSON.stringify(error)}</div>}

      {response && (
        <>
          <h6>Summary</h6>
          <div className="mb-2">
            {response.summary || (response.compare && response.compare.map(c => <div key={c.area}><strong>{c.area}</strong>: {c.summary}</div>))}
          </div>

          <div className="d-flex mb-2 gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={()=>downloadCSV(getTableRows())}>Download Data</button>
          </div>

          <h6>Chart</h6>
          <div style={{height:300}}>
            <ChartPanel data={getChartData()} />
          </div>

          <h6 className="mt-3">Table</h6>
          <DataTable rows={getTableRows()} />
        </>
      )}
    </div>
  );
}
