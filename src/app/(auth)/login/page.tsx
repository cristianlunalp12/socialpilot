import { AuthForm } from "@/components/AuthForm";

export default async function Login({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  return <AuthForm mode="login" invite={(await searchParams).invite} />;
}
