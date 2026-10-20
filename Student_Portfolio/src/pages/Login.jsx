import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";

/**
 * Combined login / registration screen.
 * Client-side checks here are a convenience only - the same rules are enforced
 * again on the server, which is the copy that actually protects the database.
 */
function Login() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register, sessionMessage, clearSessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from || "/tasks";
  const isRegister = mode === "register";

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setError(null);
    clearSessionMessage();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    clearSessionMessage();

    if (isRegister && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setSubmitting(true);

      if (isRegister) {
        await register({ name, email, password });
      } else {
        await login({ email, password });
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container auth-page" id="login-page">
      <h1 className="page-title" id="login-title">
        {isRegister ? "Create an Account" : "Log In"}
      </h1>

      <p className="page-subtitle" id="login-subtitle">
        {isRegister
          ? "Register to manage your own private task list."
          : "Log in to access your tasks."}
      </p>

      {sessionMessage && <p className="auth-notice">{sessionMessage}</p>}

      <form onSubmit={handleSubmit} className="auth-form" id="auth-form">
        {isRegister && (
          <div className="form-group">
            <label htmlFor="auth-name">Name</label>
            <input
              id="auth-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isRegister ? "At least 6 characters" : "Your password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
          />
        </div>

        {error && <ErrorMessage title="Authentication failed" message={error} />}

        <button type="submit" className="submit-btn" disabled={submitting}>
          {isRegister ? "Register" : "Log In"}
        </button>
      </form>

      {submitting && <Spinner text="Please wait..." />}

      <p className="auth-switch">
        {isRegister ? "Already have an account?" : "No account yet?"}{" "}
        <button type="button" className="auth-switch-btn" onClick={switchMode}>
          {isRegister ? "Log in instead" : "Register instead"}
        </button>
      </p>
    </div>
  );
}

export default Login;
