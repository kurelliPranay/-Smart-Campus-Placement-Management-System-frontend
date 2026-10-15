import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const sections = ['Students', 'Companies', 'Jobs', 'Applications'];
const pageSize = 10;
const listEndpoints = {
  Students: '/admin/students',
  Companies: '/admin/companies',
  Jobs: '/admin/jobs',
  Applications: '/admin/applications'
};
const jobStatuses = ['DRAFT', 'PUBLISHED', 'CLOSED'];

function AdminIcon({ type }) {
  const paths = {
    students: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    companies: <><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M9 21v-5h6v5M8 8h2m4 0h2m-8 4h2m4 0h2" /></>,
    jobs: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" /></>,
    applications: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    selected: <><circle cx="12" cy="8" r="6" /><path d="m8 13-1 9 5-3 5 3-1-9" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.5-2L20 12M4 12l2.9 5a7 7 0 0 0 11.5-2" /></>
  };

  return <svg className="dashboard-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function AdminDashboard() {
  const { user, api, logout } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCompanies: 0,
    publishedJobs: 0,
    totalApplications: 0,
    selectedCandidates: 0
  });
  const [records, setRecords] = useState({
    Students: [],
    Companies: [],
    Jobs: [],
    Applications: []
  });
  const [pages, setPages] = useState({
    Students: { number: 0, size: pageSize, totalElements: 0, totalPages: 0 },
    Companies: { number: 0, size: pageSize, totalElements: 0, totalPages: 0 },
    Jobs: { number: 0, size: pageSize, totalElements: 0, totalPages: 0 },
    Applications: { number: 0, size: pageSize, totalElements: 0, totalPages: 0 }
  });
  const currentPages = useRef({ Students: 0, Companies: 0, Jobs: 0, Applications: 0 });
  const [activeSection, setActiveSection] = useState('Students');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState('');

  const loadDashboard = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [statsResponse, ...listResponses] = await Promise.all([
        api.get('/admin/dashboard'),
        ...sections.map((section) => api.get(listEndpoints[section], {
          params: { page: currentPages.current[section], size: pageSize }
        }))
      ]);
      setStats(statsResponse.data);
      setRecords(Object.fromEntries(sections.map((section, index) => [
        section,
        listResponses[index].data.content
      ])));
      setPages(Object.fromEntries(sections.map((section, index) => {
        const { number, size, totalElements, totalPages } = listResponses[index].data;
        currentPages.current[section] = number;
        return [section, { number, size, totalElements, totalPages }];
      })));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load administrator data'));
    } finally {
      setLoading(false);
    }
  }, [api]);

  const goToPage = async (section, page) => {
    setError('');
    setLoadingPage(section);
    try {
      const response = await api.get(listEndpoints[section], {
        params: { page, size: pageSize }
      });
      currentPages.current[section] = response.data.number;
      setRecords((current) => ({ ...current, [section]: response.data.content }));
      setPages((current) => ({
        ...current,
        [section]: {
          number: response.data.number,
          size: response.data.size,
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages
        }
      }));
    } catch (err) {
      setError(getErrorMessage(err, `Unable to load ${section.toLowerCase()}`));
    } finally {
      setLoadingPage('');
    }
  };

  const renderPagination = (section) => {
    const page = pages[section];
    const firstRecord = page.totalElements === 0 ? 0 : page.number * page.size + 1;
    const lastRecord = Math.min((page.number + 1) * page.size, page.totalElements);

    return (
      <div className="admin-pagination">
        <span className="muted">Showing {firstRecord}–{lastRecord} of {page.totalElements}</span>
        <div>
          <button
            type="button"
            className="secondary small"
            onClick={() => goToPage(section, page.number - 1)}
            disabled={page.number === 0 || loadingPage === section}
          >
            Previous
          </button>
          <span className="admin-page-indicator" aria-live="polite">Page {page.totalPages === 0 ? 0 : page.number + 1} of {page.totalPages}</span>
          <button
            type="button"
            className="secondary small"
            onClick={() => goToPage(section, page.number + 1)}
            disabled={page.number + 1 >= page.totalPages || loadingPage === section}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = async () => {
    await logout();
  };

  const updateJobStatus = async (jobId, status) => {
    setError('');
    setMessage('');
    try {
      await api.patch(`/admin/jobs/${jobId}/status`, { status });
      await loadDashboard();
      setMessage('Job posting status updated.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update job posting status'));
    }
  };

  return (
    <div className="admin-shell">
      <header className="student-topbar">
        <div className="student-brand"><span className="student-brand-icon"><AdminIcon type="companies" /></span><strong>CampusConnect</strong><span className="admin-brand-label">Admin</span></div>
        <nav className="student-nav" aria-label="Administrator navigation">
          <a href="#admin-overview">Overview</a>
          <a href="#admin-records">Manage Records</a>
          <span className="student-nav-user">{user?.fullName}</span>
          <button className="secondary small" onClick={handleLogout}>Logout</button>
        </nav>
      </header>
      <main className="admin-page" id="admin-overview">
        <section className="student-welcome admin-welcome">
          <div>
            <h1>Administration Overview</h1>
            <p>Monitor campus recruitment activity and manage your placement platform.</p>
          </div>
          <button className="student-primary-link" onClick={loadDashboard} disabled={loading}>
            <AdminIcon type="refresh" />{loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </section>
        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <section className="student-metrics admin-metrics" aria-label="Platform overview">
          <div className="student-metric-card"><span className="metric-icon metric-icon-blue"><AdminIcon type="students" /></span><div><span>Total Students</span><strong>{stats.totalStudents}</strong><small>Registered student profiles</small></div></div>
          <div className="student-metric-card"><span className="metric-icon metric-icon-purple"><AdminIcon type="companies" /></span><div><span>Total Companies</span><strong>{stats.totalCompanies}</strong><small>Registered recruiters</small></div></div>
          <div className="student-metric-card"><span className="metric-icon metric-icon-green"><AdminIcon type="jobs" /></span><div><span>Published Jobs</span><strong>{stats.publishedJobs}</strong><small>Active campus drives</small></div></div>
          <div className="student-metric-card"><span className="metric-icon metric-icon-amber"><AdminIcon type="applications" /></span><div><span>Total Applications</span><strong>{stats.totalApplications}</strong><small>Submitted by students</small></div></div>
          <div className="student-metric-card"><span className="metric-icon metric-icon-green"><AdminIcon type="selected" /></span><div><span>Selected Candidates</span><strong>{stats.selectedCandidates}</strong><small>Successful placements</small></div></div>
        </section>

        <section className="student-panel admin-record-panel" id="admin-records">
          <div className="student-section-heading admin-record-heading">
            <div><h2>Manage Records</h2><p>Browse and manage students, companies, job postings, and applications.</p></div>
            <span>{pages[activeSection].totalElements} {activeSection.toLowerCase()}</span>
          </div>
          <div className="admin-tabs" role="tablist" aria-label="Admin data sections">
            {sections.map((section) => (
              <button
                key={section}
                type="button"
                className={activeSection === section ? 'admin-tab active' : 'admin-tab'}
                role="tab"
                id={`admin-tab-${section.toLowerCase()}`}
                aria-controls={`admin-panel-${section.toLowerCase()}`}
                aria-pressed={activeSection === section}
                aria-selected={activeSection === section}
                onClick={() => setActiveSection(section)}
              >
                <AdminIcon type={section.toLowerCase()} />
                {section}
                <span>{pages[section].totalElements}</span>
              </button>
            ))}
          </div>

          {activeSection === 'Students' && (
            <div role="tabpanel" id="admin-panel-students" aria-labelledby="admin-tab-students" className="admin-data-panel">
              <div className="admin-table-heading"><h3>Student Profiles</h3><p>Profiles are shown after a student saves their placement details.</p></div>
              {records.Students.length === 0 ? <p>No student profiles yet.</p> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Student</th><th>Email</th><th>Branch</th><th>Education</th><th>CGPA</th><th>Skills</th></tr></thead>
                    <tbody>
                      {records.Students.map((profile) => (
                        <tr key={profile.id}>
                          <td>{profile.user?.fullName || 'Student'}</td>
                          <td>{profile.user?.email || '—'}</td>
                          <td>{profile.branch}</td>
                          <td>{profile.education}</td>
                          <td>{profile.cgpa}</td>
                          <td>{profile.skills}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {renderPagination('Students')}
            </div>
          )}

          {activeSection === 'Companies' && (
            <div role="tabpanel" id="admin-panel-companies" aria-labelledby="admin-tab-companies" className="admin-data-panel">
              <div className="admin-table-heading"><h3>Registered Companies</h3><p>Organizations participating in campus recruitment.</p></div>
              {records.Companies.length === 0 ? <p>No company profiles yet.</p> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Company</th><th>Industry</th><th>Account email</th><th>Contact email</th><th>Website</th></tr></thead>
                    <tbody>
                      {records.Companies.map((company) => (
                        <tr key={company.id}>
                          <td>{company.companyName}</td>
                          <td>{company.industry}</td>
                          <td>{company.user?.email || '—'}</td>
                          <td>{company.contactEmail || '—'}</td>
                          <td>{company.website ? <a href={company.website} target="_blank" rel="noreferrer">{company.website}</a> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {renderPagination('Companies')}
            </div>
          )}

          {activeSection === 'Jobs' && (
            <div role="tabpanel" id="admin-panel-jobs" aria-labelledby="admin-tab-jobs" className="admin-data-panel">
              <div className="admin-table-heading"><h3>Job Postings</h3><p>Review positions and update posting status.</p></div>
              {records.Jobs.length === 0 ? <p>No job postings yet.</p> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Position</th><th>Company</th><th>Min. CGPA</th><th>Deadline</th><th>Status</th></tr></thead>
                    <tbody>
                      {records.Jobs.map((job) => (
                        <tr key={job.id}>
                          <td>{job.title}</td>
                          <td>{job.company?.companyName || '—'}</td>
                          <td>{job.minCgpa}</td>
                          <td>{job.applicationDeadline}</td>
                          <td>
                            <select
                              aria-label={`Status for ${job.title}`}
                              value={job.status}
                              onChange={(event) => updateJobStatus(job.id, event.target.value)}
                            >
                              {jobStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {renderPagination('Jobs')}
            </div>
          )}

          {activeSection === 'Applications' && (
            <div role="tabpanel" id="admin-panel-applications" aria-labelledby="admin-tab-applications" className="admin-data-panel">
              <div className="admin-table-heading"><h3>Placement Applications</h3><p>Track student applications across all participating companies.</p></div>
              {records.Applications.length === 0 ? <p>No applications yet.</p> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Student</th><th>Email</th><th>Position</th><th>Company</th><th>Applied</th><th>Status</th></tr></thead>
                    <tbody>
                      {records.Applications.map((application) => (
                        <tr key={application.id}>
                          <td>{application.applicant?.fullName || 'Student'}</td>
                          <td>{application.applicant?.email || '—'}</td>
                          <td>{application.job?.title || '—'}</td>
                          <td>{application.job?.company?.companyName || '—'}</td>
                          <td>{application.appliedAt}</td>
                          <td><span className="status">{application.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {renderPagination('Applications')}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
