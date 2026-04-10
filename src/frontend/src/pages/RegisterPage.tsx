import RegisterForm from '@/components/auth/RegisterForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function RegisterPage() {
  useDocumentTitle('Create Account');
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">StockPredictor</h1>
          <p className="text-sm text-muted-foreground">Create an account</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
