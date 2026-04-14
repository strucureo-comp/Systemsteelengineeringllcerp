export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-widest text-muted-foreground">404 - System Node Unreachable</h2>
            <p className="text-[13px] text-muted-foreground font-medium">The requested interface path could not be resolved.</p>
        </div>
    );
}
