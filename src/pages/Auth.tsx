
import { AuthForm } from "@/components/auth/AuthForm";

const Auth = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="p-8 rounded-lg w-full max-w-md space-y-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Welcome to AE's Audio Master Tool!
        </h1>
        <AuthForm />
      </div>
    </div>
  );
};

export default Auth;
