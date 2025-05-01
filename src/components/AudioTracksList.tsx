
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Progress } from "@/components/ui/progress";
import { ArrowDownToLine, Play, Loader, Trash } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth/AuthProvider";

type AudioTrack = Database['public']['Tables']['audio_tracks']['Row'];

export const AudioTracksList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [trackToDelete, setTrackToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: tracks, isLoading, refetch } = useQuery({
    queryKey: ['audioTracks'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('audio_tracks')
        .select('*')
        .order('upload_timestamp', { ascending: false });
      
      if (error) throw error;
      return data as AudioTrack[];
    },
    refetchInterval: (query) => {
      // Refetch data more frequently if any tracks are processing
      const data = query.state.data;
      if (data && Array.isArray(data) && data.some(track => track.status === "processing")) {
        return 3000; // 3 seconds
      }
      return 10000; // 10 seconds
    },
    enabled: !!user
  });

  const handleDeleteTrack = async (trackId: string) => {
    try {
      setIsDeleting(true);
      
      // Get track info to know which files to delete
      const { data: track, error: fetchError } = await supabase
        .from('audio_tracks')
        .select('storage_path_original, storage_path_mastered, storage_path_preview')
        .eq('id', trackId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete files from storage
      const filesToDelete = [
        track.storage_path_original,
        track.storage_path_mastered,
        track.storage_path_preview
      ].filter(Boolean);
      
      // Delete each file from storage
      for (const filePath of filesToDelete) {
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('audio')
            .remove([filePath]);
            
          if (storageError) console.error(`Error deleting file ${filePath}:`, storageError);
        }
      }
      
      // Delete track record from database
      const { error: deleteError } = await supabase
        .from('audio_tracks')
        .delete()
        .eq('id', trackId);
        
      if (deleteError) throw deleteError;
      
      // Refresh the tracks list
      queryClient.invalidateQueries({ queryKey: ['audioTracks'] });
      
      toast({
        title: "Track deleted",
        description: "The audio track has been removed successfully."
      });
    } catch (error) {
      console.error("Error deleting track:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "There was a problem deleting this track. Please try again."
      });
    } finally {
      setIsDeleting(false);
      setTrackToDelete(null);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "uploaded":
        return (
          <span className="flex items-center text-blue-400">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            Uploaded
          </span>
        );
      case "processing":
        return (
          <div className="space-y-2">
            <span className="flex items-center text-amber-400">
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Processing
            </span>
            <Progress value={66} className="h-1 bg-neutral-800" />
          </div>
        );
      case "mastered":
        return (
          <span className="flex items-center text-green-400">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Complete
          </span>
        );
      case "error":
        return (
          <span className="flex items-center text-red-400">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            Error
          </span>
        );
      default:
        return status;
    }
  };

  const downloadMasteredFile = async (track: AudioTrack) => {
    if (!track.storage_path_mastered) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('audio')
        .download(track.storage_path_mastered);
        
      if (error) {
        console.error("Download error:", error);
        throw error;
      }
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.original_filename.split('.')[0]}-mastered.mp3`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "There was a problem downloading the file. Please try again."
      });
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border border-neutral-800 bg-neutral-900">
        <div className="p-4">
          <Skeleton className="h-8 w-full bg-neutral-800 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-5 gap-4">
                <Skeleton className="h-8 bg-neutral-800" />
                <Skeleton className="h-8 bg-neutral-800" />
                <Skeleton className="h-8 bg-neutral-800" />
                <Skeleton className="h-8 bg-neutral-800" />
                <Skeleton className="h-8 bg-neutral-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tracks?.length) {
    return (
      <div className="text-center py-12 text-neutral-400 border border-neutral-800 rounded-md bg-neutral-900/50">
        No audio tracks uploaded yet
      </div>
    );
  }

  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900/50 overflow-hidden backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-neutral-800 hover:bg-neutral-900/80">
            <TableHead className="text-neutral-400">File Name</TableHead>
            <TableHead className="text-neutral-400">Platform</TableHead>
            <TableHead className="text-neutral-400">Status</TableHead>
            <TableHead className="text-neutral-400">Preview / Download</TableHead>
            <TableHead className="text-neutral-400 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tracks.map((track) => (
            <TableRow 
              key={track.id}
              className={`border-neutral-800 transition-colors ${
                track.status === "processing" ? "animate-pulse bg-neutral-800/20" : ""
              } hover:bg-neutral-800/50`}
            >
              <TableCell className="font-medium text-white">
                {track.original_filename}
                {track.error_message && (
                  <p className="text-red-400 text-xs mt-1">{track.error_message}</p>
                )}
              </TableCell>
              <TableCell className="text-neutral-300">
                {track.selected_platform_preset || '-'}
              </TableCell>
              <TableCell>
                {getStatusDisplay(track.status)}
              </TableCell>
              <TableCell>
                {track.status === "mastered" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">Original:</span>
                      <AudioPlayer 
                        storageKey={track.storage_path_original} 
                        bucket="audio" 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">Mastered:</span>
                      <AudioPlayer 
                        storageKey={track.storage_path_mastered || ""} 
                        bucket="audio" 
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => downloadMasteredFile(track)}
                        className="ml-2 border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
                      >
                        <ArrowDownToLine className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : track.status === "processing" ? (
                  <div className="flex items-center text-neutral-400">
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span className="text-neutral-500">Not available yet</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <AlertDialog open={trackToDelete === track.id} onOpenChange={(open) => !open && setTrackToDelete(null)}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTrackToDelete(track.id)}
                      className="text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-neutral-900 border-neutral-800 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Audio Track?</AlertDialogTitle>
                      <AlertDialogDescription className="text-neutral-400">
                        This will permanently delete "{track.original_filename}" and all its processed versions. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel 
                        className="bg-transparent text-white border-neutral-700 hover:bg-neutral-800"
                        disabled={isDeleting}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-red-500 text-white hover:bg-red-600"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteTrack(track.id);
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
