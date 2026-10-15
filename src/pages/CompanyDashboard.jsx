import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const emptyProfile = {
  companyName: '',
  industry: '',
  description: '',
  website: '',
  contactEmail: ''
};

const emptyJob = {
  title: '',
  description: '',
  requiredSkills: '',
  eligibleBranches: '',
  minCgpa: '0',
  applicationDeadline: '',
  status: 'PUBLISHED'
};

const applicationStatuses = ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'];

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function getSafeExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function CompanyDashboardIcon({ type }) {
  const paths = {
    jobs: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" /></>,
    applicants: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    shortlisted: <><circle cx="12" cy="8" r="6" /><path d="m8 13-1 9 5-3 5 3-1-9" /></>,
    interviews: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18M8 15h3" /></>
  };

  return <svg className="dashboard-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export default function CompanyDashboard() {
  const { user, api, logout } = useAuth();
  const [stats, setStats] = useState({
    companyJobs: 0,
    totalApplicants: 0,
    shortlisted: 0,
    interviews: 0
  });
  const [profile, setProfile] = useState(emptyProfile);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [editingJobId, setEditingJobId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [applicantSearch, setApplicantSearch] = useState('');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('ALL');
  const [applicationJobFilter, setApplicationJobFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const jobFormRef = useRef(null);

  const refreshCompanyData = async () => {
    const [jobsResponse, applicationsResponse, dashboardResponse] = await Promise.all([
      api.get('/company/jobs'),
      api.get('/company/applications'),
      api.get('/company/dashboard')
    ]);
    setJobs(jobsResponse.data);
    setApplications(applicationsResponse.data);
    setStats(dashboardResponse.data);
  };

  useEffect(() => {
    refreshCompanyData().catch((err) => setError(getErrorMessage(err, 'Unable to load company dashboard')));
    api.get('/company/profile')
      .then((res) => setProfile({
        companyName: res.data.companyName || '',
        industry: res.data.industry || '',
        description: res.data.description || '',
        website: res.data.website || '',
        contactEmail: res.data.contactEmail || ''
      }))
      .catch((err) => {
        if (err.response?.status !== 404) {
          setError(getErrorMessage(err, 'Unable to load company profile'));
        }
      });
  }, [api]);

  const handleLogout = async () => {
    await logout();
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const response = await api.post('/company/profile', profile);
      setProfile({
        companyName: response.data.companyName,
        industry: response.data.industry,
        description: response.data.description || '',
        website: response.data.website || '',
        contactEmail: response.data.contactEmail || ''
      });
      setMessage('Company profile saved.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save company profile'));
    }
  };

  const saveJob = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const payload = { ...jobForm, minCgpa: Number(jobForm.minCgpa) };
      if (editingJobId === null) {
        await api.post('/company/jobs', payload);
      } else {
        await api.put(`/company/jobs/${editingJobId}`, payload);
      }
      setJobForm(emptyJob);
      setEditingJobId(null);
      await refreshCompanyData();
      setMessage(editingJobId === null ? 'Job posting created.' : 'Job posting updated.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save job posting. Save your company profile first.'));
    }
  };

  const editJob = (job) => {
    setEditingJobId(job.id);
    setJobForm({
      title: job.title,
      description: job.description,
      requiredSkills: job.requiredSkills || '',
      eligibleBranches: job.eligibleBranches || '',
      minCgpa: String(job.minCgpa),
      applicationDeadline: job.applicationDeadline,
      status: job.status
    });
    setError('');
    setMessage('');
    jobFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelJobEdit = () => {
    setEditingJobId(null);
    setJobForm(emptyJob);
  };

  const updateApplicationStatus = async (applicationId, status) => {
    setError('');
    setMessage('');
    try {
      await api.patch(`/company/applications/${applicationId}/status`, { status });
      await refreshCompanyData();
      setMessage('Application status updated.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update application status'));
    }
  };

  const normalizedApplicantSearch = applicantSearch.trim().toLowerCase();
  const filteredApplications = applications.filter((application) => {
    const profile = application.applicant?.profile;
    const matchesSearch = !normalizedApplicantSearch || [
      application.applicant?.fullName,
      application.applicant?.email,
      application.jobTitle,
      profile?.education,
      profile?.branch,
      profile?.skills,
      profile?.projects,
      profile?.certifications
    ].some((value) => value?.toLowerCase().includes(normalizedApplicantSearch));
    return matchesSearch
      && (applicationStatusFilter === 'ALL' || application.status === applicationStatusFilter)
      && (applicationJobFilter === 'ALL' || String(application.jobId) === applicationJobFilter);
  });
  const hasApplicantFilters = applicantSearch || applicationStatusFilter !== 'ALL' || applicationJobFilter !== 'ALL';

  const clearApplicantFilters = () => {
    setApplicantSearch('');
    setApplicationStatusFilter('ALL');
    setApplicationJobFilter('ALL');
  };

  return (
    <div className="company-shell">
      <header className="student-topbar">
        <div className="student-brand"><span className="student-brand-icon"><CompanyDashboardIcon type="jobs" /></span><strong>CampusConnect</strong></div>
        <nav className="student-nav" aria-label="Company navigation">
          <a href="#company-overview">Dashboard</a>
          <a href="#company-jobs">Job Postings</a>
          <a href="#company-applicants">Applicants</a>
          <a href="#company-profile">Company Profile</a>
          <span className="student-nav-user">{profile.companyName || user?.fullName}</span>
          <button className="secondary small" onClick={handleLogout}>Logout</button>
        </nav>
      </header>
      <main className="company-page" id="company-overview">
        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <section className="student-welcome">
          <div>
            <h1>Welcome back, {profile.companyName || user?.fullName || 'Recruiter'}</h1>
            <p>Manage your campus hiring pipeline and connect with promising candidates.</p>
          </div>
          <button type="button" className="student-primary-link" onClick={() => {
            setEditingJobId(null);
            setJobForm(emptyJob);
            jobFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}>+ Create Job Posting</button>
        </section>

        <section className="student-metrics company-metrics" aria-label="Hiring overview">
          <div className="student-metric-card"><span className="metric-icon metric-icon-blue"><CompanyDashboardIcon type="jobs" /></span><div><span>Job Postings</span><strong>{stats.companyJobs}</strong><small>Across your company</small></div></div>
          <div className="student-metric-card"><span className="metric-icon metric-icon-purple"><CompanyDashboardIcon type="applicants" /></span><div><span>Total Applicants</span><strong>{stats.totalApplicants}</strong><small>Candidates in your pipeline</small></div></div>
          <div className="student-metric-card"><span className="metric-icon metric-icon-green"><CompanyDashboardIcon type="shortlisted" /></span><div><span>Shortlisted</span><strong>{stats.shortlisted}</strong><small>Ready for next steps</small></div></div>
          <div className="student-metric-card"><span className="metric-icon metric-icon-amber"><CompanyDashboardIcon type="interviews" /></span><div><span>Interviews</span><strong>{stats.interviews}</strong><small>In interview stage</small></div></div>
        </section>

        <section className="student-panel company-jobs-panel" id="company-jobs">
          <div className="student-section-heading">
            <h2>My Job Postings</h2>
            <a href="#company-job-form">Create a posting</a>
          </div>
          {jobs.length === 0 ? <p className="muted">No job postings yet. Create your first posting to reach campus candidates.</p> : (
            <div className="company-job-grid">
              {jobs.map((job) => {
                const jobApplicantCount = applications.filter((application) => String(application.jobId) === String(job.id)).length;
                return (
                  <article className="company-job-card" key={job.id}>
                    <div className="opportunity-title-row">
                      <h3>{job.title}</h3>
                      <span className={`company-job-status status-${job.status.toLowerCase()}`}>{job.status}</span>
                    </div>
                    <p>{job.description}</p>
                    <div className="company-job-details">
                      <span>Minimum CGPA: {job.minCgpa}</span>
                      <span>Deadline: {job.applicationDeadline}</span>
                      <span>{jobApplicantCount} applicant{jobApplicantCount === 1 ? '' : 's'}</span>
                    </div>
                    <button type="button" className="opportunity-details-button" onClick={() => editJob(job)}>Edit Posting</button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="student-panel company-applicants-panel" id="company-applicants">
          <div className="student-section-heading"><h2>Applicants</h2><span>{applications.length} total</span></div>
          {applications.length > 0 && (
            <div className="applicant-filters">
              <div>
                <label htmlFor="applicantSearch">Search applicants</label>
                <input
                  id="applicantSearch"
                  type="search"
                  value={applicantSearch}
                  onChange={(event) => setApplicantSearch(event.target.value)}
                  placeholder="Name, email, skills, education..."
                />
              </div>
              <div>
                <label htmlFor="applicationStatusFilter">Application status</label>
                <select id="applicationStatusFilter" value={applicationStatusFilter} onChange={(event) => setApplicationStatusFilter(event.target.value)}>
                  <option value="ALL">All statuses</option>
                  {applicationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="applicationJobFilter">Job posting</label>
                <select id="applicationJobFilter" value={applicationJobFilter} onChange={(event) => setApplicationJobFilter(event.target.value)}>
                  <option value="ALL">All jobs</option>
                  {jobs.map((job) => <option key={job.id} value={String(job.id)}>{job.title}</option>)}
                </select>
              </div>
              <div className="applicant-filter-summary">
                <span className="muted">Showing {filteredApplications.length} of {applications.length} applicants</span>
                {hasApplicantFilters && <button type="button" className="secondary small" onClick={clearApplicantFilters}>Clear filters</button>}
              </div>
            </div>
          )}
          {applications.length === 0 ? <p className="muted">No applications have been submitted for your jobs yet.</p> : (
            filteredApplications.length === 0 ? <p className="muted">No applicants match these filters. Try changing or clearing your filters.</p> : (
            <ul className="list company-applicant-list">
              {filteredApplications.map((application) => (
                <li className="company-applicant-card" key={application.id}>
                  <div className="company-applicant-heading">
                    <div>
                      <strong>{application.applicant?.fullName || 'Student'}</strong>
                      <div className="muted">{application.applicant?.email} · {application.jobTitle}</div>
                    </div>
                    <label className="applicant-status-field">
                      <span>Status</span>
                      <select aria-label={`Status for ${application.applicant?.fullName || 'applicant'}`} value={application.status} onChange={(event) => updateApplicationStatus(application.id, event.target.value)}>
                        {applicationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="muted">Applied: {application.appliedAt} · Eligibility verified: {application.eligible ? 'Yes' : 'No'}</div>
                  {application.applicant?.profile ? (
                    <div className="applicant-profile">
                      <div><strong>Education:</strong> {application.applicant.profile.education}</div>
                      <div><strong>Branch:</strong> {application.applicant.profile.branch} · <strong>CGPA:</strong> {application.applicant.profile.cgpa}</div>
                      <div><strong>Skills:</strong> {application.applicant.profile.skills}</div>
                      {application.applicant.profile.projects && <div><strong>Projects:</strong> {application.applicant.profile.projects}</div>}
                      {application.applicant.profile.certifications && <div><strong>Certifications:</strong> {application.applicant.profile.certifications}</div>}
                      {getSafeExternalUrl(application.applicant.profile.resumeUrl) && (
                        <a href={getSafeExternalUrl(application.applicant.profile.resumeUrl)} target="_blank" rel="noreferrer">View resume</a>
                      )}
                    </div>
                  ) : <p className="muted">Student profile details are not available.</p>}
                </li>
              ))}
            </ul>
            )
          )}
        </section>
        <section className="student-panel company-form-panel" id="company-job-form" ref={jobFormRef}>
          <div className="student-section-heading"><h2>{editingJobId === null ? 'Create a Job Posting' : 'Edit Job Posting'}</h2></div>
          <form onSubmit={saveJob}>
            <div className="form-grid">
              <div><label htmlFor="jobTitle">Job title</label><input id="jobTitle" value={jobForm.title} onChange={(event) => setJobForm({ ...jobForm, title: event.target.value })} required /></div>
              <div><label htmlFor="minCgpa">Minimum CGPA</label><input id="minCgpa" type="number" min="0" max="10" step="0.01" value={jobForm.minCgpa} onChange={(event) => setJobForm({ ...jobForm, minCgpa: event.target.value })} required /></div>
              <div><label htmlFor="requiredSkills">Required skills (comma separated)</label><input id="requiredSkills" value={jobForm.requiredSkills} onChange={(event) => setJobForm({ ...jobForm, requiredSkills: event.target.value })} /></div>
              <div><label htmlFor="eligibleBranches">Eligible branches (comma separated)</label><input id="eligibleBranches" value={jobForm.eligibleBranches} onChange={(event) => setJobForm({ ...jobForm, eligibleBranches: event.target.value })} /></div>
              <div><label htmlFor="applicationDeadline">Application deadline</label><input id="applicationDeadline" type="date" value={jobForm.applicationDeadline} onChange={(event) => setJobForm({ ...jobForm, applicationDeadline: event.target.value })} required /></div>
              <div><label htmlFor="jobStatus">Posting status</label><select id="jobStatus" value={jobForm.status} onChange={(event) => setJobForm({ ...jobForm, status: event.target.value })}><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option>{editingJobId !== null && <option value="CLOSED">Closed</option>}</select></div>
              <div className="company-description-field"><label htmlFor="jobDescription">Description</label><textarea id="jobDescription" value={jobForm.description} onChange={(event) => setJobForm({ ...jobForm, description: event.target.value })} required /></div>
            </div>
            <div className="company-form-actions">
              <button type="submit">{editingJobId === null ? 'Create Job Posting' : 'Save Changes'}</button>
              {editingJobId !== null && <button type="button" className="secondary" onClick={cancelJobEdit}>Cancel</button>}
            </div>
          </form>
        </section>
        <section className="student-panel company-profile-panel" id="company-profile">
          <div className="student-section-heading"><h2>Company Profile</h2></div>
          <form onSubmit={saveProfile}>
            <div className="form-grid">
              <div><label htmlFor="companyName">Company name</label><input id="companyName" value={profile.companyName} onChange={(event) => setProfile({ ...profile, companyName: event.target.value })} required /></div>
              <div><label htmlFor="industry">Industry</label><input id="industry" value={profile.industry} onChange={(event) => setProfile({ ...profile, industry: event.target.value })} required /></div>
              <div><label htmlFor="website">Website</label><input id="website" type="url" value={profile.website} onChange={(event) => setProfile({ ...profile, website: event.target.value })} placeholder="https://..." /></div>
              <div><label htmlFor="contactEmail">Contact email</label><input id="contactEmail" type="email" value={profile.contactEmail} onChange={(event) => setProfile({ ...profile, contactEmail: event.target.value })} /></div>
              <div className="company-description-field"><label htmlFor="description">Description</label><textarea id="description" value={profile.description} onChange={(event) => setProfile({ ...profile, description: event.target.value })} /></div>
            </div>
            <div className="company-form-actions"><button type="submit">Save Company Profile</button></div>
          </form>
        </section>
      </main>
    </div>
  );
}
