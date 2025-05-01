import { useState } from "react";
import { Upload } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the platform preset type to match the database enum
type PlatformPreset = "Spotify" | "Apple Music" | "YouTube" | "SoundCloud";

export const UploadTrackDialog = () => {
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState<PlatformPreset | "">("");
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (selectedFile) {
      // Check file type (optional - can be expanded)
      const validTypes = ["audio/wav", "audio/x-aiff", "audio/mpeg", "audio/mp3"];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          variant: "destructive",
          title: "Oops! That's not quite right",
          description: "We can only work with WAV, AIFF, or MP3 files. Could you try again with one of these formats? 🎵",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !platform) {
      toast({
        variant: "destructive",
        title: "Almost there! 🎯",
        description: "Don't forget to pick both a track and where you want to share it",
      });
      return;
    }

    try {
      setIsUploading(true);

      // 1. Upload file to storage
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("User not authenticated");

      const userId = user.id;
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${timestamp}-original.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('audio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Create database record with properly typed platform preset
      const { error: dbError, data: trackData } = await supabase.from('audio_tracks').insert({
        user_id: userId,
        original_filename: file.name,
        storage_path_original: filePath,
        selected_platform_preset: platform as PlatformPreset,
      }).select().single();

      if (dbError) throw dbError;

      toast({
        title: "Great job! 🎉",
        description: "Your track is in our expert hands. We'll let you know as soon as it's ready to shine! ✨",
      });

      // Close dialog and reset form
      setIsOpen(false);
      setFile(null);
      setPlatform("");
      
      // 3. Trigger the mastering process
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error("Failed to get session");
      }
      
      if (!session?.access_token) {
        console.error("No access token in session");
        throw new Error("No access token available");
      }

      console.log("Calling audio-mastering function with token");
      const { error: processingError } = await supabase.functions.invoke('audio-mastering', {
        method: 'POST',
        body: { trackId: trackData.id },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      }).catch(error => {
        console.error("Function invocation error:", error);
        throw new Error(`Processing failed: ${error.message}`);
      });
      
      if (processingError) {
        console.error("Processing error:", processingError);
        throw new Error(`Processing failed: ${processingError.message}`);
      }

      // Add success toast
      toast({
        title: "Let's make it sound amazing! 🎚️",
        description: "We're working our magic on your track. This usually takes a few minutes - time for a quick coffee break? ☕",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Oops! Something went wrong 😅",
        description: error.message || "Don't worry, these things happen! Try uploading again or let us know if you need help.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-white text-black hover:bg-white/90">
          <Upload className="mr-2 h-4 w-4" /> Upload New Track
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-neutral-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Share Your Music with the World 🎵</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Upload your track and we'll make it sound amazing! For the best results, we recommend WAV or AIFF files. Let's make your music shine! ✨
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file" className="text-white">Your Track 🎸</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".wav,.aiff,.mp3"
              className="cursor-pointer bg-neutral-800 border-neutral-700 text-white"
            />
            {file && (
              <p className="text-sm text-neutral-400">
                Selected: {file.name}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="platform" className="text-white">Where Will You Share It? 🌟</Label>
            <Select 
              value={platform} 
              onValueChange={(value: PlatformPreset) => setPlatform(value)}
            >
              <SelectTrigger id="platform" className="bg-neutral-800 border-neutral-700 text-white">
                <SelectValue placeholder="Choose your platform" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                <SelectItem value="Spotify" className="text-white hover:bg-neutral-700">Spotify</SelectItem>
                <SelectItem value="Apple Music" className="text-white hover:bg-neutral-700">Apple Music</SelectItem>
                <SelectItem value="YouTube" className="text-white hover:bg-neutral-700">YouTube</SelectItem>
                <SelectItem value="SoundCloud" className="text-white hover:bg-neutral-700">SoundCloud</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleUpload}
            disabled={!file || !platform || isUploading}
            className={`bg-white text-black hover:bg-white/90 ${isUploading ? 'opacity-70' : ''}`}
          >
            {isUploading ? "Working Our Magic... ✨" : "Let's Make It Sound Amazing! 🎚️"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
