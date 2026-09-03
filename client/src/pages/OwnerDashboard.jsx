import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import OwnerOverview from './OwnerOverview.jsx';
import ManageStaff from './ManageStaff.jsx';
import Attendance from './attendance.jsx';
import Inventory from './Inventory.jsx';
import TankManagement from './TankManagement.jsx';
import Notes from './notes.jsx';
import '../css/owner-dashboard-layout.css';

const API_URL = 'http://localhost:3000/api';
const emptyStaff = { staffName: '', staffPosition: '', staffEmail: '', staffPassword: '', staffPhoneNumber: '', otp: '' };
const emptyFish = { name: '', species: '', quantity: '', description: '', photoUrl: '' };
const emptyTank = { name: '', status: 'Needs Cleaning', nextMaintenance: '', notes: '' };

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`API returned a non-JSON response (${response.status}). Restart the backend server.`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

function OwnerDashboard() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState('overview');
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [fish, setFish] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [staffForm, setStaffForm] = useState(emptyStaff);
  const [staffStep, setStaffStep] = useState(1);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffMode, setStaffMode] = useState('add');
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffOtpSeconds, setStaffOtpSeconds] = useState(0);
  const [fishForm, setFishForm] = useState(emptyFish);
  const [editingFishId, setEditingFishId] = useState(null);
  const [tankForm, setTankForm] = useState(emptyTank);
  const [editingTankId, setEditingTankId] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [staffData, attendanceData, fishData, tankData] = await Promise.all([
        apiRequest('/owner/staff'),
        apiRequest('/attendance'),
        apiRequest('/fish'),
        apiRequest('/store/tanks')
      ]);
      setStaff(staffData.staff);
      setAttendance(attendanceData.records);
      setFish(fishData.fish);
      setTanks(tankData.tanks);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'Owner') {
      window.location.replace('/login');
      return;
    }
    const loadTimer = setTimeout(loadDashboardData, 0);
    return () => clearTimeout(loadTimer);
  }, [user]);

  useEffect(() => {
    if (staffOtpSeconds <= 0) return undefined;
    const timer = setTimeout(() => setStaffOtpSeconds((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => clearTimeout(timer);
  }, [staffOtpSeconds]);

  const openAddStaff = () => {
    setStaffForm(emptyStaff);
    setStaffStep(1);
    setStaffMode('add');
    setEditingStaffId(null);
    setStaffOtpSeconds(0);
    setStaffModalOpen(true);
  };

  const openEditStaff = (item) => {
    setStaffForm({
      staffName: item.staffName,
      staffPosition: item.staffPosition,
      staffEmail: item.email,
      staffPassword: '',
      staffPhoneNumber: item.phoneNumber || '',
      otp: ''
    });
    setStaffMode('edit');
    setEditingStaffId(item._id);
    setStaffModalOpen(true);
  };

  const handleSendStaffOtp = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const data = await apiRequest('/owner/staff/send-otp', { method: 'POST', body: JSON.stringify(staffForm) });
      setMessage(data.message);
      setStaffOtpSeconds(5 * 60);
      setStaffStep(2);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleCreateStaff = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const data = await apiRequest('/owner/staff', { method: 'POST', body: JSON.stringify(staffForm) });
      setMessage(data.message);
      setStaffForm(emptyStaff);
      setStaffStep(1);
      setStaffOtpSeconds(0);
      setStaffModalOpen(false);
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleUpdateStaff = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const data = await apiRequest(`/owner/staff/${editingStaffId}`, {
        method: 'PATCH',
        body: JSON.stringify(staffForm)
      });
      setMessage(data.message);
      setStaffModalOpen(false);
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Delete this staff account? This cannot be undone.')) return;
    try {
      await apiRequest(`/owner/staff/${id}`, { method: 'DELETE' });
      setMessage('Staff account deleted successfully.');
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleStaffStatus = async (id, status) => {
    try {
      await apiRequest(`/owner/staff/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleAttendanceStatus = async (id, status) => {
    try {
      await apiRequest(`/attendance/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleSetStaffAttendance = async (staffId, dateKey, status) => {
    try {
      await apiRequest('/attendance/status', {
        method: 'POST',
        body: JSON.stringify({ staffId, dateKey, status })
      });
      setMessage('Staff attendance and account status updated.');
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteAttendance = async (id) => {
    if (!window.confirm('Delete this attendance record? This cannot be undone.')) return;
    try {
      await apiRequest(`/attendance/${id}`, { method: 'DELETE' });
      setMessage('Attendance record deleted successfully.');
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleFishSubmit = async (event) => {
    event.preventDefault();
    try {
      const path = editingFishId ? `/fish/${editingFishId}` : '/fish';
      await apiRequest(path, {
        method: editingFishId ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...fishForm, quantity: Number(fishForm.quantity) })
      });
      setMessage(editingFishId ? 'Fish item updated successfully.' : 'Fish item added successfully.');
      setFishForm(emptyFish);
      setEditingFishId(null);
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteFish = async (id) => {
    try {
      await apiRequest(`/fish/${id}`, { method: 'DELETE' });
      setMessage('Fish item deleted successfully.');
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleTankSubmit = async (event) => {
    event.preventDefault();
    try {
      const path = editingTankId ? `/store/tanks/${editingTankId}` : '/store/tanks';
      await apiRequest(path, { method: editingTankId ? 'PATCH' : 'POST', body: JSON.stringify(tankForm) });
      setMessage(editingTankId ? 'Tank updated successfully.' : 'Tank added successfully.');
      setTankForm(emptyTank);
      setEditingTankId(null);
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteTank = async (id) => {
    try {
      await apiRequest(`/store/tanks/${id}`, { method: 'DELETE' });
      setMessage('Tank deleted successfully.');
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const renderActivePage = () => {
    switch (activePage) {
      case 'staff':
        return <ManageStaff staff={staff} staffForm={staffForm} setStaffForm={setStaffForm} staffStep={staffStep} setStaffStep={setStaffStep} staffModalOpen={staffModalOpen} setStaffModalOpen={setStaffModalOpen} staffMode={staffMode} staffOtpSeconds={staffOtpSeconds} onAddStaff={openAddStaff} onEdit={openEditStaff} onDelete={handleDeleteStaff} onSendOtp={handleSendStaffOtp} onCreateStaff={handleCreateStaff} onUpdate={handleUpdateStaff} onStatus={handleStaffStatus} />;
      case 'attendance':
        return <Attendance records={attendance} staff={staff} onSetStaffAttendance={handleSetStaffAttendance} onDelete={handleDeleteAttendance} />;
      case 'inventory':
        return <Inventory fish={fish} fishForm={fishForm} setFishForm={setFishForm} editingFishId={editingFishId} setEditingFishId={setEditingFishId} onSubmit={handleFishSubmit} onDelete={handleDeleteFish} />;
      case 'tanks':
        return <TankManagement tanks={tanks} tankForm={tankForm} setTankForm={setTankForm} editingTankId={editingTankId} setEditingTankId={setEditingTankId} onSubmit={handleTankSubmit} onDelete={handleDeleteTank} />;
      case 'notes':
        return <Notes />;
      default:
        return <OwnerOverview staff={staff} attendance={attendance} fish={fish} tanks={tanks} onRefresh={loadDashboardData} />;
    }
  };

  if (loading) return <main><p>Loading owner dashboard...</p></main>;

  return (
    <main className="owner-dashboard">
      <aside className="owner-sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">F</span>
          <div>
            <strong>Fishonitory</strong>
            <small>Owner workspace</small>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Owner dashboard navigation">
          <button className={activePage === 'overview' ? 'nav-button active' : 'nav-button'} type="button" onClick={() => setActivePage('overview')}>Overview</button>
          <button className={activePage === 'attendance' ? 'nav-button active' : 'nav-button'} type="button" onClick={() => setActivePage('attendance')}>Attendance</button>
          <button className={activePage === 'staff' ? 'nav-button active' : 'nav-button'} type="button" onClick={() => setActivePage('staff')}>Staff Management</button>
          <button className={activePage === 'inventory' ? 'nav-button active' : 'nav-button'} type="button" onClick={() => setActivePage('inventory')}>Fish Inventory</button>
          <button className={activePage === 'tanks' ? 'nav-button active' : 'nav-button'} type="button" onClick={() => setActivePage('tanks')}>Tank Management</button>
          <button className={activePage === 'notes' ? 'nav-button active' : 'nav-button'} type="button" onClick={() => setActivePage('notes')}>Notes</button>
        </nav>
        <button className="nav-button logout-button" type="button" onClick={() => { logout(); window.location.replace('/login'); }}>Logout</button>
      </aside>
      <div className="owner-content">
        <header className="content-header">
          <div>
            <p className="eyebrow">BUSINESS CONTROL CENTER</p>
          </div>
          <span className="status-dot">System online</span>
        </header>
        {message && <p className="feedback success" role="status">{message}</p>}
        {error && <p className="feedback error" role="alert">{error}</p>}
        {renderActivePage()}
      </div>
    </main>
  );
}

export default OwnerDashboard;
