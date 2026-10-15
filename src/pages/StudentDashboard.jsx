import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const emptyProfile = {
  education: '',
  branch: '',
  cgpa: '',
  skills: '',
  projects: '',
  certifications: '',
  resumeUrl: ''
};

const applicationStages = ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED'];

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function formatApplicationDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function ApplicationProgress({ application }) {
  const isRejected = application.status === 'REJECTED';
  const activeStage = applicationStages.indexOf(application.status);

  return (
    <div className="application-tracking">
      <div className={isRejected ? 'application-status-label rejected' : 'application-status-label'}>
        {isRejected ? 'Not selected' : application.status.replaceAll('_', ' ')}
      </div>
      {isRejected ? (
        <p className="application-rejected-note">This application has been closed. Keep exploring other opportunities.</p>
      ) : (
        <ol className="application-stepper" aria-label={`Application progress: ${application.status.replaceAll('_', ' ').toLowerCase()}`}>
          {applicationStages.map((stage, index) => {
            const complete = index < activeStage;
            const current = index === activeStage;
            return (
              <li className={`${complete ? 'complete' : ''} ${current ? 'current' : ''}`} key={stage}>
                <span className="application-step-dot">{complete ? '✓' : index + 1}</span>
                <span>{stage.replaceAll('_', ' ')}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function isDeadlinePassed(deadline) {
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
  return deadline < today;
}

function DashboardIcon({ type }) {
  const paths = {
    jobs: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" /></>,
    eligible: <><path d="M20 11a8 8 0 1 1-2.3-5.7" /><path d="m9 11 3 3 9-9" /></>,
    applications: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    shortlisted: <><circle cx="12" cy="8" r="6" /><path d="m8 13-1 9 5-3 5 3-1-9" /></>,
    skills: <><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4" /><circle cx="12" cy="12" r="5" /><path d="m10 12 1.3 1.3L14.5 10" /></>
  };

  return <svg className={`dashboard-icon dashboard-icon-${type}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export default function StudentDashboard() {
  const { user, api, logout } = useAuth();
  const [stats, setStats] = useState({
    profileCompletion: 0,
    availableJobs: 0,
    eligibleJobs: 0,
    applications: 0,
    recommendations: []
  });
  const [profile, setProfile] = useState({ ...emptyProfile, branch: user?.branch || '' });
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [eligibility, setEligibility] = useState({});
  const [jobSearch, setJobSearch] = useState('');
  const [hideAppliedJobs, setHideAppliedJobs] = useState(false);
  const [eligibleJobsOnly, setEligibleJobsOnly] = useState(false);
  const [eligibleJobIds, setEligibleJobIds] = useState(new Set());
  const [loadingEligibleJobs, setLoadingEligibleJobs] = useState(false);
  const [expandedOpportunityId, setExpandedOpportunityId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    api.get('/student/dashboard')
      .then((res) => setStats(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load student dashboard')));
    api.get('/student/jobs')
      .then((res) => setJobs(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load available jobs')));
    api.get('/student/applications')
      .then((res) => setApplications(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load your applications')));
    api.get('/student/me')
      .then((res) => setProfile({
        education: res.data.education || '',
        branch: res.data.branch || user?.branch || '',
        cgpa: res.data.cgpa ?? '',
        skills: res.data.skills || '',
        projects: res.data.projects || '',
        certifications: res.data.certifications || '',
        resumeUrl: res.data.resumeUrl || ''
      }))
      .catch((err) => {
        if (err.response?.status !== 404) {
          setError(getErrorMessage(err, 'Unable to load your profile'));
        }
      });
  }, [api, user]);

  const handleLogout = async () => {
    await logout();
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSavingProfile(true);
    try {
      const response = await api.post('/student/profile', { ...profile, cgpa: Number(profile.cgpa) });
      setProfile({ ...response.data, cgpa: response.data.cgpa });
      setEligibility({});
      setEligibleJobIds(new Set());
      setEligibleJobsOnly(false);
      setMessage('Profile saved successfully.');
      const dashboard = await api.get('/student/dashboard');
      setStats(dashboard.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save your profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const checkEligibility = async (jobId) => {
    setError('');
    try {
      const response = await api.get(`/student/jobs/${jobId}/eligibility`);
      setEligibility((current) => ({ ...current, [jobId]: response.data }));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to check eligibility'));
    }
  };

  const applyForJob = async (jobId) => {
    setError('');
    setMessage('');
    try {
      await api.post(`/student/jobs/${jobId}/apply`);
      const [applicationsResponse, dashboardResponse] = await Promise.all([
        api.get('/student/applications'),
        api.get('/student/dashboard')
      ]);
      setApplications(applicationsResponse.data);
      setStats(dashboardResponse.data);
      setMessage('Application submitted successfully.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to submit your application'));
    }
  };

  const toggleEligibleJobsOnly = async (enabled) => {
    setError('');
    if (!enabled) {
      setEligibleJobsOnly(false);
      return;
    }

    setLoadingEligibleJobs(true);
    try {
      const response = await api.get('/student/jobs/eligible');
      setEligibleJobIds(new Set(response.data.map((job) => job.id)));
      setEligibleJobsOnly(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load eligible jobs'));
    } finally {
      setLoadingEligibleJobs(false);
    }
  };

  const appliedJobIds = new Set(applications.map((application) => application.job?.id));
  const normalizedSearch = jobSearch.trim().toLowerCase();
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = !normalizedSearch || [
      job.title,
      job.company?.companyName,
      job.description,
      job.requiredSkills,
      job.eligibleBranches
    ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    return matchesSearch
      && (!hideAppliedJobs || !appliedJobIds.has(job.id))
      && (!eligibleJobsOnly || eligibleJobIds.has(job.id));
  });
  const profileCompletionFields = [
    { label: 'Education', complete: Boolean(profile.education.trim()) },
    { label: 'Branch', complete: Boolean(profile.branch.trim()) },
    { label: 'CGPA', complete: Number(profile.cgpa) > 0 },
    { label: 'Skills', complete: Boolean(profile.skills.trim()) },
    { label: 'Projects', complete: Boolean(profile.projects.trim()) },
    { label: 'Certifications', complete: Boolean(profile.certifications.trim()) },
    { label: 'Resume', complete: Boolean(profile.resumeUrl.trim()) }
  ];
  const completedProfileFields = profileCompletionFields.filter((field) => field.complete).length;
  const profileCompletion = Math.floor((completedProfileFields / profileCompletionFields.length) * 100);
  const incompleteProfileFields = profileCompletionFields.filter((field) => !field.complete).map((field) => field.label);
  const shortlistedApplications = applications.filter((application) => application.status === 'SHORTLISTED').length;
  const featuredJobs = filteredJobs.slice(0, 2);

  const toggleOpportunityDetails = (jobId) => {
    const isExpanded = expandedOpportunityId === jobId;
    setExpandedOpportunityId(isExpanded ? null : jobId);
    if (!isExpanded && !eligibility[jobId]) checkEligibility(jobId);
  };

  return (
    <div className="student-shell">
      <header className="student-topbar">
        <div className="student-brand"><span className="student-brand-icon"><DashboardIcon type="jobs" /></span><strong>CampusConnect</strong></div>
        <nav className="student-nav" aria-label="Student navigation">
          <a href="#student-overview">Dashboard</a>
          <a href="#student-opportunities">Browse Jobs</a>
          <a href="#student-applications">Applications</a>
          <span className="student-nav-user">{user?.fullName}</span>
          <button className="secondary small" onClick={handleLogout}>Logout</button>
        </nav>
      </header>
      <main className="student-page" id="student-overview">
        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <section className="student-welcome">
          <div>
            <h1>Welcome back, {user?.fullName || 'Student'}</h1>
            <p>Track your placement journey and discover opportunities that match your skills.</p>
          </div>
          <a className="student-primary-link" href="#student-opportunities"><DashboardIcon type="jobs" />Browse All Jobs</a>
        </section>

        <section className="student-metrics" aria-label="Placement overview">
          <div className="student-metric-card"><span className="metric-icon metric-icon-blue"><DashboardIcon type="jobs" /></span><div><span>Available Jobs</span><strong>{stats.availableJobs}</strong><small>Active campus drives</small></div></div>
          <div className="student-metric-card"><span className="metric-icon metric-icon-green"><DashboardIcon type="eligible" /></span><div><span>Eligible Jobs</span><strong>{stats.eligibleJobs}</strong><small>Meets CGPA &amp; skills</small></div></div>
          <div className="student-metric-card"><span className="metric-icon metric-icon-purple"><DashboardIcon type="applications" /></span><div><span>Applications Submitted</span><strong>{stats.applications}</strong><small>Total applications</small></div></div>
          <div className="student-metric-card"><span className="metric-icon metric-icon-amber"><DashboardIcon type="shortlisted" /></span><div><span>Shortlisted Applications</span><strong>{shortlistedApplications}</strong><small>Moving to interview</small></div></div>
        </section>

        <section className="skill-analysis-banner">
          <span className="skill-banner-icon"><DashboardIcon type="skills" /></span>
          <div><h2>Skill Recommendation Engine</h2><p>Analyze your current skillset against active hiring criteria and boost your placement readiness.</p></div>
          <button type="button" onClick={() => {
            document.getElementById('student-opportunities')?.scrollIntoView({ behavior: 'smooth' });
            if (!eligibleJobsOnly) toggleEligibleJobsOnly(true);
          }}>Run Skill Analysis <span aria-hidden="true">→</span></button>
        </section>

        <section className="student-panel" id="student-opportunities">
          <div className="student-section-heading">
            <h2>Recommended Opportunities</h2>
            <a href="#all-student-jobs">View all ({filteredJobs.length})</a>
          </div>
          {jobs.length === 0 ? <p className="muted">No published jobs are available right now.</p> : featuredJobs.length === 0 ? (
            <p className="muted">No opportunities match your current filters. Browse all jobs below or update the filters.</p>
          ) : (
            <div className="opportunity-grid">
              {featuredJobs.map((job) => {
                const result = eligibility[job.id];
                const alreadyApplied = appliedJobIds.has(job.id);
                const deadlinePassed = isDeadlinePassed(job.applicationDeadline);
                const skills = (job.requiredSkills || '').split(',').map((skill) => skill.trim()).filter(Boolean);
                return (
                  <article className="opportunity-card" key={job.id}>
                    <div className="opportunity-title-row"><h3>{job.title}</h3><span className="job-active-badge">{deadlinePassed ? 'Closed' : 'Active'}</span></div>
                    <p className="opportunity-company">{job.company?.companyName || 'Company'}</p>
                    <p className="opportunity-description">{job.description}</p>
                    <div className="opportunity-requirements">
                      <p><span>Min CGPA:</span> {job.minCgpa}</p>
                      <p><span>Eligible Branches:</span> {job.eligibleBranches || 'All branches'}</p>
                      <p><span>Deadline:</span> {job.applicationDeadline}</p>
                    </div>
                    {skills.length > 0 && <div className="opportunity-skills">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div>}
                    <button type="button" className="opportunity-details-button" onClick={() => toggleOpportunityDetails(job.id)}>
                      {expandedOpportunityId === job.id ? 'Hide Details' : 'View Details'}
                    </button>
                    {expandedOpportunityId === job.id && (
                      <div className="opportunity-expanded">
                        {result ? <p className={result.eligible ? 'eligibility eligible' : 'eligibility ineligible'}>{result.eligible ? 'You are eligible to apply.' : `Not eligible: ${result.reasons.join('; ')}`}</p> : <p className="muted">Checking eligibility...</p>}
                        <button type="button" disabled={!result?.eligible || alreadyApplied || deadlinePassed} onClick={() => applyForJob(job.id)}>
                          {alreadyApplied ? 'Applied' : deadlinePassed ? 'Closed' : 'Apply Now'}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="student-panel recent-applications-panel" id="student-applications">
          <div className="student-section-heading">
            <h2>Recent Applications</h2>
            <a href="#all-student-applications">View all applications</a>
          </div>
          {applications.length === 0 ? (
            <div className="recent-applications-empty">
              <p>You haven't submitted any job applications yet.</p>
              <a className="student-primary-link" href="#all-student-jobs">Explore Available Drives</a>
            </div>
          ) : (
            <ul className="recent-application-list">
              {applications.slice(0, 3).map((application) => (
                <li key={application.id}>
                  <div className="recent-application-details">
                    <div className="recent-application-title"><div><strong>{application.job?.title || 'Job'}</strong><span>{application.job?.company?.companyName || 'Company'}</span></div><small>Applied {formatApplicationDate(application.appliedAt)}</small></div>
                    <ApplicationProgress application={application} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="student-panel student-profile-panel" id="student-profile">
          <div className="student-section-heading"><h2>My Profile</h2><span>{profileCompletion}% complete</span></div>
          <div className="profile-completion">
            <div className="profile-completion-heading">
              <span>{completedProfileFields} of {profileCompletionFields.length} profile details completed</span>
              <strong>{profileCompletion}%</strong>
            </div>
            <div
              className="profile-completion-track"
              role="progressbar"
              aria-label="Student profile completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={profileCompletion}
            >
              <span style={{ width: `${profileCompletion}%` }} />
            </div>
            <p className="profile-completion-hint">
              {incompleteProfileFields.length
                ? `Add ${incompleteProfileFields.join(', ')} to improve your profile and get noticed by recruiters.`
                : 'Your profile is complete and ready to share with recruiters.'}
            </p>
          </div>
          {(user?.collegeName || user?.graduationYear) && (
            <p className="muted student-profile-meta">
              {user.collegeName || 'College not provided'}
              {user.graduationYear ? ` · Class of ${user.graduationYear}` : ''}
            </p>
          )}
          <form onSubmit={saveProfile}>
            <div className="form-grid">
              <div><label htmlFor="education">Education</label><input id="education" value={profile.education} onChange={(event) => setProfile({ ...profile, education: event.target.value })} placeholder="B.Tech" required /></div>
              <div><label htmlFor="branch">Branch</label><input id="branch" value={profile.branch} onChange={(event) => setProfile({ ...profile, branch: event.target.value })} placeholder="Computer Science" required /></div>
              <div><label htmlFor="cgpa">CGPA (out of 10)</label><input id="cgpa" type="number" min="0" max="10" step="0.01" value={profile.cgpa} onChange={(event) => setProfile({ ...profile, cgpa: event.target.value })} required /></div>
              <div><label htmlFor="skills">Skills (comma separated)</label><input id="skills" value={profile.skills} onChange={(event) => setProfile({ ...profile, skills: event.target.value })} placeholder="Java, SQL, React" required /></div>
              <div><label htmlFor="projects">Projects</label><textarea id="projects" value={profile.projects} onChange={(event) => setProfile({ ...profile, projects: event.target.value })} /></div>
              <div><label htmlFor="certifications">Certifications</label><textarea id="certifications" value={profile.certifications} onChange={(event) => setProfile({ ...profile, certifications: event.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label htmlFor="resumeUrl">Resume URL</label><input id="resumeUrl" type="url" value={profile.resumeUrl} onChange={(event) => setProfile({ ...profile, resumeUrl: event.target.value })} placeholder="https://..." /></div>
            </div>
            <div className="spacer" />
            <button type="submit" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save profile'}</button>
          </form>
        </section>

        <section className="student-panel all-jobs-panel" id="all-student-jobs">
          <div className="student-section-heading"><h2>Available Jobs</h2><span aria-live="polite">{filteredJobs.length} opportunities</span></div>
          <div className="job-filters">
            <div>
              <label htmlFor="jobSearch">Search openings</label>
              <input
                id="jobSearch"
                type="search"
                value={jobSearch}
                onChange={(event) => setJobSearch(event.target.value)}
                placeholder="Search title, company, branch, or skill"
              />
            </div>
            <label className="checkbox-label" htmlFor="hideAppliedJobs">
              <input
                id="hideAppliedJobs"
                type="checkbox"
                checked={hideAppliedJobs}
                onChange={(event) => setHideAppliedJobs(event.target.checked)}
              />
              Hide jobs I have applied to
            </label>
            <label className="checkbox-label" htmlFor="eligibleJobsOnly">
              <input
                id="eligibleJobsOnly"
                type="checkbox"
                checked={eligibleJobsOnly}
                disabled={loadingEligibleJobs}
                onChange={(event) => toggleEligibleJobsOnly(event.target.checked)}
              />
              {loadingEligibleJobs ? 'Checking eligibility...' : 'Show eligible jobs only'}
            </label>
          </div>
          {jobs.length === 0 ? <p className="muted">No published jobs are available right now.</p> : filteredJobs.length === 0 ? (
            <p className="muted">No jobs match your filters. Try a different search or show applied jobs.</p>
          ) : (
            <div className="opportunity-grid browse-job-grid">
              {filteredJobs.map((job) => {
                const result = eligibility[job.id];
                const alreadyApplied = appliedJobIds.has(job.id);
                const deadlinePassed = isDeadlinePassed(job.applicationDeadline);
                return (
                  <article className="opportunity-card browse-job-card" key={job.id}>
                    <div className="opportunity-title-row">
                      <h3>{job.title}</h3>
                      <span className={deadlinePassed ? 'job-active-badge job-closed-badge' : 'job-active-badge'}>{deadlinePassed ? 'Closed' : 'Active'}</span>
                    </div>
                    <p className="opportunity-company">{job.company?.companyName || 'Company'}</p>
                    <p className="opportunity-description">{job.description}</p>
                    <div className="opportunity-requirements">
                      <p><span>Min CGPA:</span> {job.minCgpa}</p>
                      <p><span>Eligible Branches:</span> {job.eligibleBranches || 'All branches'}</p>
                      <p><span>Deadline:</span> {job.applicationDeadline}</p>
                    </div>
                    {job.requiredSkills && (
                      <div className="opportunity-skills">
                        {job.requiredSkills.split(',').map((skill) => skill.trim()).filter(Boolean).map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                      </div>
                    )}
                    {result && (
                      <p className={`eligibility ${result.eligible ? 'eligible' : 'ineligible'} browse-job-eligibility`}>
                        {result.eligible ? 'You are eligible to apply.' : `Not eligible: ${result.reasons.join('; ')}`}
                      </p>
                    )}
                    <div className="browse-job-actions">
                      <button type="button" className="opportunity-details-button" onClick={() => checkEligibility(job.id)}>
                        {result ? 'Recheck Eligibility' : 'Check Eligibility'}
                      </button>
                      <button type="button" disabled={!result?.eligible || alreadyApplied || deadlinePassed} onClick={() => applyForJob(job.id)}>
                        {alreadyApplied ? 'Applied' : deadlinePassed ? 'Closed' : 'Apply Now'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="student-panel" id="all-student-applications">
          <div className="student-section-heading"><h2>All Applications</h2><span>{applications.length} total</span></div>
          {applications.length === 0 ? <p className="muted">You haven't submitted any job applications yet.</p> : (
            <ul className="list">
              {applications.map((application) => (
                <li className="all-application-card" key={application.id}>
                  <div className="recent-application-title">
                    <div><strong>{application.job?.title || 'Job'}</strong><span>{application.job?.company?.companyName || 'Company'}</span></div>
                    <small>Applied {formatApplicationDate(application.appliedAt)}</small>
                  </div>
                  <ApplicationProgress application={application} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="student-panel">
          <div className="student-section-heading"><h2>Skill Recommendations</h2></div>
          <ul className="list">
            {stats.recommendations.length ? stats.recommendations.map((item, index) => (
              <li key={`${item.jobTitle}-${index}`}><strong>{item.jobTitle}</strong><div>{item.recommendation}</div></li>
            )) : <li>No recommendations yet.</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}
