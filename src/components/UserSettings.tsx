
import { useState } from "react";
import { Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type UserPreferences = {
  defaultPlatform: string;
  receiveNotifications: boolean;
  highQualityPreviews: boolean;
};

export const UserSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultPlatform: "Spotify",
    receiveNotifications: true,
    highQualityPreviews: false
  });
  
  const [isSaving, setIsSaving] = useState(false);

  const { data: fetchedPreferences } = useQuery({
    queryKey: ['userPreferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching preferences:', error);
        return null;
      }
      
      // Parse the preferences JSON data properly
      const userPrefs = data?.preferences as Record<string, any> | null;
      
      const prefs: UserPreferences = {
        defaultPlatform: userPrefs?.defaultPlatform || "Spotify",
        receiveNotifications: userPrefs?.receiveNotifications ?? true,
        highQualityPreviews: userPrefs?.highQualityPreviews ?? false
      };
      
      setPreferences(prefs);
      
      return prefs;
    },
    enabled: !!user && isOpen
  });

  const handleSavePreferences = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['userPreferences', user.id] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', user.id] });
      
      toast({
        title: "Preferences saved",
        description: "Your settings have been updated successfully."
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        variant: "destructive",
        title: "Failed to save preferences",
        description: error instanceof Error ? error.message : "Please try again later."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-white hover:bg-white/10">
          <Settings className="h-5 w-5 mr-2" />
          <span>Settings</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">User Settings</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Configure your preferences for AE's Audio Master Tool
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="defaultPlatform">Default Platform</Label>
            <Select 
              value={preferences.defaultPlatform} 
              onValueChange={(value) => setPreferences(prev => ({ ...prev, defaultPlatform: value }))}
            >
              <SelectTrigger id="defaultPlatform" className="bg-neutral-800 border-neutral-700 text-white">
                <SelectValue placeholder="Select a default platform" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                <SelectItem value="Spotify">Spotify</SelectItem>
                <SelectItem value="Apple Music">Apple Music</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
                <SelectItem value="SoundCloud">SoundCloud</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-neutral-400">
              This platform will be pre-selected when uploading new tracks
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Notifications</Label>
              <p className="text-sm text-neutral-400">
                Receive email notifications when mastering is complete
              </p>
            </div>
            <Switch 
              id="notifications" 
              checked={preferences.receiveNotifications} 
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, receiveNotifications: checked }))} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="highQuality">High Quality Previews</Label>
              <p className="text-sm text-neutral-400">
                Use higher quality previews (uses more bandwidth)
              </p>
            </div>
            <Switch 
              id="highQuality" 
              checked={preferences.highQualityPreviews} 
              onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, highQualityPreviews: checked }))} 
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={() => setIsOpen(false)} 
            className="text-neutral-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSavePreferences} 
            disabled={isSaving}
            className="bg-white text-black hover:bg-white/90"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
