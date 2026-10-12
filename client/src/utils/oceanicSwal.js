import Swal from "sweetalert2";

const baseCustomClass = {
  container: "oceanic-modal-backdrop",
  popup: "oceanic-swal-popup",
  title: "oceanic-swal-title",
  htmlContainer: "oceanic-swal-text",
  inputLabel: "oceanic-swal-input-label",
  validationMessage: "oceanic-swal-validation",
  closeButton: "oceanic-swal-close",
  actions: "oceanic-swal-actions",
  confirmButton: "oceanic-swal-btn oceanic-swal-btn--confirm",
  cancelButton: "oceanic-swal-btn oceanic-swal-btn--cancel",
  input: "oceanic-swal-input",
  footer: "oceanic-swal-footer",
  icon: "oceanic-swal-icon",
};

const baseConfig = {
  background: "#062d48",
  color: "#dff6f9",
  buttonsStyling: false,
  reverseButtons: true,
  allowOutsideClick: false,
  backdrop: true,
  customClass: baseCustomClass,
  showClass: { popup: "animate__animated animate__fadeInUp" },
  hideClass: { popup: "animate__animated animate__fadeOutDown" },
};

const toneClasses = {
  default: "oceanic-swal-btn oceanic-swal-btn--confirm",
  success: "oceanic-swal-btn oceanic-swal-btn--confirm oceanic-swal-btn--success",
  danger: "oceanic-swal-btn oceanic-swal-btn--confirm oceanic-swal-btn--danger",
};

export function oceanicFire(options = {}, tone = "default") {
  const selectedTone = toneClasses[tone] ? tone : "default";
  return Swal.fire({
    ...baseConfig,
    ...options,
    customClass: {
      ...baseCustomClass,
      ...(options.customClass || {}),
      confirmButton:
        options.customClass?.confirmButton || toneClasses[selectedTone],
    },
  });
}

export async function confirmOceanicAction({
  title = "Are you sure?",
  text = "This action cannot be undone.",
  icon = "warning",
  confirmText = "Continue",
  cancelText = "Cancel",
  tone = "default",
} = {}) {
  const result = await oceanicFire(
    {
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
    },
    tone,
  );
  return result.isConfirmed;
}

export function oceanicNotice(title, text = "", icon = "info", options = {}) {
  const { tone = "default", ...noticeOptions } = options;
  return oceanicFire({
    title,
    text,
    icon,
    showConfirmButton: true,
    confirmButtonText: "OK",
    ...noticeOptions,
  }, tone);
}

export function showOceanicLogoutConfirm(onConfirmed) {
  let timerId = null;

  return oceanicFire({
    title: "Log out",
    html: `
      <div class="space-y-2 text-center">
        <p class="oceanic-swal-text">You’ll need to sign in again to continue.</p>
        <div class="oceanic-swal-countdown">Auto-logout in 5s</div>
      </div>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Log out now",
    cancelButtonText: "Stay signed in",
    customClass: {
      popup: "oceanic-swal-popup oceanic-swal-logout",
    },
    didOpen: () => {
      const countdownEl = Swal.getPopup()?.querySelector(".oceanic-swal-countdown");
      if (!countdownEl) return;

      let remaining = 5;
      countdownEl.textContent = `Auto-logout in ${remaining}s`;
      timerId = window.setInterval(() => {
        remaining -= 1;
        countdownEl.textContent = `Auto-logout in ${remaining}s`;
        if (remaining <= 0) {
          window.clearInterval(timerId);
          Swal.close();
          if (typeof onConfirmed === "function") onConfirmed();
        }
      }, 1000);
    },
    willClose: () => {
      if (timerId) window.clearInterval(timerId);
    },
  });
}
