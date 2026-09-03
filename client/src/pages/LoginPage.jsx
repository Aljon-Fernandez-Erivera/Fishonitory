import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';

// LoginPage component handles user login functionality
function LoginPage() {
    const { login, logout } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [loginDialog, setLoginDialog] = useState(null);

    // Handle input ng mga users and sanitize the input values to prevent invalid characters
    const handleChange = (event) => {
        const { name, value } = event.target;
        const sanitizedValue = name === 'email'
            ? value.replace(/[^a-zA-Z0-9@._%+-]/g, '')
            : value.replace(/[^a-zA-Z0-9@#$!]/g, '');

        setFormData((previous) => ({ ...previous, [name]: sanitizedValue }));
        setErrors((previous) => ({ ...previous, [name]: '' }));
        setLoginDialog(null);
    };

    // Validate the form data before submission
    const validate = () => {
        const nextErrors = {};
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            nextErrors.email = 'Enter a valid email address.';
        }
        if (formData.password.length < 8) {
            nextErrors.password = 'Password must be at least 8 characters.';
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
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Login failed.');

//if the staff logs in, it will not lead to the dashboard but will show a
//  dialog box with the message "Attendance Recorded Successfully" and a button 
// "Next Staff" that will log out the staff and redirect to the login page. 
// If the owner logs in, it will show a dialog box with the message "Login successful" 
// and a button "Continue" that will redirect to the owner dashboard.
            login(data.token, data.user.role);
            const isStaff = data.user.role === 'Staff';
            setLoginDialog({
                title: isStaff ? 'Attendance Recorded Successfully' : 'Login successful',
                message: isStaff
                    ? 'Your login has been recorded as present for today.'
                    : 'Welcome back! You are now logged in.',
                type: 'success',
                buttonLabel: isStaff ? 'Next Staff' : 'Continue',
                nextAction: isStaff ? 'logout' : 'owner-dashboard'
            });
        } catch (error) {
            setLoginDialog({
                title: 'Login failed',
                message: error.message,
                type: 'error',
                buttonLabel: 'Try Again'
            });
        } finally {
            setLoading(false);
        }
    };

    // Render the login form
    return (
        <div>
            <div>
                <h1>Fishonitory</h1>
                <p>Log in to your business account</p>
                <a href="/">Back to Home</a>

                <dialog open={loading} aria-labelledby="login-loading-title">
                    <h2 id="login-loading-title">Logging in...</h2>
                    <progress aria-label="Logging in" />
                    <p>Please wait while we verify your account.</p>
                </dialog>

                <dialog open={Boolean(loginDialog)} aria-labelledby="login-dialog-title">
                    <h2 id="login-dialog-title">{loginDialog?.title}</h2>
                    <p role={loginDialog?.type === 'error' ? 'alert' : undefined}>
                        {loginDialog?.message}
                    </p>

                    {/* Redirect according to the authenticated user's role */}
                    <button
                        type="button"
                        onClick={() => {
                            const nextAction = loginDialog?.nextAction;
                            setLoginDialog(null);
                            if (nextAction === 'logout') {
                                logout();
                                window.location.replace('/login');
                            } else if (nextAction === 'owner-dashboard') {
                                window.location.href = '/owner-dashboard';
                            }
                        }}
                    >
                        {loginDialog?.buttonLabel}
                    </button>
                </dialog>

                <form onSubmit={handleSubmit} noValidate>
                    <label htmlFor="login-email">Email</label>
                    <input
                        id="login-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
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
                        required
                    />
                    {errors.password && <span>{errors.password}</span>}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p>Do not have an account? <a href="/register">Register here</a></p>
            </div>
        </div>
    );
}

export default LoginPage;
