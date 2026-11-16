import { Backdrop, GradientText, Logo } from "@/components/Brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ui-dark relative flex min-h-screen items-center justify-center bg-[#0a0911] p-4">
      <Backdrop />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <p className="mt-3 text-sm text-slate-500">
            Tu negocio presente en redes, <GradientText>todos los días</GradientText>
          </p>
        </div>
        <div className="card border-violet-300/20 p-6 shadow-[0_0_80px_-20px_rgba(139,92,246,0.35)]">{children}</div>
      </div>
    </div>
  );
}
