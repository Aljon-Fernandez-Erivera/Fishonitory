function DashboardWalkthrough({ title, steps, stepIndex, onPrevious, onNext, onFinish }) {
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#021a31]/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="walkthrough-title">
      <section className="w-full max-w-lg rounded-2xl border border-sky-100/15 bg-[#062d48] p-6 shadow-2xl sm:p-8">
        <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.16em] text-[#73c4ca]">{title} · Step {stepIndex + 1} of {steps.length}</p>
        <h1 id="walkthrough-title" className="mt-3 font-['Fraunces'] text-2xl font-medium text-[#d9ecef]">{step.title}</h1>
        <p className="mt-3 font-['Poppins'] text-sm leading-relaxed text-[#a8c9d0]">{step.description}</p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={onFinish} className="font-['Poppins'] text-sm text-[#8fb7be] transition hover:text-[#d9ecef]">Skip tutorial</button>
          <div className="flex gap-2">
            {stepIndex > 0 && <button type="button" onClick={onPrevious} className="rounded-full border border-sky-100/15 px-4 py-2 font-['Poppins'] text-sm text-[#c9e1e5] transition hover:bg-white/[.06]">Back</button>}
            <button type="button" onClick={isLastStep ? onFinish : onNext} className="rounded-full bg-[#75bec4] px-4 py-2 font-['Poppins'] text-sm font-medium text-[#052d45] transition hover:bg-[#86d0d6]">{isLastStep ? "Finish" : "Next"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardWalkthrough;
