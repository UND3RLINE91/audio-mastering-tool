import React, { useState } from "react"; // Import React and useState hook
import { Upload } from "lucide-react"; // Import Upload icon
import { toast } from "@/hooks/use-toast"; // Import custom toast hook
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client
import type { Database } from "@/integrations/supabase/types"; // Import Supabase types
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // Import Dialog components from shadcn/ui
import { Button } from "@/components/ui/button"; // Import Button component
import { Input } from "@/components/ui/input"; // Import Input component
import { Label } from "@/components/ui/label"; // Import Label component
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components

// Define the platform preset type to match the database enum
type PlatformPreset = "Spotify" | "Apple Music" | "YouTube" | "SoundCloud";

// Define the UploadTrackDialog component
export const UploadTrackDialog = () => {
  // State for the selected file
  const [file, setFile] = useState<File | null>(null);
  // State for the selected platform preset
  const [platform, setPlatform] = useState<PlatformPreset | "">("");
  // State to track if upload is in progress
  const [isUploading, setIsUploading] = useState(false);
  // State to control the dialog visibility
  const [isOpen, setIsOpen] = useState(false);

  // IMPORTANT: Get your Supabase Anon Key from environment variables.
  // Vite exposes environment variables prefixed with VITE_ to the client-side code.
  // Make sure VITE_SUPABASE_ANON_KEY is set in your .env file (e.g., .env.local) for local development
  // and in your Vercel project settings for deployment.
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Log an error if the key is missing during development/build time.
  if (!supabaseAnonKey) {
    console.error(
        "Supabase Anon Key is missing. Make sure VITE_SUPABASE_ANON_KEY is set in your environment variables (.env.local for dev, Vercel settings for production)."
    );
    // You could potentially disable the upload functionality or show a persistent error message
    // if the key is missing, as function calls will fail without it.
  }

  // Handler for file input changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (selectedFile) {
      // Define valid audio MIME types
      const validTypes = ["audio/wav", "audio/x-aiff", "audio/mpeg", "audio/mp3"];
      // Check if the selected file type is valid
      if (!validTypes.includes(selectedFile.type)) {
        // Show error toast if file type is invalid
        toast({
          variant: "destructive",
          title: "Oops! That's not quite right",
          description: "We can only work with WAV, AIFF, or MP3 files. Could you try again with one of these formats? 🎵",
        });
        setFile(null); // Clear the invalid file selection
        e.target.value = ''; // Reset the file input visually
        return; // Exit if file type is invalid
      }
      // Set the selected file in state
      setFile(selectedFile);
    } else {
      // Handle case where user cancels file selection
      setFile(null);
    }
  };

  // Handler for the upload process
  const handleUpload = async () => {
    // Check if the Supabase key is available before proceeding
    if (!supabaseAnonKey) {
       toast({
         variant: "destructive",
         title: "Configuration Error",
         description: "Application is missing configuration. Please contact support.",
       });
       console.error("Attempted upload without Supabase Anon Key.");
       return; // Stop the upload process
    }

    // Check if file and platform are selected
    if (!file || !platform) {
      toast({
        variant: "destructive",
        title: "Almost there! 🎯",
        description: "Don't forget to pick both a track and where you want to share it",
      });
      return; // Exit if file or platform is missing
    }

    try {
      // Set uploading state to true to disable button and show loading text
      setIsUploading(true);

      // --- Step 1: Upload file to Supabase storage ---
      const user = (await supabase.auth.getUser()).data.user; // Get current authenticated user
      if (!user) throw new Error("User not authenticated. Please log in again."); // Ensure user is logged in

      const userId = user.id; // Get user ID
      const timestamp = new Date().toISOString(); // Use ISO string for better sorting/uniqueness
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin'; // Get file extension safely
      // Construct the file path for storage: userId/timestamp-original.ext
      const filePath = `${userId}/${timestamp}-original.${fileExt}`;

      console.log(`Uploading file to storage at path: ${filePath}`);
      // Upload the file to the 'audio' bucket
      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(filePath, file);

      // Throw error if upload fails
      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }
      console.log("File uploaded successfully.");


      // --- Step 2: Create database record for the uploaded track ---
     console.log("Creating database record for track...");
      const { error: dbError, data: trackData } = await supabase
        .from('audio_tracks')
        .insert({
          user_id: userId,
          original_filename: file.name,
          storage_path_original: filePath,
          selected_platform_preset: platform as PlatformPreset, // Ensure platform type matches enum
            status: 'uploaded' // Set initial status
        })
        .select() // Select the inserted data
        .single(); // Expect a single row back

      // Throw error if database insert fails
      if (dbError) {
        console.error("Supabase database insert error:", dbError);
        // Attempt to clean up the uploaded file if DB insert fails
        console.log(`Attempting to delete orphaned file: ${filePath}`);
        await supabase.storage.from('audio').remove([filePath]);
        throw new Error(`Failed to save track details: ${dbError.message}`);
      }
      console.log("Database record created successfully:", trackData);

      // Show success toast for upload completion
      toast({
        title: "Great job! 🎉",
        description: "Your track is uploaded. Now starting the mastering process... ✨",
      });

      // Close dialog and reset form state *before* invoking the function
      // so the UI updates while processing starts in the background.
      setIsOpen(false);
      setFile(null);
      setPlatform("");
     // NOTE: We keep isUploading = true until the function invocation attempt finishes

      // --- Step 3: Trigger the mastering process function ---
      console.log(`Calling audio-mastering function for trackId: ${trackData.id}`);

     // Invoke the Supabase Edge Function 'audio-mastering'.
     // The `supabase-js` client automatically includes the Authorization header.
     // We manually add the 'apikey' header as it's required by the Supabase gateway for functions.
     // The 'body' is passed as a plain JavaScript object; the client handles stringification and Content-Type.
      const { error: processingError } = await supabase.functions.invoke('audio-mastering', {
        body: { trackId: trackData.id },
        headers: {
          'apikey': supabaseAnonKey // Pass the anon key obtained from environment variables
        }
      });
      
      // Check for errors returned *from* the function invocation itself
     // This catches network errors, function not found, or non-2xx status codes (like 4xx, 5xx) returned by the function.
      if (processingError) {
        console.error("Error invoking audio-mastering function:", processingError);
        // Update the track status to 'error' in the database since processing failed to start
        await supabase
          .from('audio_tracks')
          .update({ status: 'error', error_message: `Failed to start processing: ${processingError.message}` })
          .eq('id', trackData.id);
        // Throw an error to be caught by the outer catch block and shown to the user
        throw new Error(`Failed to start processing: ${processingError.message}`);
      }

      // Show toast indicating processing has started successfully
     // (The function itself might still encounter errors later, but the call was successful)
      toast({
        title: "Let's make it sound amazing! 🎚️",
        description: "We're working our magic on your track. This usually takes a few minutes - time for a quick coffee break? ☕",
      });

    } catch (error: any) { // Catch errors from upload, db insert, or function invocation
      console.error("Upload or Processing Trigger Error:", error);
      toast({
        variant: "destructive",
        title: "Oops! Something went wrong 😅",
        // Display the specific error message caught
        description: error.message || "An unexpected error occurred during upload or processing initiation. Please try again.",
      });
    } finally {
      // Reset uploading state regardless of success or failure
      setIsUploading(false);
    }
  };

  // Render the Dialog component
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Dialog trigger button */}
      <DialogTrigger asChild>
        <Button className="bg-white text-black hover:bg-white/90">
          <Upload className="mr-2 h-4 w-4" /> Upload New Track
        </Button>
      </DialogTrigger>
      {/* Dialog content */}
      <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-neutral-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Share Your Music with the World 🎵</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Upload your track and we'll make it sound amazing! For the best results, we recommend WAV or AIFF files. Let's make your music shine! ✨
          </DialogDescription>
        </DialogHeader>
        {/* Form fields */}
        <div className="grid gap-4 py-4">
          {/* File input */}
          <div className="grid gap-2">
            <Label htmlFor="file" className="text-white">Your Track 🎸</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".wav,.aiff,.mp3" // Specify accepted file types
              className="cursor-pointer bg-neutral-800 border-neutral-700 text-white file:text-neutral-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neutral-700 hover:file:bg-neutral-600"
            />
            {/* Display selected file name */}
            {file && (
              <p className="text-sm text-neutral-400">
                Selected: {file.name}
              </p>
            )}
          </div>
          {/* Platform select */}
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
                {/* Platform options */}
                <SelectItem value="Spotify" className="text-white focus:bg-neutral-700">Spotify</SelectItem>
                <SelectItem value="Apple Music" className="text-white focus:bg-neutral-700">Apple Music</SelectItem>
                <SelectItem value="YouTube" className="text-white focus:bg-neutral-700">YouTube</SelectItem>
                <SelectItem value="SoundCloud" className="text-white focus:bg-neutral-700">SoundCloud</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Dialog footer with upload button */}
        <DialogFooter>
          <Button
            onClick={handleUpload}
            disabled={!file || !platform || isUploading || !supabaseAnonKey} // Disable if no file/platform or uploading or key missing
            className={`bg-white text-black hover:bg-white/90 ${isUploading || !supabaseAnonKey ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {/* Show different text based on uploading state */}
            {isUploading ? "Working Our Magic... ✨" : "Let's Make It Sound Amazing! 🎚️"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
