import { useState, useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AudioPlayerProps {
  storageKey: string;
  bucket: string;
}

export const AudioPlayer = ({ storageKey, bucket }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    const fetchAudio = async () => {
      if (!storageKey) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storageKey, 3600); // 1 hour validity
          
        if (error) {
          console.error("Error creating signed URL:", error);
          throw error;
        }
        
        if (!data?.signedUrl) {
          throw new Error("Could not generate signed URL");
        }
        
        setAudioUrl(data.signedUrl);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading audio:", err);
        
        if (retryCountRef.current >= 2) {
          setError("Could not load audio file");
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "Audio loading failed",
            description: "There was a problem loading the audio file."
          });
        } else {
          retryCountRef.current += 1;
          setTimeout(fetchAudio, 2000);
        }
      }
    };

    fetchAudio();
    
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setAudioUrl(null);
      retryCountRef.current = 0;
    };
  }, [storageKey, bucket]);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        setError(null);
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      
      const handleError = (e: Event) => {
        console.error("Audio playback error:", e);
        setError("Error playing audio");
      };
      
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [audioRef.current]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(_ => {
              // Playback started successfully
            })
            .catch(e => {
              console.error("Playback prevented by browser:", e);
              toast({
                title: "Playback blocked",
                description: "Please interact with the page to enable audio playback"
              });
            });
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 bg-neutral-800 rounded-md p-1 animate-pulse">
        <div className="w-8 h-8 bg-neutral-700 rounded-full"></div>
        <div className="w-24 h-2 bg-neutral-700 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 bg-red-900/20 text-red-400 rounded-md p-2 text-sm">
        <span>Failed to load audio</span>
      </div>
    );
  }

  if (!audioUrl) {
    return <div className="text-neutral-500 text-sm">Audio not available</div>;
  }

  return (
    <div className="flex items-center space-x-2 bg-neutral-800/80 backdrop-blur-sm rounded-md p-1 border border-neutral-700">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <Button 
        variant="ghost" 
        size="icon" 
        className="size-8 rounded-full bg-white/10 hover:bg-white/20" 
        onClick={togglePlayPause}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>
      <div className="flex-1 flex items-center gap-2">
        <Slider 
          value={[currentTime]} 
          max={duration || 100}
          step={0.1}
          onValueChange={handleSliderChange}
          className="w-24"
        />
        <span className="text-neutral-400 text-xs">
          {formatTime(currentTime)}
        </span>
      </div>
    </div>
  );
};
