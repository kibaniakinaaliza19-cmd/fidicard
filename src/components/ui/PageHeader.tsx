export default function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    /* Même gouttière que le contenu des pages : 32 px de marge sur un écran
       de 390 px laissaient au titre moins de largeur qu'aux cartes qu'il
       surplombe, et le décalage se voyait. */
    <header className="px-4 pb-6 pt-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
        {title}
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
        {subtitle}
      </p>
    </header>
  );
}
