import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import RegisterBusinessPage from "./pages/RegisterBusinessPage";
import { AuthProvider } from './pages/AuthContext.jsx'

function App() {
    return (
      <AuthProvider>
        <BrowserRouter>
          <Routes> 
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterBusinessPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );
}

export default App;