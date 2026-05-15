'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Shield, ShieldCheck, Lock, Upload, X, Save, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/settings-api';
import { cn } from '@/lib/utils';

export default function ProfileSettingsPage() {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    const [ackTitle, setAckTitle] = useState('RECEIVER ACKNOWLEDGEMENT');
    const [ackSigLabel, setAckSigLabel] = useState('SIGNATURE / COMPANY STAMP');
    const [ackNameLabel, setAckNameLabel] = useState('NAME');

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            setSignatureUrl(user.signature_url || null);
            setAckTitle(user.acknowledgement_title || 'RECEIVER ACKNOWLEDGEMENT');
            setAckSigLabel(user.acknowledgement_signature_label || 'SIGNATURE / COMPANY STAMP');
            setAckNameLabel(user.acknowledgement_name_label || 'NAME');
        }
    }, [user]);

    const getInitials = (name: string) => {
        return name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '??';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setSignatureUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (password && password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const payload: any = {
                full_name: fullName,
                signature_url: signatureUrl,
                acknowledgement_title: ackTitle,
                acknowledgement_signature_label: ackSigLabel,
                acknowledgement_name_label: ackNameLabel
            };
            if (password) {
                payload.password = password;
            }

            await settingsApi.updateMyProfile(payload);
            await refreshUser();
            setPassword('');
            setConfirmPassword('');
            toast.success('Profile updated successfully');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
                <p className="text-muted-foreground">Manage your personal information, security, and digital signature.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Sidebar: Avatar & Summary */}
                <div className="space-y-6">
                    <Card className="overflow-hidden border-none shadow-md ring-1 ring-slate-200">
                        <CardContent className="pt-8 pb-6 flex flex-col items-center">
                            <div className="relative group">
                                <Avatar className="h-28 w-28 rounded-2xl border-4 border-white shadow-xl mb-4 ring-2 ring-primary/10 transition-transform group-hover:scale-[1.02]">
                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-4xl font-black rounded-2xl">
                                        {getInitials(fullName)}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">{fullName || 'System User'}</h3>
                            <p className="text-xs text-slate-500 mb-4">{user?.email}</p>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{user?.role}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm ring-1 ring-slate-200 bg-slate-50/50">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-700">Account Status</p>
                                    <p className="text-[10px] text-slate-500 uppercase">Verified & Active</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-700">Permissions</p>
                                    <p className="text-[10px] text-slate-500 uppercase">{user?.role} Access Level</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Content: Forms */}
                <div className="md:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <Card className="border-none shadow-sm ring-1 ring-slate-200">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                            <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                Identity Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        value={fullName} 
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="pl-10 h-11 border-slate-200 focus:ring-primary/20 focus:border-primary transition-all" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        value={user?.email || ''} 
                                        disabled 
                                        className="pl-10 h-11 border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed" 
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 italic">Email address cannot be changed by the user.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Digital Signature */}
                    <Card className="border-none shadow-sm ring-1 ring-slate-200">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                            <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                                <Lock className="h-4 w-4 text-primary" />
                                Approval E-Signature
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <p className="text-xs text-slate-500">
                                This signature will be applied to documents and approvals you authorize within the system.
                            </p>
                            
                            <div className="flex items-center gap-6">
                                <div className="h-32 w-64 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center overflow-hidden relative group">
                                    {signatureUrl ? (
                                        <>
                                            <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain p-4" />
                                            <button 
                                                onClick={() => setSignatureUrl(null)}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center space-y-2">
                                            <Upload className="h-6 w-6 text-slate-300 mx-auto" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Upload PNG/SVG</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-9 px-4 text-xs font-bold border-slate-200"
                                        onClick={() => document.getElementById('sig-upload')?.click()}
                                    >
                                        Change Signature
                                    </Button>
                                    <input 
                                        id="sig-upload" 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleFileChange} 
                                    />
                                    <p className="text-[10px] text-slate-400 max-w-[150px]">Recommended: Transparent background, 500x200px</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security */}
                    <Card className="border-none shadow-sm ring-1 ring-slate-200">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                            <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                Document Acknowledgement Labels
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <p className="text-[11px] text-slate-500">
                                Customize the labels for the receiver signature area on documents you authorize.
                            </p>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Section Title</Label>
                                    <Input 
                                        value={ackTitle} 
                                        onChange={(e) => setAckTitle(e.target.value)}
                                        className="h-10 border-slate-200 focus:ring-primary/20 transition-all" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Signature Area Label</Label>
                                        <Input 
                                            value={ackSigLabel} 
                                            onChange={(e) => setAckSigLabel(e.target.value)}
                                            className="h-10 border-slate-200 focus:ring-primary/20 transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Name Label</Label>
                                        <Input 
                                            value={ackNameLabel} 
                                            onChange={(e) => setAckNameLabel(e.target.value)}
                                            className="h-10 border-slate-200 focus:ring-primary/20 transition-all" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security */}
                    <Card className="border-none shadow-sm ring-1 ring-slate-200">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                            <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                                <KeyRound className="h-4 w-4 text-primary" />
                                Security Credentials
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-500">New Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input 
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="pl-10 h-11 border-slate-200 focus:ring-primary/20 transition-all" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-500">Confirm Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input 
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="pl-10 h-11 border-slate-200 focus:ring-primary/20 transition-all" 
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400">Leave blank if you don't want to change your password.</p>
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                        <Button 
                            onClick={handleSave} 
                            disabled={loading} 
                            className="h-12 px-10 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                        >
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Update My Profile
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
