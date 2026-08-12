import { Link, Routes, Route } from "react-router-dom";
import IntakeForm from "./pages/IntakeForm";
import SubmissionHistory from "./pages/SubmissionHistory";
import SubmissionDetail from "./pages/SubmissionDetail";

export default function App() {
  return (
    <div className="app-shell">
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
