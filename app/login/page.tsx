'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Shield, Mail, Lock, User } from 'lucide-react';

export default function LoginPage() {
    const { signIn, signUp } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Login form
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Signup form
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupConfirm, setSignupConfirm] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error } = await signIn(loginEmail, loginPassword);
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // Wait for auth state to update before redirecting
            setTimeout(() => {
                router.push('/admin/dashboard');
            }, 200);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (signupPassword !== signupConfirm) {
            setError('Passwords do not match');
            return;
        }

        if (signupPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        const { error } = await signUp(signupEmail, signupPassword, signupName);
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push('/admin/dashboard');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
            <div className="w-full max-w-md">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                        <Shield className="h-7 w-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">BridgeBreak ERP</h1>
                    <p className="text-sm text-muted-foreground mt-1">Enterprise Resource Planning System</p>
                </div>

                <Card className="border-border shadow-xl">
                    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(''); }}>
                        <CardHeader className="pb-4">
                            <TabsList className="w-full">
                                <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
                                <TabsTrigger value="signup" className="flex-1">Sign Up</TabsTrigger>
                            </TabsList>
                        </CardHeader>

                        <CardContent>
                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            {/* LOGIN TAB */}
                            <TabsContent value="login" className="mt-0">
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="login-email" className="text-xs font-medium">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="login-email"
                                                type="email"
                                                placeholder="admin@bridgebreak.ae"
                                                value={loginEmail}
                                                onChange={(e) => setLoginEmail(e.target.value)}
                                                className="pl-10 h-11"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="login-password" className="text-xs font-medium">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="login-password"
                                                type="password"
                                                placeholder="••••••••"
                                                value={loginPassword}
                                                onChange={(e) => setLoginPassword(e.target.value)}
                                                className="pl-10 h-11"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        Sign In
                                    </Button>
                                    <div className="text-center">
                                        <a href="/forgot-password" className="text-sm text-primary hover:underline">
                                            Forgot password?
                                        </a>
                                    </div>
                                </form>
                            </TabsContent>

                            {/* SIGNUP TAB */}
                            <TabsContent value="signup" className="mt-0">
                                <form onSubmit={handleSignup} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-name" className="text-xs font-medium">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-name"
                                                type="text"
                                                placeholder="John Doe"
                                                value={signupName}
                                                onChange={(e) => setSignupName(e.target.value)}
                                                className="pl-10 h-11"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-email" className="text-xs font-medium">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-email"
                                                type="email"
                                                placeholder="you@company.com"
                                                value={signupEmail}
                                                onChange={(e) => setSignupEmail(e.target.value)}
                                                className="pl-10 h-11"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-password" className="text-xs font-medium">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-password"
                                                type="password"
                                                placeholder="Min 6 characters"
                                                value={signupPassword}
                                                onChange={(e) => setSignupPassword(e.target.value)}
                                                className="pl-10 h-11"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-confirm" className="text-xs font-medium">Confirm Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-confirm"
                                                type="password"
                                                placeholder="Re-enter password"
                                                value={signupConfirm}
                                                onChange={(e) => setSignupConfirm(e.target.value)}
                                                className="pl-10 h-11"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        Create Account
                                    </Button>
                                </form>
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                </Card>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    &copy; {new Date().getFullYear()} BridgeBreak ERP &bull; Strucureo Technologies
                </p>
            </div>
        </div>
    );
}
