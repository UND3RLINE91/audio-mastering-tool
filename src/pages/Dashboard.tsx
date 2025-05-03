import { Button } from "@/components/ui/button";
import { WelcomeSection } from "@/components/WelcomeSection";
import { AudioTracksList } from "@/components/AudioTracksList";
import { UploadTrackDialog } from "@/components/UploadTrackDialog";
import { UserCredits } from "@/components/UserCredits";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { UserSettings } from "@/components/UserSettings";
import { SubscriptionManager } from "@/components/SubscriptionManager";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-neutral-800 sticky top-0 bg-black/80 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded bg-white text-black flex items-center justify-center font-bold text-xl mr-3">
                  AE
                </div>
                <h1 className="text-xl font-semibold">AE's Audio Master Tool</h1>
              </div>
              <UserCredits />
            </div>
            <div className="flex items-center space-x-2">
              <SubscriptionManager />
              <UserSettings />
              <Button onClick={handleSignOut} variant="ghost" className="text-white hover:bg-white/10">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <WelcomeSection />
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Your Audio Tracks</h2>
            <UploadTrackDialog />
          </div>
          <AudioTracksList />
        </div>
      </main>
      <footer className="mt-auto py-6 border-t border-neutral-800 text-center text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} AE Contracting. (Artificial Entity Contracting) - Professional Audio Mastering Services</p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
