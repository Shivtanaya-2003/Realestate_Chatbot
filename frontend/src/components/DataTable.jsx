import React from "react";

export default function DataTable({ rows }){
  if(!rows || rows.length===0) return <div>No table data</div>;
  const keys = Object.keys(rows[0]);
  return (
    <div style={{maxHeight:300, overflowY:"auto"}}>
      <table className="table table-sm table-bordered">
        <thead className="table-light">
          <tr>{keys.map(k=> <th key={k}>{k}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              {keys.map(k=> <td key={k}>{String(r[k] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
