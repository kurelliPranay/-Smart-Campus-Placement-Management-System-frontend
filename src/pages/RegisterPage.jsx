import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const currentYear = new Date().getFullYear();

const initialState = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'STUDENT',
  branch: 'CSE',
  graduationYear: String(currentYear),
  collegeName: ''
};

function StudentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m2 9 10-5 10 5-10 5L2 9Z" />
      <path d="M6 11v5c3.5 3 8.5 3 12 0v-5M22 9v6" />
    </svg>
  );
}

function RecruiterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="17" rx="2" />
      <path d="M9 21v-5h6v5M8 8h2m4 0h2m-8 4h2m4 0h2" />
    </svg>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (event) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleRoleChange = (role) => {
    setForm((previous) => ({ ...previous, role }));
    setError('');
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const registration = {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: form.role
      };
      if (form.role === 'STUDENT') {
        Object.assign(registration, {
          branch: form.branch,
          graduationYear: Number(form.graduationYear),
          collegeName: form.collegeName
        });
      }
      await register(registration);
      setMessage('Registration successful. You can now sign in.');
      window.setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const isStudent = form.role === 'STUDENT';

  return (
    <main className="registration-page">
      <section className="registration-card" aria-labelledby="registration-title">
        <div className="registration-icon"><StudentIcon /></div>
        <h1 id="registration-title">{isStudent ? 'Create Student Account' : 'Create Recruiter Account'}</h1>
        <p className="registration-subtitle">
          {isStudent
            ? 'Register for CampusConnect placement drives and skill gap analysis.'
            : 'Join CampusConnect to connect with qualified campus candidates.'}
        </p>

        <div className="registration-tabs" aria-label="Choose account type">
          <button
            type="button"
            className={isStudent ? 'registration-tab active' : 'registration-tab'}
            aria-pressed={isStudent}
            onClick={() => handleRoleChange('STUDENT')}
          >
            <StudentIcon />
            Student Registration
          </button>
          <button
            type="button"
            className={!isStudent ? 'registration-tab active' : 'registration-tab'}
            aria-pressed={!isStudent}
            onClick={() => handleRoleChange('COMPANY')}
          >
            <RecruiterIcon />
            Recruiter Registration
          </button>
        </div>

        {error && <div className="alert error" role="alert">{error}</div>}
        {message && <div className="alert success" role="status">{message}</div>}

        <form className="registration-form" onSubmit={handleSubmit}>
          <div className="registration-field">
            <label htmlFor="register-name">{isStudent ? 'Full Name' : 'Recruiter Name'}</label>
            <input
              id="register-name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder={isStudent ? 'e.g. Aisha Kumar' : 'e.g. Aisha Kumar'}
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
            />
          </div>

          <div className="registration-field">
            <label htmlFor="register-email">{isStudent ? 'College / University Email' : 'Work Email'}</label>
            <input
              id="register-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder={isStudent ? 'student@campus.edu' : 'you@company.com'}
              autoComplete="email"
              required
            />
          </div>

          <div className="registration-field-grid">
            <div className="registration-field">
              <label htmlFor="register-password">Password</label>
              <div className="registration-password-wrap">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 6 chars"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="registration-password-visibility"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="registration-field">
              <label htmlFor="register-confirm-password">Confirm Password</label>
              <div className="registration-password-wrap">
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="registration-password-visibility"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          {isStudent ? (
            <>
              <div className="registration-field-grid">
                <div className="registration-field">
                  <label htmlFor="register-branch">Branch / Department</label>
                  <select id="register-branch" name="branch" value={form.branch} onChange={handleChange} required>
                    <option value="CSE">Computer Science (CSE)</option>
                    <option value="IT">Information Technology (IT)</option>
                    <option value="ECE">Electronics (ECE)</option>
                    <option value="EEE">Electrical (EEE)</option>
                    <option value="Mechanical">Mechanical Engineering</option>
                    <option value="Civil">Civil Engineering</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="registration-field">
                  <label htmlFor="register-graduation-year">Graduation Year</label>
                  <input
                    id="register-graduation-year"
                    name="graduationYear"
                    type="number"
                    min="2000"
                    max="2100"
                    value={form.graduationYear}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="registration-field">
                <label htmlFor="register-college">College / University</label>
                <input
                  id="register-college"
                  name="collegeName"
                  value={form.collegeName}
                  onChange={handleChange}
                  placeholder="e.g. National Institute of Technology"
                  maxLength={150}
                  required
                />
              </div>
            </>
          ) : (
            <p className="registration-note">
              You can add your company name and hiring details after signing in.
            </p>
          )}

          <button className="registration-submit" type="submit" disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Complete Registration'}
            {!submitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p className="registration-login">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
