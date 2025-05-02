
import { FileAudio } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export const WelcomeSection = () => {
  const { user } = useAuth();

  return (
    <div className="text-center max-w-2xl mx-auto py-12">
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
        Welcome to AE's Audio Master Tool
      </h1>
      <p className="text-lg text-neutral-400 mb-8">
        Professional Audio Mastering Made Easy
      </p>

      {!user && (
        <div className="bg-neutral-900/70 backdrop-blur-md p-6 rounded-lg shadow-xl border border-neutral-800 transition-all hover:border-neutral-700">
          <FileAudio className="w-12 h-12 mx-auto mb-4 text-white" />
          <h2 className="text-xl font-semibold mb-4 text-white">How It Works</h2>
          <ol className="text-left space-y-3 text-neutral-300">
            <li className="flex items-start hover:text-white transition-colors">
              <span className="font-medium mr-2 text-white">1.</span>
              <span>Sign up and get free credits monthly</span>
            </li>
            <li className="flex items-start hover:text-white transition-colors">
              <span className="font-medium mr-2 text-white">2.</span>
              <span>Upload your audio file (WAV or AIFF format recommended)</span>
            </li>
            <li className="flex items-start hover:text-white transition-colors">
              <span className="font-medium mr-2 text-white">3.</span>
              <span>Select your target platform (Spotify, Apple Music, etc.)</span>
            </li>
            <li className="flex items-start hover:text-white transition-colors">
              <span className="font-medium mr-2 text-white">4.</span>
              <span>Our site will master your track according to platform standards</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};
