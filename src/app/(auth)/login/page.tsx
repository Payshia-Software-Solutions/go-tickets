
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';
import type { Metadata } from 'next';

// Metadata for client components is tricky. This won't be used by Next.js directly here.
// Consider setting title via useEffect or in a parent server component/layout.
// export const metadata: Metadata = {
//   title: 'Login - MyPass.lk',
//   description: 'Log in to your MyPass.lk account to access your bookings and manage your profile.',
//   robots: {
//     index: false, // Usually no need to index login pages
//     follow: true,
//   },
// };

const LoginPage = () => {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useState(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Login | MyPass.lk';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(email, password);
    if (success) {
      toast({ title: "Login Successful", description: "Welcome back!" });
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      router.push(redirectUrl);
    } else {
      toast({ title: "Login Failed", description: "Invalid email or password.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-15rem)] py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <LogIn className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle className="text-2xl font-bold font-headline">Welcome Back!</CardTitle>
          <CardDescription>Log in to access your account and bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
            <Link href="#" className="text-sm text-primary hover:underline">
                Forgot your password?
            </Link>
           <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href={`/signup${searchParams.get('redirect') ? `?redirect=${searchParams.get('redirect')}`: ''}`} className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
