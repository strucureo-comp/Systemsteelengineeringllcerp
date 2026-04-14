'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { confirmPasswordReset } = useAuth();
    
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const tokenParam = searchParams.get('token');
        if (tokenParam) {
            setToken(tokenParam);
        } else {
            setError('Invalid reset link. Please request a new password reset.');
        }
    }, [searchParams]);

    // Password strength calculation
    const calculatePasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 25;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 25;
        return strength;
    };

    const passwordStrength = calculatePasswordStrength(newPassword);
    const getStrengthColor = () => {
        if (passwordStrength < 50) return 'bg-red-500';
        if (passwordStrength < 75) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStrengthLabel = () => {
        if (passwordStrength < 50) return 'Weak';
        if (passwordStrength < 75) return 'Medium';
        return 'Strong';
    };

    const passwordRequirements = [
        { label: 'At least 8 characters', met: newPassword.length >= 8 },
        { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
        { label: 'One number', met: /[0-9]/.test(newPassword) },
        { label: 'One special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Invalid reset token');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (passwordStrength < 100) {
            setError('Password does not meet all requirements');
            return;
        }

        setLoading(true);

        const result = await confirmPasswordReset(token, newPassword);

        if (result.error) {
            setError(result.error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            toast.success('Password reset successfully!');
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        }
    };

    if (success) {
        return (
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Password Reset Successful</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 dark:text-green-200">
                            Your password has been reset successfully. Redirecting to login...
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
                <CardDescription>
                    Choose a strong password for your account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="newPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="pl-10 pr-10"
                                required
                                disabled={loading || !token}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        {newPassword && (
                            <div className="space-y-2 mt-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Password strength:</span>
                                    <span className={`font-medium ${passwordStrength === 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {getStrengthLabel()}
                                    </span>
                                </div>
                                <Progress value={passwordStrength} className={`h-2 ${getStrengthColor()}`} />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="pl-10"
                                required
                                disabled={loading || !token}
                            />
                        </div>
                    </div>

                    {newPassword && (
                        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground">Password requirements:</p>
                            <ul className="space-y-1">
                                {passwordRequirements.map((req, index) => (
                                    <li key={index} className="flex items-center gap-2 text-xs">
                                        {req.met ? (
                                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                                        ) : (
                                            <XCircle className="h-3 w-3 text-muted-foreground" />
                                        )}
                                        <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                                            {req.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading || !token || passwordStrength < 100}>
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </Button>

                    <div className="text-center text-sm text-muted-foreground">
                        <Link href="/login" className="text-primary hover:underline font-medium">
                            Back to Login
                        </Link>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
            <Suspense fallback={
                <Card className="w-full max-w-md shadow-xl">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    </CardContent>
                </Card>
            }>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
