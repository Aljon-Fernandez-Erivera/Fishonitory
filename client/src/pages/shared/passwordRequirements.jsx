const RULES = [
  { label: "At least 1 symbol (@,#,!)", test: (value) => /[@, # ,!]/.test(value)},
  { label: "At least 8 characters", test: (value) => value.length >= 8 },
  { label: "At least one letter", test: (value) => /[a-zA-Z]/.test(value) },
  { label: "At least one number", test: (value) => /[0-9]/.test(value) },
];

function PasswordRequirements({ password }) {
  const value = password || "";
  if (!value) return null;

  return (
    <ul className="mt-2 grid gap-1 font-['Poppins'] text-[11px]">
      {RULES.map((rule) => {
        const passed = rule.test(value);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 transition-colors ${
              passed ? "text-emerald-300" : "text-[#8fb0b8]"
            }`}
          >
            <span aria-hidden="true">{passed ? "✓" : "○"}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export default PasswordRequirements;