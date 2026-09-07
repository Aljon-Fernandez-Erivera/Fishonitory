import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import RegisterBusinessPage from "./pages/RegisterBusinessPage";
import OwnerDashboard from "./pages/owner/OwnerDashboard.jsx";
import StaffDashboard from "./pages/staff/StaffDashboard.jsx";
import AboutPage from "./pages/shared/AboutPage.jsx";
import HelpPage from "./pages/shared/HelpPage.jsx";
import AccountPage from "./pages/shared/AccountPage.jsx";
import { AuthProvider } from "./pages/shared/AuthContext.jsx";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterBusinessPage />} />
          <Route path="/owner-dashboard" element={<OwnerDashboard />} />
          <Route path="/staff-dashboard" element={<StaffDashboard />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
