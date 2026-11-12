export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold text-brand-600">SocialPilot</div>
          <p className="mt-1 text-sm text-slate-500">Publica, mide y decide con datos</p>
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}
