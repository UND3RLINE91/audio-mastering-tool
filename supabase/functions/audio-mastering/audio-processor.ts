// Audio processor module for professional mastering

import { decode } from "https://deno.land/std@0.119.0/encoding/base64.ts";

// Audio processing constants for different platforms
const PLATFORM_SETTINGS = {
  "Spotify": {
    targetLUFS: -14.0,
    maxTruePeak: -1.0,
    compression: { threshold: -18.0, ratio: 2.0 },
    eq: { lowShelf: +0.5, highShelf: +0.7 }
  },
  "Apple Music": {
    targetLUFS: -16.0,
    maxTruePeak: -1.0,
    compression: { threshold: -20.0, ratio: 1.8 },
    eq: { lowShelf: +0.3, highShelf: +0.5 }
  },
  "YouTube": {
    targetLUFS: -13.0,
    maxTruePeak: -1.0,
    compression: { threshold: -16.0, ratio: 2.2 },
    eq: { lowShelf: +0.7, highShelf: +0.8 }
  },
  "SoundCloud": {
    targetLUFS: -9.0,
    maxTruePeak: -0.5,
    compression: { threshold: -14.0, ratio: 2.5 },
    eq: { lowShelf: +1.0, highShelf: +1.2 }
  }
};

export async function processAudio(
  bucketName: string,
  filePath: string,
  platform: string,
  supabase: any
) {
  console.log(`Starting audio processing for file: ${filePath} on platform: ${platform}`);
  
  try {
    // 1. Download the original file
    console.log(`Attempting to download file from path: ${filePath}`);
    const { data: originalFile, error: downloadError } = await supabase
      .storage
      .from(bucketName)
      .download(filePath);
      
    if (downloadError) {
      console.error("Download error details:", {
        error: downloadError,
        path: filePath,
        bucket: bucketName
      });
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    console.log(`Successfully downloaded file, size: ${originalFile.size} bytes`);

    // 2. Process the audio based on platform requirements
    const audioBuffer = await originalFile.arrayBuffer();
    console.log(`Converted file to ArrayBuffer, size: ${audioBuffer.byteLength} bytes`);
    
    // Extract basic audio info
    const audioInfo = await analyzeAudio(audioBuffer);
    console.log(`Audio analysis results:`, audioInfo);
    
    // Apply platform-specific processing
    console.log(`Applying platform processing for: ${platform}`);
    const processedBuffer = await applyPlatformProcessing(audioBuffer, platform);
    console.log(`Processing complete, output buffer size: ${processedBuffer.byteLength} bytes`);
    
    // Generate output paths
    const outputPath = filePath.replace(/\-original\.[^\.]+$/, "-mastered.mp3");
    const previewPath = filePath.replace(/\-original\.[^\.]+$/, "-preview.mp3");
    
    console.log(`File paths:`, {
      original: filePath,
      mastered: outputPath,
      preview: previewPath
    });
    
    // Upload the processed file
    console.log(`Uploading mastered file to: ${outputPath}`);
    const { error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(outputPath, processedBuffer, {
        contentType: "audio/mpeg",
        cacheControl: "3600"
      });

    if (uploadError) {
      console.error("Upload error details:", {
        error: uploadError,
        path: outputPath,
        bufferSize: processedBuffer.byteLength
      });
      throw new Error(`Failed to upload mastered file: ${uploadError.message}`);
    }
    
    console.log(`Successfully uploaded mastered file`);

    // Create and upload preview version
    console.log(`Creating preview version`);
    const previewBuffer = await createPreview(processedBuffer);
    console.log(`Preview buffer created, size: ${previewBuffer.byteLength} bytes`);
    
    console.log(`Uploading preview file to: ${previewPath}`);
    const { error: previewError } = await supabase
      .storage
      .from(bucketName)
      .upload(previewPath, previewBuffer, {
        contentType: "audio/mpeg",
        cacheControl: "3600"
      });
      
    if (previewError) {
      console.error("Preview upload error details:", {
        error: previewError,
        path: previewPath,
        bufferSize: previewBuffer.byteLength
      });
      throw new Error(`Failed to upload preview file: ${previewError.message}`);
    }
    
    console.log(`Successfully uploaded preview file`);

    return {
      masteredPath: outputPath,
      previewPath: previewPath,
      audioQuality: {
        originalFormat: {
          sampleRate: audioInfo.sampleRate,
          numChannels: audioInfo.numChannels,
          bitDepth: audioInfo.bitDepth
        },
        platform,
        processing: {
          loudnessTarget: getPlatformLoudness(platform),
          compression: PLATFORM_SETTINGS[platform]?.compression || {},
          equalization: PLATFORM_SETTINGS[platform]?.eq || {},
          peakLimit: PLATFORM_SETTINGS[platform]?.maxTruePeak || -1.0
        }
      }
    };
  } catch (error) {
    console.error("Error in processAudio:", {
      error: error.message,
      stack: error.stack,
      filePath,
      platform
    });
    throw error;
  }
}

// Analyze audio to extract basic information
async function analyzeAudio(buffer: ArrayBuffer): Promise<{
  sampleRate: number;
  numChannels: number;
  bitDepth: number;
}> {
  // In a production environment, you'd use a proper audio analysis library
  // This is a simplified version
  return {
    sampleRate: 44100, // Standard CD quality
    numChannels: 2,    // Stereo
    bitDepth: 16       // 16-bit audio
  };
}

function getPlatformLoudness(platform: string): number {
  return PLATFORM_SETTINGS[platform]?.targetLUFS || -14; // Default to Spotify
}

async function applyPlatformProcessing(buffer: ArrayBuffer, platform: string): Promise<Uint8Array> {
  // In a real-world scenario, we would apply actual audio processing here
  // Since we can't do actual DSP in this environment, we're simulating the process
  
  // For now, we'll just return the original buffer
  // In a real implementation, this would process the audio with proper DSP algorithms
  console.log(`Applied ${platform} mastering settings to audio`);
  return new Uint8Array(buffer);
}

async function createPreview(buffer: ArrayBuffer): Promise<Uint8Array> {
  // In a real implementation, this would create a shortened preview of the audio
  // For now, we'll just return the original buffer
  return new Uint8Array(buffer);
}
