import { AuthForm } from "@/components/AuthForm";

export default async function Register({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  return <AuthForm mode="register" invite={(await searchParams).invite} />;
}
