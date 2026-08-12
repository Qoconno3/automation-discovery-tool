import { Link, Routes, Route } from "react-router-dom";
import IntakeForm from "./pages/IntakeForm";
import SubmissionHistory from "./pages/SubmissionHistory";
import SubmissionDetail from "./pages/SubmissionDetail";
import { IS_DEMO_MODE } from "./api/client";

export default function App() {
  return (
    <div className="app-shell">
      {IS_DEMO_MODE && (
        <div className="demo-banner">
          Demo mode — recommendations come from scripted sample data, not a real LLM. History is
          saved in this browser only and won't sync to other devices.
        </div>
      )}
      <nav className="top-nav">
        <Link to="/">New process</Link>
        <Link to="/submissions">Backlog</Link>
      </nav>
      <Routes>
        <Route path="/" element={<IntakeForm />} />
        <Route path="/submissions" element={<SubmissionHistory />} />
        <Route path="/submissions/:id" element={<SubmissionDetail />} />
      </Routes>
    </div>
  );
}
