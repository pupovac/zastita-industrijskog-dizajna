export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Došlo je do greške.';
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
