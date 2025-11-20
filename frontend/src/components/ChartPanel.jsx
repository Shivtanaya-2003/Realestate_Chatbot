import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function ChartPanel({ data }){
  if(!data) return <div>No chart data</div>;

  if(data.years && data.price){
    const chartData = {
      labels: data.years,
      datasets: [
        { label: "Price", data: data.price, tension:0.2, borderColor: "rgba(54,162,235,0.9)", yAxisID: "y1" },
        { label: "Demand", data: data.demand, tension:0.2, borderColor: "rgba(75,192,192,0.9)", yAxisID: "y2" }
      ]
    };
    const options = {
      responsive: true,
      plugins:{ legend:{position:"top"}, title:{display:true, text:"Price & Demand Trends"} },
      scales:{ y1:{ type:"linear", position:"left" }, y2:{ type:"linear", position:"right", grid:{ drawOnChartArea:false } } }
    };
    return <Line data={chartData} options={options} />;
  }

  if(data.compare){

    const labels = data.compare[0].chart.years;
    const datasets = [];
    const colors = [["54,162,235"],["255,99,132"],["75,192,192"],["153,102,255"]];
    data.compare.forEach((c, idx) => {
      datasets.push({ label: `${c.area} Price`, data: c.chart.price, borderColor: `rgba(${colors[idx%colors.length]},0.9)`, tension:0.2 });
      datasets.push({ label: `${c.area} Demand`, data: c.chart.demand, borderColor: `rgba(${(idx+1)*30%255},${(idx+2)*60%255},${(idx+3)*90%255},0.9)`, tension:0.2 });
    });
    return <Line data={{labels, datasets}} options={{responsive:true, plugins:{legend:{position:"top"}}}} />;
  }

  return <div>No chart data</div>;
}
