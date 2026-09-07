import { useEffect, useState } from "react";
import { useAuth } from "./shared/useAuth.js";
import { API_URL } from "../config.js";

// LoginPage component handles user login functionality
function LoginPage() {
  const { login, logout } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loginDialog, setLoginDialog] = useState(null);
  const [lockSeconds, setLockSeconds] = useState(0);

  const formatLockTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (loginDialog?.nextAction !== "logout") return undefined;

    const timeoutId = window.setTimeout(async () => {
      await logout();
      window.location.replace("/login");
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [loginDialog, logout]);

  useEffect(() => {
    if (lockSeconds <= 0) return undefined;

    const timerId = window.setInterval(() => {
      setLockSeconds((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          window.location.reload();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [lockSeconds]);

  // Handle input ng mga users and sanitize the input values to prevent invalid characters
  const handleChange = (event) => {
    const { name, value } = event.target;
    if (lockSeconds > 0) return;
    const sanitizedValue =
      name === "email"
        ? value.replace(/[^a-zA-Z0-9@._%+-]/g, "")
        : value.replace(/[^a-zA-Z0-9@#$!]/g, "");

    setFormData((previous) => ({ ...previous, [name]: sanitizedValue }));
    setErrors((previous) => ({
      ...previous,
      [name]: "",
      general: "",
    }));
    setLoginDialog(null);
  };

  // Validate the form data before submission
  const validate = () => {
    const nextErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!formData.password) {
      nextErrors.password = "Enter your password.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Handle form submission and communicate with the server for login
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoginDialog(null);
    if (!validate()) return;

    // Set loading state to true while the login request is being processed
    setLoading(true);
    // need to be animate (dialog box with loading spinner and text "Logging in...") while waiting for the server response
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        if (["ACCOUNT_LOCKED", "IP_RATE_LIMITED"].includes(data.code)) {
          setLockSeconds(Number(data.retryAfterSeconds) || 300);
          setLoginDialog({
            title: "Login locked",
            message: data.message,
            type: "locked",
            buttonLabel: "Please wait",
          });
          return;
        }

        throw new Error(data.message || "Invalid email or password.");
      }

      // Staff login only records attendance. Only Master Staff can use the
      // staff workspace after authentication.
      login(data.token, data.user.role);
      const isStaff = data.user.role === "Staff";
      const isMasterStaff = data.user.role === "masterStaff";
      setLoginDialog({
        title: isStaff
          ? "Attendance Recorded Successfully"
          : "Login successful",
        message: isStaff
          ? "Your login has been recorded as present for today."
          : "Welcome back! You are now logged in.",
        type: "success",
        buttonLabel: isStaff ? "Next Staff" : "Continue",
        nextAction: isStaff
          ? "logout"
          : isMasterStaff
            ? "staff-dashboard"
            : "owner-dashboard",
      });
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Render the login form
  return (
    <div>
      <div>
        <h1>Fishonitory</h1>
        <a href="/">Back to Home</a>

        <dialog open={loading} aria-labelledby="login-loading-title">
          <h2 id="login-loading-title">Logging in...</h2>
          <progress aria-label="Logging in" />
          <p>Please wait while we verify your account.</p>
        </dialog>

        <dialog
          open={Boolean(loginDialog)}
          aria-labelledby="login-dialog-title"
        >
          <h2 id="login-dialog-title">{loginDialog?.title}</h2>
          <p role={loginDialog?.type === "error" ? "alert" : undefined}>
            {loginDialog?.type === "locked"
              ? `Try again in ${formatLockTime(lockSeconds)}`
              : loginDialog?.message}
          </p>

          {/* Redirect according to the authenticated user's role */}
          <button
            type="button"
            disabled={loginDialog?.type === "locked"}
            onClick={async () => {
              const nextAction = loginDialog?.nextAction;
              setLoginDialog(null);
              if (nextAction === "logout") {
                await logout();
                window.location.replace("/login");
              } else if (nextAction === "owner-dashboard") {
                window.location.href = "/owner-dashboard";
              } else if (nextAction === "staff-dashboard") {
                window.location.href = "/staff-dashboard";
              }
            }}
          >
            {loginDialog?.buttonLabel}
          </button>
        </dialog>

        <form onSubmit={handleSubmit} noValidate>
          {errors.general && (
            <p className="feedback error" role="alert">
              {errors.general}
            </p>
          )}

          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            disabled={lockSeconds > 0}
            required
          />
          {errors.email && <span>{errors.email}</span>}

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            disabled={lockSeconds > 0}
            required
          />
          {errors.password && <span>{errors.password}</span>}

          <button type="submit" disabled={loading || lockSeconds > 0}>
            {lockSeconds > 0
              ? `Login locked (${formatLockTime(lockSeconds)})`
              : loading
                ? "Logging in..."
                : "Login"}
          </button>
        </form>

        <p>
          Do not have an account? <a href="/register">Register here</a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
