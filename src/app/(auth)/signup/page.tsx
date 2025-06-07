
"use client";

import { useState, useEffect, Suspense } from 'react'; // Added Suspense
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react'; // Added Loader2
import type { Metadata } from 'next';

// Metadata for client components is tricky. This won't be used by Next.js directly here.
// export const metadata: Metadata = {
//   title: 'Sign Up - MyPass.lk',
//   description: 'Create an account on MyPass.lk to start booking tickets for your favorite events.',
//   robots: {
//     index: false, // Usually no need to index signup pages
//     follow: true,
//   },
// };

const SignupFormContent = () => {
  const { signup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams(); // This is now inside the Suspense boundary
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Signup Failed", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const success = await signup(name, email, password);
    if (success) {
      toast({ title: "Signup Successful", description: "Welcome! Your account has been created." });
      const redirectUrl = searchParams.get('redirect') || '/account_dashboard';
      router.push(redirectUrl);
    } else {
      toast({ title: "Signup Failed", description: "This email may already be in use or an error occurred.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <UserPlus className="mx-auto h-10 w-10 text-primary mb-2" />
        <CardTitle className="text-2xl font-bold font-headline">Create an Account</CardTitle>
        <CardDescription>Join MyPass.lk to start booking tickets.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href={`/login${searchParams.get('redirect') ? `?redirect=${searchParams.get('redirect')}`: ''}`} className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};


const SignupPage = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Sign Up | MyPass.lk';
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-15rem)] py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading signup form...</p>
        </div>
      }>
        <SignupFormContent />
      </Suspense>
    </div>
  );
};

export default SignupPage;
