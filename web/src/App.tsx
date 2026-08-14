import { Link, Routes, Route } from "react-router-dom";
import IntakeForm from "./pages/IntakeForm";
import SubmissionHistory from "./pages/SubmissionHistory";
import SubmissionDetail from "./pages/SubmissionDetail";
import ThemeToggle from "./components/ThemeToggle";

export default function App() {
  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="top-nav-links">
          <Link to="/">New process</Link>
          <Link to="/submissions">Backlog</Link>
        </div>
        <ThemeToggle />
      </nav>
      <Routes>
        <Route path="/" element={<IntakeForm />} />
        <Route path="/submissions" element={<SubmissionHistory />} />
        <Route path="/submissions/:id" element={<SubmissionDetail />} />
      </Routes>
    </div>
  );
}
