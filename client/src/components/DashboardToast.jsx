export default function DashboardToast({ notice }) {
  if (!notice?.title) return null;

  const isError = notice.type === "error";

  return (
    <div
      className={`app-notification-toast app-notification-toast--${isError ? "error" : "success"}`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <span className="app-notification-toast__icon" aria-hidden="true">
        {isError ? "!" : "\u2713"}
      </span>
      <span>{notice.title}</span>
    </div>
  );
}
