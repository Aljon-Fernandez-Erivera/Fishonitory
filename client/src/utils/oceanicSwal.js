import Swal from "sweetalert2";

const sharedPopupClass = {
  popup: "oceanic-swal-popup",
  title: "oceanic-swal-title",
  htmlContainer: "oceanic-swal-text",
  confirmButton: "oceanic-swal-confirm",
  cancelButton: "oceanic-swal-cancel",
  footer: "oceanic-swal-footer",
  icon: "oceanic-swal-icon",
  actions: "oceanic-swal-actions",
};

export function applyOceanicSwalTheme() {
  const defaultOptions = {
    confirmButtonColor: "#75bec4",
    cancelButtonColor: "#0b2e42",
    denyButtonColor: "#1d4b68",
    background: "#062d48",
    color: "#dff6f9",
    borderRadius: "20px",
    backdrop: true,
    customClass: sharedPopupClass,
    buttonsStyling: false,
    showClass: {
      popup: "animate__animated animate__fadeInUp",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOutDown",
    },
  };

  if (typeof Swal.setDefaults === "function") {
    Swal.setDefaults(defaultOptions);
    return;
  }

  if (typeof Swal.setOptions === "function") {
    Swal.setOptions(defaultOptions);
    return;
  }

  if (typeof Swal.mixin === "function") {
    Swal.mixin(defaultOptions);
  }
}

export function confirmOceanicAction(options = {}) {
  const { title = "Are you sure?", text = "This action cannot be undone.", confirmButtonText = "Continue", cancelButtonText = "Cancel", icon = "warning" } = options;

  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    background: "#062d48",
    color: "#dff6f9",
    confirmButtonColor: "#75bec4",
    cancelButtonColor: "#102f46",
    customClass: sharedPopupClass,
    buttonsStyling: false,
    reverseButtons: true,
  });
}

export function showOceanicLogoutConfirm(onConfirmed) {
  let timerId = null;

  return Swal.fire({
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
    background: "#062d48",
    color: "#dff6f9",
    confirmButtonColor: "#75bec4",
    cancelButtonColor: "#102f46",
    customClass: {
      ...sharedPopupClass,
      popup: "oceanic-swal-popup oceanic-swal-logout",
    },
    buttonsStyling: false,
    reverseButtons: true,
    allowOutsideClick: false,
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
          if (typeof onConfirmed === "function") {
            onConfirmed();
          }
        }
      }, 1000);
    },
    willClose: () => {
      if (timerId) window.clearInterval(timerId);
    },
  });
}

applyOceanicSwalTheme();
