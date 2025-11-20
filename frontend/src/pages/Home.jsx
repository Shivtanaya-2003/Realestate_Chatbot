import { Link } from "react-router-dom";
import "../App.css";

export default function Home() {
  return (
    <div className="home-bg d-flex justify-content-center align-items-center">
      <div className="home-box text-center text-white p-5">
        <h1 className="fw-bold mb-3">🏡 Real Estate Chatbot</h1>
        <p className="mb-4">Welcome to Real Estate Chatbot</p>
        <p className="mb-4">Find properties, locations, and prices instantly.</p>
        <Link to="/chat" className="btn btn-light btn-lg px-4 py-2">
          Start Chat
        </Link>
      </div>
    </div>
  );
}
