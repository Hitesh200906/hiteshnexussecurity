import { Link, useLocation } from "wouter";
import { useGetStatus, useAdminCheck, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { data: status } = useGetStatus();
  const { data: adminCheck } = useAdminCheck({ query: { enabled: !!status?.loggedIn, queryKey: ["admin-check"] } });
  const logout = useLogout();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await logout.mutateAsync(undefined);
    queryClient.clear();
    setLocation("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b-2 border-b-primary/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
          <Shield className="w-6 h-6" />
          <span className="brand-text font-bold text-xl tracking-wider">NEXUS SECURITY</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Home</Link>
          {status?.loggedIn ? (
            <>
              <Link href="/profile" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Dashboard</Link>
              {adminCheck?.isAdmin && (
                <Link href="/admin" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Admin Panel</Link>
              )}
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="transform -skew-x-12 border-primary/50 text-foreground hover:bg-primary/20"
              >
                <div className="transform skew-x-12">Log Out</div>
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button className="transform -skew-x-12 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
                <div className="transform skew-x-12 font-bold tracking-wide">ACCESS SYSTEM</div>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
