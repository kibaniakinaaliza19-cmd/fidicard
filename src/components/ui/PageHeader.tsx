export default function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="px-8 pb-6 pt-8">
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
        {title}
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
        {subtitle}
      </p>
    </header>
  );
}
