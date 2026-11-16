import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-xl font-bold text-brand-700">SocialPilot</Link>
        <div className="card">{children}</div>
      </div>
    </main>
  );
}
