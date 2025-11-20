import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Chatbot from "./pages/Chatbot.jsx";
import "./App.css";
import FullReport from "./pages/FullReport";
import AreaComparison from "./pages/AreaComparison";
import PriceGrowth from "./pages/PriceGrowth";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chatbot />} />
        <Route path="/full-report" element={<FullReport />} />
        <Route path="/compare" element={<AreaComparison />} />
        <Route path="/compare-report" element={<AreaComparison />} />
        <Route path="/price-growth" element={<PriceGrowth />} />

      </Routes>
    </BrowserRouter>
  );
}
