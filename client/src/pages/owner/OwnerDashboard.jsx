import DashboardSidebar from "../../components/DashboardSidebar.jsx";
import DashboardHeader from "../../components/DashboardHeader.jsx";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../shared/useAuth.js";
import { LoadingOverlay, SystemUnavailable } from "../shared/AuthLayout.jsx";
import OwnerOverview from "./OwnerOverview.jsx";
import ManageStaff from "./ManageStaff.jsx";
import Attendance from "./Attendance.jsx";
import Inventory from "./Inventory.jsx";
import TankManagement from "./TankManagement.jsx";
import Notes from "./Notes.jsx";
import PlatformNoticeBanner from "./PlatformNoticeBanner.jsx";
import Sales from "../shared/Sales.jsx";
import OwnerOperations from "./OwnerOperations.jsx";
import Payroll from "./Payroll.jsx";
import OwnerSettings from "./OwnerSettings.jsx";
import WorkspaceSetup from "./WorkspaceSetup.jsx";
import { getDefaultSalesRange } from "../shared/salesUtils.js";
import { API_URL } from "../../config.js";
import "../../css/owner-dashboard-layout.css";
import NotificationBell from "../shared/NotificationBell.jsx";
import DashboardToast from "../../components/DashboardToast.jsx";
import {
  confirmOceanicAction,
  oceanicNotice,
  showOceanicLogoutConfirm,
} from "../../utils/oceanicSwal.js";

// Placeholder objects para sa forms ng add staff
const emptyStaff = {
  staffName: "",
  staffPosition: "",
  staffEmail: "",
  staffPassword: "",
  staffPhoneNumber: "",
  otp: "",
};

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
  capacity: "",
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
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
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
  if (!response.ok) {
    const error = new Error(data.message || "Request failed.");
    error.code = data.code;
    throw error;
  }
  return data;
}

// Sidebar section: title, optional description, then indented menu items.
// Contrast on the sidebar background (#021d2e): menu items #d4eaec 13.8:1,
// title #8fc5cb 9.1:1, description #8fb3ba 7.7:1 (all WCAG AAA).
// On mobile the sidebar is a horizontal strip, so the heading is hidden and
// the wrappers use `display: contents` to keep buttons as direct row items.

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
  const [toastNotice, setToastNotice] = useState(null);
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
  const [platformNotices, setPlatformNotices] = useState([]);
  const [notePermissions, setNotePermissions] = useState({
    canModerate: true,
    userId: "",
  });
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [mortality, setMortality] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [salesRange, setSalesRange] = useState({ startDate: "", endDate: "" });
  const [systemUnavailable, setSystemUnavailable] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessFeatures, setBusinessFeatures] = useState(
    defaultBusinessFeatures,
  );
  const [workspaceSetupOpen, setWorkspaceSetupOpen] = useState(false);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const pollingRequestInFlight = useRef(false);
  const lastToastRef = useRef("");
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [lateDeductionAmount, setLateDeductionAmount] = useState(0);
  const [shiftAssignments, setShiftAssignments] = useState([]);

  const notify = (type, title) => {
    const safeTitle = typeof title === "string" ? title.trim() : "";
    if (!safeTitle) return;
    const dedupeKey = `${type}:${safeTitle}`;
    if (lastToastRef.current === dedupeKey) return;
    lastToastRef.current = dedupeKey;
    setToastNotice({ type, title: safeTitle });
    window.setTimeout(() => {
      if (lastToastRef.current === dedupeKey) lastToastRef.current = "";
    }, 4500);
  };

  useEffect(() => {
    if (!toastNotice) return undefined;
    const timer = window.setTimeout(() => setToastNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastNotice]);

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
        shiftAssignmentsData,
        platformNoticeData,
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
        apiRequest("/attendance/shift-assignments"),
        apiRequest("/platform-notices"),
      ]);
      setStaff(staffData.staff);
      setAttendance(attendanceData.records);
      setFish(fishData.fish);
      setTanks(tankData.tanks);
      setNotes(noteData.notes || []);
      setPlatformNotices(platformNoticeData.notices || []);
      setNotePermissions(
        noteData.permissions || { canModerate: true, userId: "" },
      );
      setSales(salesData.sales);
      setPurchases(purchaseData.purchases);
      setMortality(mortalityData.records);
      setAuditLogs(auditData.logs);
      setPayroll(payrollData.payroll);
      setShiftTemplates(shiftData.shiftTemplates || []);
      setLateDeductionAmount(shiftData.lateDeductionAmount || 0);
      setShiftAssignments(shiftAssignmentsData.shiftAssignments || []);
      setBusinessFeatures({
        ...defaultBusinessFeatures,
        ...workspaceData.features,
      });
      if (!background) setWorkspaceSetupOpen(!workspaceData.setupCompleted);
      setSalesRange((currentRange) => {
        if (currentRange.startDate && currentRange.endDate) return currentRange;
        return getDefaultSalesRange(salesData.sales);
      });
    } catch (requestError) {
      if (!background) {
        if (requestError.code === "SYSTEM_UNAVAILABLE")
          setSystemUnavailable(true);
        else setError(requestError.message);
      }
    } finally {
      pollingRequestInFlight.current = false;
      if (!background) setRefreshing(false);
      setInitialLoading(false);
    }
  };

  const handleSaveShiftAssignment = async (assignment) => {
    try {
      await apiRequest("/attendance/shift-assignments", {
        method: "POST",
        body: JSON.stringify(assignment),
      });
      setMessage("Shift assigned for that date.");
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteShiftAssignment = async (id) => {
    const confirmation = await confirmOceanicAction({
      title: "Remove shift assignment?",
      text: "This will delete the assigned shift for the selected date.",
      confirmText: "Remove assignment",
      tone: "danger",
    });
    if (!confirmation) return;

    try {
      await apiRequest(`/attendance/shift-assignments/${id}`, {
        method: "DELETE",
      });
      setMessage("Shift assignment removed.");
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
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
        body: record instanceof FormData ? record : JSON.stringify(record),
      });
      setMessage(data.message);
      await loadDashboardData();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
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
    const timer = window.setInterval(
      () => loadDashboardData({ background: true }),
      10000,
    );
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
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
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
    const confirmation = await confirmOceanicAction({
      title: "Save staff changes?",
      text: "The staff account details will be updated.",
      icon: "question",
      confirmText: "Save changes",
    });
    if (!confirmation) return;
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
    const confirmation = await confirmOceanicAction({
      title: `${status === "Disabled" ? "Disable" : "Enable"} staff account?`,
      text:
        status === "Disabled"
          ? "The staff member will not be able to sign in."
          : "The staff member will regain access.",
      confirmText:
        status === "Disabled" ? "Disable account" : "Enable account",
      icon: "warning",
      tone: "default",
    });
    if (!confirmation) return;
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
      setMessage(
        template.id ? "Shift template updated." : "Shift template added.",
      );
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteShiftTemplate = async (id) => {
    const confirmation = await confirmOceanicAction({
      title: "Delete shift template?",
      text: "Staff assigned to this shift will fall back to the default schedule.",
      icon: "warning",
      confirmText: "Delete",
      tone: "danger",
    });
    if (!confirmation) return;
    try {
      await apiRequest(`/attendance/shift-templates/${id}`, {
        method: "DELETE",
      });
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
        (record) =>
          record.userId?._id === staffId && record.dateKey === dateKey,
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
    const result = await confirmOceanicAction({
      title: "Delete record?",
      text: "Delete this attendance record? This cannot be undone.",
      icon: "warning",
      confirmText: "Yes, delete it",
      tone: "danger",
    });

    if (!result) return;

    try {
      await apiRequest(`/attendance/${id}`, { method: "DELETE" });
      await oceanicNotice(
        "Deleted!",
        "Attendance record deleted successfully.",
        "success",
        {
        showConfirmButton: false,
        timer: 1800,
        },
      );

      await loadDashboardData();
    } catch (requestError) {
      oceanicNotice(
        "Error!",
        requestError.message || "Failed to delete attendance record.",
        "error",
      );
    }
  };

  const handleFishSubmit = async (event) => {
    event.preventDefault();
    
    const price = Number(fishForm.price);
    const costPrice = Number(fishForm.costPrice);
    const quantity = Number(fishForm.quantity);

    // Species: letters only (plus spaces, apostrophes, periods, hyphens), no digits.
    const species = String(fishForm.species || "").trim().replace(/\s+/g, " ");
    if (
      !/^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s'.\-]{0,99}$/.test(species)
    ) {
      setError(
        "Species can only contain letters, spaces, apostrophes, periods, and hyphens.",
      );
      return false;
    }

    if (
      ![price, costPrice, quantity].every(
        (value) => Number.isFinite(value) && value >= 1,
      )
    ) {
      setError("Price, cost price, and quantity must be at least 1.");
      return false;
    }

    try {
      const path = editingFishId ? `/fish/${editingFishId}` : "/fish";
      await apiRequest(path, {
        method: editingFishId ? "PATCH" : "POST",
        body: JSON.stringify({
          ...fishForm,
          species,
          photoUrl: String(fishForm.photoUrl || "").trim(),
          price,
          costPrice,
          quantity,
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
      return true;
    } catch (requestError) {
      setError(
        requestError.message ||
          "Price, cost price, and quantity must be at least 1.",
      );
      return false;
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
    const confirmation = await confirmOceanicAction({
      title: "Delete fish item?",
      text: "This action will remove the fish record from inventory.",
      confirmText: "Delete item",
      tone: "danger",
    });
    if (!confirmation) return;

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
    const confirmation = await confirmOceanicAction({
      title: "Delete tank?",
      text: "This will remove the selected tank and its stored data.",
      confirmText: "Delete tank",
      tone: "danger",
    });
    if (!confirmation) return;

    try {
      await apiRequest(`/store/tanks/${id}`, { method: "DELETE" });
      setMessage("Tank deleted successfully.");
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleAddNote = async (payload = {}) => {
    try {
      await apiRequest("/notes", {
        method: "POST",
        body: JSON.stringify({
          text: payload.text,
          visibility: payload.visibility || "public",
          isTask: Boolean(payload.isTask),
          taskStatus: payload.isTask
            ? payload.taskStatus || "pending"
            : "pending",
          dueDate: payload.isTask ? payload.dueDate || null : null,
          assignedTo: payload.isTask ? payload.assignedTo || null : null,
        }),
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
      if (requestError.code === "PAYROLL_ALREADY_EXISTS") {
        const confirmation = await confirmOceanicAction({
          title: "Payroll already exists for this period",
          text: `${requestError.message} Do you want to overwrite it with the new numbers?`,
          icon: "warning",
          confirmText: "Overwrite",
        });
        if (confirmation) {
          try {
            const retryData = await apiRequest("/payroll", {
              method: "POST",
              body: JSON.stringify({ ...payrollData, confirmOverwrite: true }),
            });
            setPayrollToast(retryData.message);
            await loadDashboardData();
          } catch (retryError) {
            setError(retryError.message);
          }
        }
        return;
      }
      setError(requestError.message);
    }
  };

  const handleDeletePayroll = async (id) => {
    const confirmation = await confirmOceanicAction({
      title: "Delete payroll record?",
      text: "This cannot be undone.",
      confirmText: "Delete",
      tone: "danger",
    });
    if (!confirmation) return;
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
      const data = await apiRequest(`/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setNotes((current) =>
        current.map((item) => (item._id === id ? data.note : item)),
      );
      setMessage("Note updated.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteNote = async (id) => {
    const confirmation = await confirmOceanicAction({
      title: "Delete announcement?",
      text: "This announcement will be removed immediately for everyone.",
      confirmText: "Delete announcement",
      tone: "danger",
    });
    if (!confirmation) return;

    try {
      await apiRequest(`/notes/${id}`, { method: "DELETE" });
      setNotes((current) => current.filter((item) => item._id !== id));
      setMessage("Note deleted.");
    } catch (requestError) {
      setError(requestError.message);
    }
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
      if (
        activePage !== "overview" &&
        activePage !== "settings" &&
        !data.features[activePage]
      )
        setActivePage("overview");
    } catch (requestError) {
      setWorkspaceError(requestError.message);
    } finally {
      setWorkspaceSaving(false);
    }
  };

  const renderActivePage = () => {
    if (
      activePage !== "overview" &&
      activePage !== "settings" &&
      !businessFeatures[activePage]
    ) {
      return (
        <OwnerOverview
          staff={staff}
          attendance={attendance}
          fish={fish}
          tanks={tanks}
          notes={notes}
          sales={sales}
          salesRange={salesRange}
          onSalesDateChange={(field, value) =>
            setSalesRange((previous) => ({ ...previous, [field]: value }))
          }
          onAddNote={handleAddNote}
          onRefresh={loadDashboardData}
        />
      );
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
            shiftAssignments={shiftAssignments}
            onSaveShiftAssignment={handleSaveShiftAssignment}
            onDeleteShiftAssignment={handleDeleteShiftAssignment}
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
        return (
          <Notes
            notes={notes}
            staff={staff}
            permissions={notePermissions}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
          />
        );
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
            tanks={tanks}
            staff={staff}
            user={user}
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
            owner={user}
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
            notes={notes}
            sales={sales}
            salesRange={salesRange}
            onSalesDateChange={(field, value) =>
              setSalesRange((previous) => ({ ...previous, [field]: value }))
            }
            onAddNote={handleAddNote}
            onRefresh={loadDashboardData}
          />
        );
    }
  };

  if (systemUnavailable)
    return (
      <SystemUnavailable onRetry={loadDashboardData} retrying={refreshing} />
    );

  if (initialLoading) return <LoadingOverlay label="Preparing your owner workspace" />;

  return (
    <main 
    className="owner-dashboard-main box-border flex h-[100dvh] min-h-0 w-full flex-col md:flex-row overflow-hidden  bg-[radial-gradient(circle_at_88%_12%,#0a5267_0%,#08465d_42%,#021a31_100%)] text-[#c9e1e5]"
    >
      <DashboardSidebar
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onClose={() => setSidebarOpen(false)}
        activePage={activePage}
        onNavigate={(page) => { setActivePage(page); setSidebarOpen(false); }}
        navigationLabel="Owner dashboard navigation"
        brandSubtitle="Owners workspace"
        refreshLabel="Refresh Fishonitory workspace"
        groups={[
          { items: [{ page: "overview", label: "Overview" }] },
          { title: "Team and payroll", items: [businessFeatures.attendance && { page: "attendance", label: "Attendance" }, businessFeatures.staff && { page: "staff", label: "Staff Management" }, businessFeatures.payroll && { page: "payroll", label: "Payroll" }].filter(Boolean) },
          { title: "Team announcements", items: businessFeatures.notes ? [{ page: "notes", label: "Announcement Board" }] : [] },
          { title: "Farm management", description: "Inventory and tank care", items: [businessFeatures.inventory && { page: "inventory", label: "Fish Inventory" }, businessFeatures.tanks && { page: "tanks", label: "Tank Management" }].filter(Boolean) },
          { title: "Sales and reports", description: "Sales and business performance", items: [businessFeatures.sales && { page: "sales", label: "Sales" }, businessFeatures.operations && { page: "operations", label: "Operations & Reports" }].filter(Boolean) },
          { title: "Workspace", description: "Account and business preferences", items: [{ page: "settings", label: "Settings" }] },
        ]}
        identity={{ avatar: user?.ownerName || user?.email || "O", title: user?.businessName || "Business account", subtitle: user?.ownerName || user?.email || "Business owner" }}
        onIdentityClick={() => { setActivePage("settings"); setSidebarOpen(false); }}
        onLogout={async () => {
          const result = await showOceanicLogoutConfirm(async () => {
            await logout();
            window.location.replace("/");
          });
          if (result.isConfirmed) {
            await logout();
            window.location.replace("/");
          }
        }}
      />
      <div className="owner-workspace flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardToast notice={toastNotice} />
        <DashboardHeader title="BUSINESS CONTROL CENTER" currentTime={currentTime} syncing={refreshing}>
<NotificationBell
              notes={notes}
              fish={fish}
              tanks={tanks}
              attendance={attendance}
              onNavigate={setActivePage}
              viewerRole="Owner"
              viewerId={user?.id}
            />
      </DashboardHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-5 lg:px-5 lg:py-8">
        <PlatformNoticeBanner notices={platformNotices} />
        {renderActivePage()}
        </div>
      </div>
      {workspaceSetupOpen && (
        <WorkspaceSetup
          features={businessFeatures}
          setFeatures={setBusinessFeatures}
          onSave={handleSaveWorkspace}
          saving={workspaceSaving}
          error={workspaceError}
        />
      )}
    </main>
  );
}

export default OwnerDashboard;