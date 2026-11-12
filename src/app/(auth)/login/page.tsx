import { AuthForm } from "@/components/AuthForm";
import { env } from "@/lib/env";

export default async function Login({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  return (
    <>
      {env.mockPlatforms && (
        <div className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
          <b>Demo:</b> demo@socialpilot.dev · demo12345
        </div>
      )}
      <AuthForm mode="login" invite={(await searchParams).invite} demo={env.mockPlatforms} />
    </>
  );
}
