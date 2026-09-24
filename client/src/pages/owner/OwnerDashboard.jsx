  import { useEffect, useRef, useState } from "react";
  import { useAuth } from "../shared/useAuth.js";
  import { SystemUnavailable } from "../shared/AuthLayout.jsx";
  import OwnerOverview from "./OwnerOverview.jsx";
  import ManageStaff from "./ManageStaff.jsx";
  import Attendance from "./Attendance.jsx";
  import Inventory from "./Inventory.jsx";
  import TankManagement from "./TankManagement.jsx";
  import Notes from "./Notes.jsx";
  import Sales from "../shared/Sales.jsx";
  import OwnerOperations from "./OwnerOperations.jsx";
  import Payroll from "./Payroll.jsx";
  import OwnerSettings from "./OwnerSettings.jsx";
  import WorkspaceSetup from "./WorkspaceSetup.jsx";
  import { getDefaultSalesRange } from "../shared/salesUtils.js";
  import { API_URL } from "../../config.js";
  import "../../css/owner-dashboard-layout.css";
  import Swal from "sweetalert2";
  import NotificationBell from "../shared/NotificationBell.jsx";

  // Placeholder objects para sa forms ng add staff
  const emptyStaff = {
    staffName: "",
    staffPosition: "",
    staffEmail: "",
    staffPassword: "",
    staffPhoneNumber: "",
    otp: "",
  };

  // Staff accounts use the same E.164 storage format as owner registration.
  // The existing staff form accepts familiar local digits and normalizes them
  // to the application's Philippine default when it is submitted.
  const normalizeStaffPhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("0")) return `+63${digits.slice(1)}`;
    return digits.startsWith("63") ? `+${digits}` : `+63${digits}`;
  };

  const withStandardStaffPhone = (form) => ({
    ...form,
    staffPhoneNumber: normalizeStaffPhone(form.staffPhoneNumber),
  });

  // Placeholder objects para sa forms ng add fish
  const emptyFish = {
    name: "",
    species: "",
    category: "Fish",
    tankId: "",
    price: "",
    costPrice: "",
    quantity: "",
    description: "",
    photoUrl: "",
  };

  //Place holder objects para sa forms ng add tank
  const emptyTank = {
    name: "",
    status: "Needs Cleaning",
    nextMaintenance: "",
    notes: "",
  };

  const defaultBusinessFeatures = {
    staff: true,
    attendance: true,
    inventory: true,
    tanks: true,
    notes: true,
    sales: true,
    payroll: true,
    operations: true,
  };

  // Function to make API requests with error handling and session role header
  async function apiRequest(path, options = {}) {
    let response;
    // Try-catch block to handle network errors and system unavailability
    try {
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          "X-Session-Role": "Owner",
          ...(options.headers || {}),
        },
        credentials: "include",
      });
    } catch {
      const error = new Error("System is temporarily unavailable.");
      error.code = "SYSTEM_UNAVAILABLE";
      throw error;
    }
    // Check if the response content type is JSON, if not throw a system unavailable error
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const error = new Error("System is temporarily unavailable.");
      error.code = "SYSTEM_UNAVAILABLE";
      throw error;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
  }

  // Main component para sa Owner Dashboard, dito nag lalaman ng lahat ng functionality ng owner workspace.
  function OwnerDashboard() {
    const { user, authReady, logout } = useAuth();
    const [activePage, setActivePage] = useState("overview");
    const [staff, setStaff] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [fish, setFish] = useState([]);
    const [tanks, setTanks] = useState([]);
    const [message, setMessage] = useState("");
    const [staffToast, setStaffToast] = useState("");
    const [payrollToast, setPayrollToast] = useState("");
    const [error, setError] = useState("");
    const [staffError, setStaffError] = useState("");
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [staffForm, setStaffForm] = useState(emptyStaff);
    const [staffStep, setStaffStep] = useState(1);
    const [staffModalOpen, setStaffModalOpen] = useState(false);
    const [staffMode, setStaffMode] = useState("add");
    const [editingStaffId, setEditingStaffId] = useState(null);
    const [staffOtpSeconds, setStaffOtpSeconds] = useState(0);
    const [staffOtpLoading, setStaffOtpLoading] = useState(false);
    const [deletionModalOpen, setDeletionModalOpen] = useState(false);
    const [deletionTarget, setDeletionTarget] = useState(null);
    const [deletionOtp, setDeletionOtp] = useState("");
    const [deletionOtpSeconds, setDeletionOtpSeconds] = useState(0);
    const [deletionError, setDeletionError] = useState("");
    const [fishForm, setFishForm] = useState(emptyFish);
    const [editingFishId, setEditingFishId] = useState(null);
    const [tankForm, setTankForm] = useState(emptyTank);
    const [editingTankId, setEditingTankId] = useState(null);
    const [notes, setNotes] = useState([]);
    const [notePermissions, setNotePermissions] = useState({ canModerate: true, userId: "" });
    const [sales, setSales] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [mortality, setMortality] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [payroll, setPayroll] = useState([]);
    const [salesRange, setSalesRange] = useState({ startDate: "", endDate: "" });
    const [systemUnavailable, setSystemUnavailable] = useState(false);
    const [currentTime, setCurrentTime] = useState(() => new Date());
    const [businessFeatures, setBusinessFeatures] = useState(defaultBusinessFeatures);
    const [workspaceSetupOpen, setWorkspaceSetupOpen] = useState(false);
    const [workspaceSaving, setWorkspaceSaving] = useState(false);
    const [workspaceError, setWorkspaceError] = useState("");
    const pollingRequestInFlight = useRef(false);
    const lastToastRef = useRef("");
    const [shiftTemplates, setShiftTemplates] = useState([]);
    const [lateDeductionAmount, setLateDeductionAmount] = useState(0);

    const notify = (type, title) => {
      const safeTitle = typeof title === "string" ? title.trim() : "";
      if (!safeTitle) return;
      const dedupeKey = `${type}:${safeTitle}`;
      if (lastToastRef.current === dedupeKey) return;
      lastToastRef.current = dedupeKey;
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: type,
        title: safeTitle,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#062d48",
        color: "#d9ecef",
      });
      window.setTimeout(() => {
        if (lastToastRef.current === dedupeKey) lastToastRef.current = "";
      }, 4500);
    };


    // Function para i-load ang lahat ng data sa dashboard, ito yung mag fe-fetch ng lahat ng data mula sa server.
    const loadDashboardData = async ({ background = false } = {}) => {
      if (pollingRequestInFlight.current) return;
      pollingRequestInFlight.current = true;
      if (!background) {
        setRefreshing(true);
        setError("");
        setSystemUnavailable(false);
      }
      try {
        const [
          staffData,
          attendanceData,
          fishData,
          tankData,
          noteData,
          salesData,
          purchaseData,
          mortalityData,
          auditData,
          payrollData,
          workspaceData,
          shiftData,
        ] = await Promise.all([
          apiRequest("/owner/staff"),
          apiRequest("/attendance"),
          apiRequest("/fish"),
          apiRequest("/store/tanks"),
          apiRequest("/notes"),
          apiRequest("/sales"),
          apiRequest("/operations/purchases"),
          apiRequest("/operations/mortality"),
          apiRequest("/operations/audit-logs"),
          apiRequest("/payroll"),
          apiRequest("/owner/workspace-settings"),
          apiRequest("/attendance/shift-templates"),
        ]);
        setStaff(staffData.staff);
        setAttendance(attendanceData.records);
        setFish(fishData.fish);
        setTanks(tankData.tanks);
        setNotes(noteData.notes || []);
        setNotePermissions(noteData.permissions || { canModerate: true, userId: "" });
        setSales(salesData.sales);
        setPurchases(purchaseData.purchases);
        setMortality(mortalityData.records);
        setAuditLogs(auditData.logs);
        setPayroll(payrollData.payroll);
        setShiftTemplates(shiftData.shiftTemplates || []);
        setLateDeductionAmount(shiftData.lateDeductionAmount || 0);
        setBusinessFeatures({ ...defaultBusinessFeatures, ...workspaceData.features });
        if (!background) setWorkspaceSetupOpen(!workspaceData.setupCompleted);
        setSalesRange((currentRange) => {
          if (currentRange.startDate && currentRange.endDate) return currentRange;
          return getDefaultSalesRange(salesData.sales);
        });
      } catch (requestError) {
        if (!background) {
          if (requestError.code === "SYSTEM_UNAVAILABLE") setSystemUnavailable(true);
          else setError(requestError.message);
        }
      } finally {
        pollingRequestInFlight.current = false;
        if (!background) setRefreshing(false);
        setInitialLoading(false);
      }
    };

    // purchase handler
    const handlePurchase = async (purchase) => {
      try {
        const data = await apiRequest("/operations/purchases", {
          method: "POST",
          body: JSON.stringify(purchase),
        });
        setMessage(data.message);
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    // mortality handler
    const handleMortality = async (record) => {
      try {
        const data = await apiRequest("/operations/mortality", {
          method: "POST",
          body: JSON.stringify(record),
        });
        setMessage(data.message);
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    // useEffect para i-check kung ang user ay may role na "Owner", kung hindi, ire-redirect sa login page.
    useEffect(() => {
      if (!authReady) return undefined;
      if (user?.role !== "Owner") {
        window.location.replace("/login");
        return;
      }
      const loadTimer = setTimeout(loadDashboardData, 0);
      return () => clearTimeout(loadTimer);
    }, [authReady, user]);

    useEffect(() => {
      if (!authReady || user?.role !== "Owner") return undefined;
      const timer = window.setInterval(() => loadDashboardData({ background: true }), 10000);
      return () => window.clearInterval(timer);
    }, [authReady, user?.role]);


    // useEffect para i-handle ang countdown timer para sa staff OTP, kung ang staffOtpSeconds ay mas mababa o equal sa 0, hindi na magpapatuloy ang timer.
    useEffect(() => {
      if (staffOtpSeconds <= 0) return undefined;
      const timer = setTimeout(
        () => setStaffOtpSeconds((seconds) => Math.max(seconds - 1, 0)),
        1000,
      );
      return () => clearTimeout(timer);
    }, [staffOtpSeconds]);

    // useEffect para i-handle ang countdown timer para sa deletion OTP, kung ang deletionOtpSeconds ay mas mababa o equal sa 0, hindi na magpapatuloy ang timer.
    useEffect(() => {
      if (deletionOtpSeconds <= 0) return undefined;
      const timer = setTimeout(
        () => setDeletionOtpSeconds((seconds) => Math.max(seconds - 1, 0)),
        1000,
      );
      return () => clearTimeout(timer);
    }, [deletionOtpSeconds]);

    // useEffect para i-handle ang toast message para sa staff, kung ang staffToast ay hindi empty, magse-set ng timer na magtatanggal ng toast message pagkatapos ng 5 seconds.
    useEffect(() => {
      if (!staffToast) return undefined;
      notify("success", staffToast);
      const timer = setTimeout(() => setStaffToast(""), 4500);
      return () => clearTimeout(timer);
    }, [staffToast]);

    // useEffect para i-handle ang toast message para sa payroll, kung ang payrollToast ay hindi empty, magse-set ng timer na magtatanggal ng toast message pagkatapos ng 5 seconds.
    useEffect(() => {
      if (!payrollToast) return undefined;
      notify("success", payrollToast);
      const timer = setTimeout(() => setPayrollToast(""), 4500);
      return () => clearTimeout(timer);
    }, [payrollToast]);

    useEffect(() => {
      if (!message) return undefined;
      notify("success", message);
      const timer = setTimeout(() => setMessage(""), 4500);
      return () => clearTimeout(timer);
    }, [message]);

    useEffect(() => {
      if (!error) return undefined;
      notify("error", error);
      const timer = setTimeout(() => setError(""), 4500);
      return () => clearTimeout(timer);
    }, [error]);

    // useEffect para i-update ang current time sa dashboard bawat segundo, para sa real-time na display ng oras.
    useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);

    // useEffect para i-reset ang theme ng dashboard sa default kapag nag-mount ang component, at i-remove ang theme mula sa localStorage.
    useEffect(() => {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem("fishonitory_theme");
    }, []);

    // Function para i-open ang add staff modal, at i-reset ang staff form sa emptyStaff object.
    const openAddStaff = () => {
      setStaffForm(emptyStaff);
      setStaffStep(1);
      setStaffMode("add");
      setEditingStaffId(null);
      setStaffOtpSeconds(0);
      setStaffError("");
      setStaffModalOpen(true);
    };

    // Function para i-open ang edit staff modal, at i-set ang staff form sa values ng selected staff item.
    const openEditStaff = (item) => {
      setStaffForm({
        staffName: item.staffName,
        staffPosition: item.staffPosition,
        staffEmail: item.email,
        staffPassword: "",
        staffPhoneNumber: item.phoneNumber || "",
        otp: "",
      });
      setStaffMode("edit");
      setStaffError("");
      setEditingStaffId(item._id);
      setStaffModalOpen(true);
    };

    // Function para i-send ang OTP sa staff, at i-set ang staffStep sa 2 kapag successful ang request.
    const handleSendStaffOtp = async (event) => {
      event.preventDefault();
      setMessage("");
      setError("");
      setStaffError("");
      setStaffOtpLoading(true);
      try {
        const data = await apiRequest("/owner/staff/send-otp", {
          method: "POST",
          body: JSON.stringify(withStandardStaffPhone(staffForm)),
        });
        setMessage(data.message);
        setStaffOtpSeconds(5 * 60);
        setStaffStep(2);
      } catch (requestError) {
        setStaffError(requestError.message);
      } finally {
        setStaffOtpLoading(false);
      }
    };

    // Function para i-create ang staff, at i-reset ang staff form sa emptyStaff object kapag successful ang request.
    const handleCreateStaff = async (event) => {
      event.preventDefault();
      setMessage("");
      setError("");
      setStaffError("");
      try {
        const data = await apiRequest("/owner/staff", {
          method: "POST",
          body: JSON.stringify(withStandardStaffPhone(staffForm)),
        });
        setStaffToast(data.message);
        setStaffForm(emptyStaff);
        setStaffStep(1);
        setStaffOtpSeconds(0);
        setStaffModalOpen(false);
        await loadDashboardData();
      } catch (requestError) {
        setStaffError(requestError.message);
        setStaffForm((previous) => ({ ...previous, otp: "" }));
        setStaffStep(2);
      }
    };

    // Function para i-update ang staff, at i-reset ang staff form sa emptyStaff object kapag successful ang request.
    const handleUpdateStaff = async (event) => {
      event.preventDefault();
      const confirmation = await Swal.fire({ title: "Save staff changes?", text: "The staff account details will be updated.", icon: "question", showCancelButton: true, confirmButtonText: "Save changes", background: "#062d48", color: "#d9ecef" });
      if (!confirmation.isConfirmed) return;
      setMessage("");
      setError("");
      setStaffError("");
      try {
        const data = await apiRequest(`/owner/staff/${editingStaffId}`, {
          method: "PATCH",
          body: JSON.stringify(withStandardStaffPhone(staffForm)),
        });
        setMessage(data.message);
        setStaffModalOpen(false);
        await loadDashboardData();
      } catch (requestError) {
        setStaffError(requestError.message);
      }
    };


    //  Function para i-close ang deletion modal, at i-reset ang deletion target, OTP, seconds, at error message.
    const closeDeletionModal = () => {
      setDeletionModalOpen(false);
      setDeletionTarget(null);
      setDeletionOtp("");
      setDeletionOtpSeconds(0);
      setDeletionError("");
    };

    // Function para i-handle ang deletion ng staff, magse-send ng OTP sa server, at i-open ang deletion modal kapag successful ang request.
    const handleDeleteStaff = async (item) => {
      setMessage("");
      setError("");
      setDeletionError("");
      try {
        const data = await apiRequest(`/owner/staff/${item._id}/deletion-otp`, {
          method: "POST",
        });
        setDeletionTarget(item);
        setDeletionOtp("");
        setDeletionOtpSeconds(5 * 60);
        setDeletionModalOpen(true);
        setMessage(data.message);
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    // Function para i-confirm ang deletion ng staff, magse-send ng OTP sa server, at i-close ang deletion modal kapag successful ang request.
    const handleConfirmDeleteStaff = async (event) => {
      event.preventDefault();
      if (!deletionTarget) return;
      setDeletionError("");
      try {
        const data = await apiRequest(`/owner/staff/${deletionTarget._id}`, {
          method: "DELETE",
          body: JSON.stringify({ otp: deletionOtp }),
        });
        closeDeletionModal();
        setMessage(data.message);
        await loadDashboardData();
      } catch (requestError) {
        setDeletionError(requestError.message);
        setDeletionOtp("");
      }
    };

    // Function para i-handle ang status ng staff, magse-send ng PATCH request sa server para i-update ang status ng staff, at i-reload ang dashboard data kapag successful ang request.
    const handleStaffStatus = async (id, status) => {
      const confirmation = await Swal.fire({ title: `${status === "Disabled" ? "Disable" : "Enable"} staff account?`, text: status === "Disabled" ? "The staff member will not be able to sign in." : "The staff member will regain access.", icon: "warning", showCancelButton: true, confirmButtonText: status === "Disabled" ? "Disable account" : "Enable account", background: "#062d48", color: "#d9ecef" });
      if (!confirmation.isConfirmed) return;
      try {
        await apiRequest(`/owner/staff/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

        const handleSaveShiftTemplate = async (template) => {
      try {
        await apiRequest("/attendance/shift-templates", {
          method: "POST",
          body: JSON.stringify(template),
        });
        setMessage(template.id ? "Shift template updated." : "Shift template added.");
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const handleDeleteShiftTemplate = async (id) => {
      const confirmation = await Swal.fire({ title: "Delete shift template?", text: "Staff assigned to this shift will fall back to the default schedule.", icon: "warning", showCancelButton: true, confirmButtonText: "Delete", confirmButtonColor: "#d33", background: "#062d48", color: "#d9ecef" });
      if (!confirmation.isConfirmed) return;
      try {
        await apiRequest(`/attendance/shift-templates/${id}`, { method: "DELETE" });
        setMessage("Shift template deleted.");
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const handleAssignStaffShift = async (staffId, shiftTemplateId) => {
      try {
        await apiRequest("/attendance/shift-templates/assign", {
          method: "POST",
          body: JSON.stringify({ staffId, shiftTemplateId }),
        });
        setMessage("Staff shift updated.");
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const handleUpdateLateDeductionAmount = async (amount) => {
      try {
        await apiRequest("/attendance/late-deduction", {
          method: "POST",
          body: JSON.stringify({ amount }),
        });
        setLateDeductionAmount(amount);
        setMessage("Late deduction amount updated.");
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const handleSetStaffAttendance = async (staffId, dateKey, status) => {
      // Optimistic update: reflect the change immediately in the UI
      const previousAttendance = attendance;
      setAttendance((prev) => {
        const existingIndex = prev.findIndex(
          (record) => record.userId?._id === staffId && record.dateKey === dateKey,
        );
        if (existingIndex === -1) {
          return [
            ...prev,
            {
              _id: `temp-${staffId}-${dateKey}`,
              userId: { _id: staffId },
              dateKey,
              status,
            },
          ];
        }
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], status };
        return next;
      });

      try {
        await apiRequest("/attendance/status", {
          method: "POST",
          body: JSON.stringify({ staffId, dateKey, status }),
        });
        setMessage("Staff attendance and account status updated.");
        await loadDashboardData();
      } catch (requestError) {
        setAttendance(previousAttendance);
        setError(requestError.message);
      }
    };

  const handleDeleteAttendance = async (id) => {
      const result = await Swal.fire({
        title: "Delete record?",
        text: "Delete this attendance record? This cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#062d48",
        confirmButtonText: "Yes, delete it",
        cancelButtonText: "Cancel",
        background: "#062d48",
        color: "#d9ecef",
      });

      if (!result.isConfirmed) return;

      try {
        await apiRequest(`/attendance/${id}`, { method: "DELETE" });
        await Swal.fire({
          title: "Deleted!",
          text: "Attendance record deleted successfully.",
          icon: "success",
          timer: 1800,
          showConfirmButton: false,
          background: "#062d48",
          color: "#d9ecef",
        });

        await loadDashboardData();
      } catch (requestError) {
        Swal.fire({
          title: "Error!",
          text: requestError.message || "Failed to delete attendance record.",
          icon: "error",
          background: "#062d48",
          color: "#d9ecef",
        });
      }
    };

    const handleFishSubmit = async (event) => {
      event.preventDefault();
      try {
        const path = editingFishId ? `/fish/${editingFishId}` : "/fish";
        await apiRequest(path, {
          method: editingFishId ? "PATCH" : "POST",
          body: JSON.stringify({
            ...fishForm,
            price: Number(fishForm.price),
            costPrice: Number(fishForm.costPrice),
            quantity: Number(fishForm.quantity),
          }),
        });
        setMessage(
          editingFishId
            ? "Fish item updated successfully."
            : "Fish item added successfully.",
        );
        setFishForm(emptyFish);
        setEditingFishId(null);
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const handleFishPhotoUpload = async (file) => {
      const formData = new FormData();
      formData.append("photo", file);
      const data = await apiRequest("/fish/photo", {
        method: "POST",
        body: formData,
      });
      return data.photoUrl;
    };

    const handleDeleteFish = async (id) => {
      try {
        await apiRequest(`/fish/${id}`, { method: "DELETE" });
        setMessage("Fish item deleted successfully.");
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const handleTankSubmit = async (event) => {
      event.preventDefault();
      try {
        const path = editingTankId
          ? `/store/tanks/${editingTankId}`
          : "/store/tanks";
        await apiRequest(path, {
          method: editingTankId ? "PATCH" : "POST",
          body: JSON.stringify(tankForm),
        });
        setMessage(
          editingTankId
            ? "Tank updated successfully."
            : "Tank added successfully.",
        );
        setTankForm(emptyTank);
        setEditingTankId(null);
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const handleDeleteTank = async (id) => {
      try {
        await apiRequest(`/store/tanks/${id}`, { method: "DELETE" });
        setMessage("Tank deleted successfully.");
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const handleAddNote = async (text) => {
      try {
        await apiRequest("/notes", {
          method: "POST",
          body: JSON.stringify({ text }),
        });
        setMessage("Note added successfully.");
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const handleSavePayroll = async (payrollData) => {
      try {
        const data = await apiRequest("/payroll", {
          method: "POST",
          body: JSON.stringify(payrollData),
        });
        setPayrollToast(data.message);
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const handleDeletePayroll = async (id) => {
      const confirmation = await Swal.fire({ title: "Delete payroll record?", text: "This cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonText: "Delete", confirmButtonColor: "#d33", background: "#062d48", color: "#d9ecef" });
      if (!confirmation.isConfirmed) return;
      try {
        const data = await apiRequest(`/payroll/${id}`, { method: "DELETE" });
        setPayrollToast(data.message);
        await loadDashboardData();
      } catch (requestError) {
        setError(requestError.message);
      }
    };

    const handleUpdateNote = async (id, changes) => {
      try {
        const data = await apiRequest(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
        setNotes((current) => current.map((item) => item._id === id ? data.note : item));
        setMessage("Note updated.");
      } catch (requestError) { setError(requestError.message); }
    };

    const handleDeleteNote = async (id) => {
      try {
        await apiRequest(`/notes/${id}`, { method: "DELETE" });
        setNotes((current) => current.filter((item) => item._id !== id));
        setMessage("Note deleted.");
      } catch (requestError) { setError(requestError.message); }
    };

    const handleSaveWorkspace = async () => {
      setWorkspaceSaving(true);
      setWorkspaceError("");
      try {
        const data = await apiRequest("/owner/workspace-settings", {
          method: "PUT",
          body: JSON.stringify({ features: businessFeatures }),
        });
        setBusinessFeatures({ ...defaultBusinessFeatures, ...data.features });
        setWorkspaceSetupOpen(false);
        setMessage(data.message);
        if (!data.features[activePage]) setActivePage("overview");
      } catch (requestError) {
        setWorkspaceError(requestError.message);
      } finally {
        setWorkspaceSaving(false);
      }
    };

    const renderActivePage = () => {
      if (activePage !== "overview" && activePage !== "settings" && !businessFeatures[activePage]) {
        return <OwnerOverview staff={staff} attendance={attendance} fish={fish} tanks={tanks} notes={notes} sales={sales} salesRange={salesRange} onSalesDateChange={(field, value) => setSalesRange((previous) => ({ ...previous, [field]: value }))} onAddNote={handleAddNote} onRefresh={loadDashboardData} />;
      }
      switch (activePage) {
        case "staff":
          return (
            <ManageStaff
              staff={staff}
              staffForm={staffForm}
              setStaffForm={setStaffForm}
              staffStep={staffStep}
              setStaffStep={setStaffStep}
              staffModalOpen={staffModalOpen}
              setStaffModalOpen={setStaffModalOpen}
              staffMode={staffMode}
              staffOtpSeconds={staffOtpSeconds}
              staffOtpLoading={staffOtpLoading}
              staffError={staffError}
              staffToast={staffToast}
              deletionModalOpen={deletionModalOpen}
              deletionTarget={deletionTarget}
              deletionOtp={deletionOtp}
              setDeletionOtp={setDeletionOtp}
              deletionOtpSeconds={deletionOtpSeconds}
              deletionError={deletionError}
              onAddStaff={openAddStaff}
              onEdit={openEditStaff}
              onDelete={handleDeleteStaff}
              onConfirmDelete={handleConfirmDeleteStaff}
              onCloseDeletion={closeDeletionModal}
              onSendOtp={handleSendStaffOtp}
              onCreateStaff={handleCreateStaff}
              onUpdate={handleUpdateStaff}
              onStatus={handleStaffStatus}
            />
          );
        case "attendance":
          return (
            <Attendance
              records={attendance}
              staff={staff.filter(
                (item) =>
                  item.role === "Staff" && item.staffPosition !== "Master Staff",
              )}
              onSetStaffAttendance={handleSetStaffAttendance}
              onDelete={handleDeleteAttendance}
              shiftTemplates={shiftTemplates}
              lateDeductionAmount={lateDeductionAmount}
              onSaveShiftTemplate={handleSaveShiftTemplate}
              onDeleteShiftTemplate={handleDeleteShiftTemplate}
              onAssignStaffShift={handleAssignStaffShift}
              onUpdateLateDeductionAmount={handleUpdateLateDeductionAmount}
            />
          );
        case "inventory":
          return (
            <Inventory
              fish={fish}
              tanks={tanks}
              fishForm={fishForm}
              setFishForm={setFishForm}
              editingFishId={editingFishId}
              setEditingFishId={setEditingFishId}
              onPhotoUpload={handleFishPhotoUpload}
              onSubmit={handleFishSubmit}
              onDelete={handleDeleteFish}
            />
          );
        case "tanks":
          return (
            <TankManagement
              tanks={tanks}
              fish={fish}
              tankForm={tankForm}
              setTankForm={setTankForm}
              editingTankId={editingTankId}
              setEditingTankId={setEditingTankId}
              onSubmit={handleTankSubmit}
              onDelete={handleDeleteTank}
            />
          );
        case "notes":
          return <Notes notes={notes} permissions={notePermissions} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} />;
        case "sales":
          return (
            <Sales
              sales={sales}
              startDate={salesRange.startDate}
              endDate={salesRange.endDate}
              onDateChange={(field, value) =>
                setSalesRange((previous) => ({ ...previous, [field]: value }))
              }
            />
          );
        case "operations":
          return (
            <OwnerOperations
              fish={fish}
              purchases={purchases}
              mortality={mortality}
              auditLogs={auditLogs}
              sales={sales}
              onPurchase={handlePurchase}
              onMortality={handleMortality}
            />
          );
        case "payroll":
          return (
            <Payroll
              staff={staff}
              attendance={attendance}
              payroll={payroll}
              onSave={handleSavePayroll}
              onDelete={handleDeletePayroll}
              toast={payrollToast}
            />
          );
        case "settings":
          return (
            <OwnerSettings
              user={user}
              onLogout={logout}
              features={businessFeatures}
              onEditWorkspace={() => setWorkspaceSetupOpen(true)}
            />
          );
        default:
          return (
            <OwnerOverview
              staff={staff}
              attendance={attendance}
              fish={fish}
              tanks={tanks}
              sales={sales}
              salesRange={salesRange}
              onSalesDateChange={(field, value) =>
                setSalesRange((previous) => ({ ...previous, [field]: value }))
              }
              onRefresh={loadDashboardData}
            />
          );
      }
    };

    if (systemUnavailable)
      return <SystemUnavailable onRetry={loadDashboardData} retrying={refreshing} />;

    if (initialLoading)
      return (
        <main className="grid h-screen place-items-center bg-[radial-gradient(circle_at_88%_12%,#0a5267_0%,#08465d_42%,#021a31_100%)] p-6 text-[#c9e1e5]">
          <div className="text-center">
            <img
              src="/LOGO.svg"
              alt=""
              className="mx-auto h-16 w-auto animate-[pulse_1.3s_ease-in-out_infinite]"
            />
            <p className="mt-4 font-['Poppins'] text-sm">
              Preparing your owner workspace…
            </p>
          </div>
        </main>
      );

    const navButtonClass = (page) => {
      const isActive = activePage === page;

      if (isActive) {
        return "shrink-0 rounded-md border-0 bg-[#65c9c9] bg-clip-padding px-3 py-2 text-left font-['Poppins'] text-[0.78rem] font-medium leading-tight text-[#073047] outline-none transition hover:bg-[#75cccc] [-webkit-appearance:none] [appearance:none] [box-shadow:none] focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer";
      }

      return "shrink-0 rounded-md border-0 bg-transparent bg-clip-padding px-3 py-2 text-left font-['Poppins'] text-[0.78rem] leading-tight text-[#8fb7be] outline-none transition hover:text-[#d9ecef] [-webkit-appearance:none] [appearance:none] [box-shadow:none] focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer";
    };

    return (
      <main className="box-border flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_88%_12%,#0a5267_0%,#08465d_42%,#021a31_100%)] text-[#c9e1e5] md:flex-row owner-dashboard-main">
        <aside className="box-border flex w-full shrink-0 flex-col overflow-hidden border-b border-cyan-100/[.08] bg-[#062f43] md:h-full md:w-56 md:border-b-0 md:border-r md:px-3 md:pt-4 md:pb-4">
          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label="Refresh Fishonitory workspace"
            title="Refresh dashboard"
            className="cursor-pointer flex shrink-0 items-center gap-2.5 rounded-lg border-0 bg-transparent px-1 py-1 text-left transition hover:bg-white/[.04] focus:outline-none focus:ring-2 focus:ring-[#73c4ca]"
          >
            <img src="/LOGO.svg" alt="Fishonitory" className="h-10 w-10 object-contain" />
            <div>
              <strong className="block font-['Poppins'] text-[0.9rem] font-medium text-[#cde4e6]">
                Fishonitory
              </strong>
              <small className="block font-['Poppins'] text-[0.58rem] text-[#7fa7ae]">
                Owners workspace
              </small>
            </div>
          </button>

          <nav
            className="mt-4 flex min-w-0 gap-0.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mt-6 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pr-1 [scrollbar-width:thin]"
            aria-label="Owner dashboard navigation"
          >
            <button className={navButtonClass("overview")} type="button" onClick={() => setActivePage("overview")}>Overview</button>
            {businessFeatures.attendance && <button className={navButtonClass("attendance")} type="button" onClick={() => setActivePage("attendance")}>Attendance</button>}
            {businessFeatures.staff && <button className={navButtonClass("staff")} type="button" onClick={() => setActivePage("staff")}>Staff Management</button>}
            {businessFeatures.inventory && <button className={navButtonClass("inventory")} type="button" onClick={() => setActivePage("inventory")}>Fish Inventory</button>}
            {businessFeatures.tanks && <button className={navButtonClass("tanks")} type="button" onClick={() => setActivePage("tanks")}>Tank Management</button>}
            {businessFeatures.notes && <button className={navButtonClass("notes")} type="button" onClick={() => setActivePage("notes")}>Announcement Board</button>}
            {businessFeatures.sales && <button className={navButtonClass("sales")} type="button" onClick={() => setActivePage("sales")}>Sales</button>}
            {businessFeatures.payroll && <button className={navButtonClass("payroll")} type="button" onClick={() => setActivePage("payroll")}>Payroll</button>}
            {businessFeatures.operations && <button className={navButtonClass("operations")} type="button" onClick={() => setActivePage("operations")}>Operations & Reports</button>}
            <button className={navButtonClass("settings")} type="button" onClick={() => setActivePage("settings")}>Settings</button>
          </nav>

          <div className="mt-auto shrink-0 border-t border-cyan-100/[.08] pt-2.5 pb-0.5 md:pt-3 md:pb-1">
            <div
              className="flex items-center gap-2.5 rounded-lg p-1.5 transition hover:bg-white/[.04] cursor-pointer"
              onClick={() => setActivePage("settings")}
              title="Open Settings"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setActivePage("settings");
              }}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#75bec4]/20 font-['Poppins'] text-sm font-semibold text-[#bce9e9]">
                {(user?.ownerName || user?.email || "O").trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-['Poppins'] text-[0.78rem] font-medium text-[#cde4e6]">
                  {user?.businessName || "Business account"}
                </p>
                <p className="truncate font-['Poppins'] text-[0.62rem] text-[#6f9ca5]">
                  {user?.ownerName || user?.email || "Business owner"}
                </p>
              </div>
            </div>
            <button
              className="mt-2.5 w-full rounded-lg border border-cyan-100/10 bg-white/[.05] px-3 py-2 text-center font-['Poppins'] text-[0.75rem] font-medium text-[#b8d8dd] outline-none transition hover:border-red-200/25 hover:bg-red-200/10 hover:text-red-100 focus:ring-2 focus:ring-[#73c4ca]/50 cursor-pointer"
              type="button"
              onClick={async () => {
                const result = await Swal.fire({ title: "Log out?", text: "You will need to sign in again to continue.", icon: "question", showCancelButton: true, confirmButtonText: "Log out", cancelButtonText: "Stay signed in", background: "#062d48", color: "#d9ecef", confirmButtonColor: "#4f9fa5" });
                if (result.isConfirmed) { await logout(); window.location.replace("/login"); }
              }}
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="owner-workspace min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-5 lg:px-5 lg:py-8">
          <header className="mb-7 flex w-full max-w-7xl items-start justify-between gap-4 border-b border-sky-100/10 pb-5">
            <div>
              <p className="font-['Poppins'] text-[0.65rem] font-medium tracking-[0.16em] text-[#73c4ca]">
                BUSINESS CONTROL CENTER
              </p>
              <p className="mt-1 font-['Poppins'] text-xs text-[#759faa]">
                {currentTime.toLocaleDateString("en-PH", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-100/10 bg-white/[.04] px-3 py-1.5 font-['Poppins'] text-xs text-[#a8c9d0]">
              <span
                className={`h-1.5 w-1.5 rounded-full bg-[#73c4ca] shadow-[0_0_10px_#73c4ca] ${
                  refreshing ? "animate-pulse" : ""
                }`}
              />
              {refreshing ? "Syncing…" : "System online"} ·{" "}
              {currentTime.toLocaleTimeString("en-PH", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
            <NotificationBell notes={notes} fish={fish} tanks={tanks} attendance={attendance} onNavigate={setActivePage} viewerRole="Owner" viewerId={user?.id} />
            </div>
          </header>
          {message && (
            <p
              className="mb-4 w-full max-w-7xl rounded-xl border border-[#75bec4]/30 bg-[#75bec4]/10 px-4 py-3 font-['Poppins'] text-sm text-[#c9e8e9]"
              role="status"
            >
              {message}
            </p>
          )}
          {error && (
            <p
              className="mb-4 w-full max-w-7xl rounded-xl border border-red-200/25 bg-red-200/10 px-4 py-3 font-['Poppins'] text-sm text-red-100"
              role="alert"
            >
              {error}
            </p>
          )}
          {renderActivePage()}
        </div>
        {workspaceSetupOpen && <WorkspaceSetup features={businessFeatures} setFeatures={setBusinessFeatures} onSave={handleSaveWorkspace} saving={workspaceSaving} error={workspaceError} />}
      </main>
    );
  }

  export default OwnerDashboard;
