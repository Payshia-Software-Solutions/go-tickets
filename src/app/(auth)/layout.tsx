
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This layout can be used to wrap auth pages with a specific style or structure
  // For example, a centered container or a background image specific to auth.
  return (
    <div className="bg-muted/30">
      {children}
    </div>
  );
}
