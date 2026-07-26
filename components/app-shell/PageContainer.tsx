export function PageContainer({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description?: string;
  children?: React.ReactNode;
}>) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-zinc-600 sm:text-base">{description}</p>
        ) : null}
      </header>
      {children}
    </main>
  );
}
