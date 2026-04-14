'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Lock, ArrowRight, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function VendorLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            toast.success('Logged into Vendor Portal');
            router.push('/vendor/dashboard');
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-primary/20 mb-6">
                        <Store className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Supplier Gateway</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">BridgeBreak ERP Cloud</p>
                </div>

                <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-8">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Lock className="h-5 w-5 text-primary" /> Vendor Access
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs font-medium mt-1">
                            Enter your credentials to manage orders and invoices.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Portal ID / Email</Label>
                                <Input 
                                    type="text" 
                                    placeholder="vendor@company.com" 
                                    className="h-12 rounded-xl border-2 border-slate-100 focus:border-primary transition-all font-bold"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Access Key</Label>
                                    <button type="button" className="text-[9px] font-black text-primary uppercase hover:underline">Forgot Key?</button>
                                </div>
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    className="h-12 rounded-xl border-2 border-slate-100 focus:border-primary transition-all font-bold"
                                    required
                                />
                            </div>
                            <Button 
                                type="submit" 
                                disabled={loading}
                                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[11px] tracking-[0.1em] shadow-lg shadow-primary/20"
                            >
                                {loading ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                                Authenticate Profile
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Authorized Personnel Only • IP Logged
                </p>
            </div>
        </div>
    );
}
