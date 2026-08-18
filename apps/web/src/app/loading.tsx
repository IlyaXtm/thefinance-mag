export default function MagLoading() {
  return (
    <main className="mag-shell loading-shell" aria-busy="true" aria-label="در حال بارگذاری مگ">
      <div className="loading-heading">
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-search" />
      </div>
      <div className="loading-lead">
        <span className="skeleton skeleton-featured" />
        <div className="loading-secondary">
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </div>
      <div className="loading-chips">
        {Array.from({ length: 6 }, (_, index) => <span className="skeleton" key={index} />)}
      </div>
      <div className="loading-grid">
        {Array.from({ length: 6 }, (_, index) => <span className="skeleton" key={index} />)}
      </div>
    </main>
  );
}
