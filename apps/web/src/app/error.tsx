"use client";

export default function MagError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main className="mag-shell error-shell">
      <section className="empty-state" role="alert">
        <p>بارگذاری مطالب انجام نشد.</p>
        <button type="button" onClick={reset}>تلاش دوباره</button>
      </section>
    </main>
  );
}
