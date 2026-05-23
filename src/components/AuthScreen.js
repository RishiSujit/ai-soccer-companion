import { useState } from 'react';
import { supabase } from '../lib/supabase';

function AuthScreen({ initialMode, onAuthenticated, onGuest }) {
  const [mode, setMode] = useState(initialMode || 'signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
  };

  const handleGoogleClick = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  async function handleSignUp() {
    if (!firstName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const displayName = firstName.trim() + (lastName.trim() ? ' ' + lastName.trim() : '');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            display_name: displayName,
          },
        },
      });
      if (error) throw error;

      if (data?.user && !data?.session) {
        // Email confirmation required — session won't exist until confirmed
        await supabase
          .from('users')
          .upsert(
            { id: data.user.id, email: email.trim(), auth_type: 'authenticated', display_name: displayName },
            { onConflict: 'id' }
          )
          .catch(() => {});
        setSuccessMessage(
          `Welcome ${firstName}! Check your email at ${email.trim()} to confirm your account, then sign in.`
        );
        return;
      }

      if (data?.user) {
        await supabase
          .from('users')
          .upsert(
            { id: data.user.id, email: email.trim(), auth_type: 'authenticated', display_name: displayName },
            { onConflict: 'id' }
          )
          .catch(() => {});
        onAuthenticated(data.user);
      } else {
        throw new Error('Sign up failed — no user returned');
      }
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('This email is already registered. Try signing in instead.');
      } else {
        setError(err.message || 'Sign up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) throw error;
      onAuthenticated(data.user);
    } catch (err) {
      if (err.message?.includes('Invalid login')) {
        setError('Wrong email or password. Try again.');
      } else {
        setError(err.message || 'Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email above first, then click Forgot password');
      return;
    }
    try {
      await supabase.auth.resetPasswordForEmail(email.trim());
      setError(null);
      setSuccessMessage('Password reset email sent! Check your inbox.');
    } catch {
      setError('Could not send reset email');
    }
  }

  const handleSubmit = () => {
    if (mode === 'signup') handleSignUp();
    else handleSignIn();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="auth-screen">
      {/* Brand */}
      <div className="auth-brand">
        <div className="auth-brand-icon">⚽</div>
        <div className="auth-brand-name">World<span>Cup</span> Companion</div>
      </div>

      {/* Card */}
      <div className="auth-card">

        {/* Mode toggle */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'signup' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Create account
          </button>
          <button
            className={`auth-tab ${mode === 'signin' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMode('signin')}
          >
            Sign in
          </button>
        </div>

        {/* Name row (signup only) */}
        {mode === 'signup' && (
          <div className="auth-name-row">
            <input
              className="auth-input"
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <input
              className="auth-input"
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
        )}

        {/* Email */}
        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoComplete="email"
        />

        {/* Password */}
        <div className="auth-password-wrap">
          <input
            className="auth-input auth-input--pw"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          <button
            className="auth-pw-toggle"
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(s => !s)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Forgot password (signin only) */}
        {mode === 'signin' && (
          <div className="auth-forgot" onClick={handleForgotPassword}>
            Forgot password?
          </div>
        )}

        {/* Error / success messages */}
        {error && <div className="auth-error">{error}</div>}
        {successMessage && <div className="auth-success">{successMessage}</div>}

        {/* Primary CTA */}
        <button className="auth-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : mode === 'signup' ? 'Create account →' : 'Sign in →'}
        </button>

        {/* Divider */}
        <div className="auth-divider">
          <div className="auth-div-line" />
          <span>OR</span>
          <div className="auth-div-line" />
        </div>

        {/* Google (coming soon) */}
        <button className="auth-google-btn" onClick={handleGoogleClick}>
          <div className="auth-google-icon">G</div>
          Continue with Google
        </button>

        {/* Guest */}
        <span className="auth-guest-link" onClick={onGuest}>
          Continue as guest — limited features
        </span>

        {/* Switch mode */}
        <div className="auth-switch">
          {mode === 'signup' ? (
            <>Already have an account? <span onClick={() => switchMode('signin')}>Sign in</span></>
          ) : (
            <>No account yet? <span onClick={() => switchMode('signup')}>Sign up free</span></>
          )}
        </div>

        {/* Terms (signup only) */}
        {mode === 'signup' && (
          <div className="auth-terms">
            By signing up you agree to our{' '}
            <span className="auth-terms-link">Terms of Service</span>
            {' '}and{' '}
            <span className="auth-terms-link">Privacy Policy</span>
          </div>
        )}

      </div>

      {/* Toast */}
      {showToast && (
        <div className="auth-toast">
          Google sign-in coming soon! Use email for now.
        </div>
      )}
    </div>
  );
}

export default AuthScreen;
