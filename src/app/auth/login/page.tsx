import { AuthForm } from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>
      <AuthForm type="login" />
    </div>
  );
}
