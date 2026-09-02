import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';

function LoginPage() {
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [serverMessage, setServerMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        const sanitizedValue = name === 'email'
            ? value.replace(/[^a-zA-Z0-9@._%+-]/g, '')
            : value.replace(/[^a-zA-Z0-9@#$!]/g, '');

        setFormData((previous) => ({ ...previous, [name]: sanitizedValue }));
        setErrors((previous) => ({ ...previous, [name]: '' }));
        setServerMessage('');
    };

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

    const handleSubmit = async (event) => {
        event.preventDefault();
        setServerMessage('');
        if (!validate()) return;

        setLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Login failed.');

            login(data.token, data.user.role);
            window.alert('Login successful!');
            window.location.href = '/';
        } catch (error) {
            setServerMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div>
                <h1>Fishonitory</h1>
                <p>Log in to your business account</p>
                <a href="/">Back to Home</a>

                {serverMessage && <p role="alert">{serverMessage}</p>}

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
