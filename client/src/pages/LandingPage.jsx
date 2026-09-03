//Choice: Register Business / Login

function LandingPage() {
    return (
        <div>
            <div className="branding">
                <h1>Fishonitory</h1>
                <p>Welcome to Fishonitory!</p>
            </div>
            <div className="buttons">
                <button onClick={() => window.location.href = '/login'}>Login</button>
                <button onClick={() => window.location.href = '/register'}>Register a Business</button>
            </div>
        </div>
    );
}

export default LandingPage;