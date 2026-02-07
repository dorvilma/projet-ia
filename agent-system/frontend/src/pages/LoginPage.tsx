import { useState } from 'react';
import { useLogin, useRegister } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const navigate = useNavigate();
  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegisterMode) {
        await registerMutation.mutateAsync({ email, password, name });
      } else {
        await loginMutation.mutateAsync({ email, password });
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border shadow-sm">
        <h1 className="text-2xl font-bold text-center">
          {isRegisterMode ? 'Create Account' : 'Sign In'}
        </h1>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <input
              type="text" placeholder="Name" value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
              required
            />
          )}
          <input
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            required
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            required minLength={8}
          />
          <button
            type="submit" disabled={isLoading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : isRegisterMode ? 'Register' : 'Sign In'}
          </button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-primary hover:underline">
            {isRegisterMode ? 'Sign In' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}
