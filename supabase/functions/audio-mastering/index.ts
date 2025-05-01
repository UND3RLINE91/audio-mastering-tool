import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processAudio } from "./audio-processor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: corsHeaders,
      status: 204 
    });
  }

  console.log("Received request:", {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  });

  // Check for POST method
  if (req.method !== "POST") {
    console.error("Invalid method:", req.method);
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405 
      }
    );
  }
  
  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log("Auth header:", authHeader);
    
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401 
        }
      );
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    console.log("Extracted token:", token ? "Token present" : "No token");
    
    if (!token) {
      console.error("No token provided in authorization header");
      return new Response(
        JSON.stringify({ error: "No token provided" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401 
        }
      );
    }

    // Parse request body
    let trackId: string;
    try {
      const contentType = req.headers.get('content-type');
      console.log("Content-Type:", contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error("Content-Type must be application/json");
      }

      const body = await req.json();
      console.log("Request body:", body);
      
      if (!body || typeof body !== 'object') {
        throw new Error("Invalid request body format");
      }
      
      if (!body.trackId || typeof body.trackId !== 'string') {
        throw new Error("trackId must be a string");
      }
      
      trackId = body.trackId;
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request body",
          details: error.message 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    console.log(`Received request to process track: ${trackId}`);

    if (!trackId) {
      throw new Error("Track ID is required");
    }
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the JWT token
    console.log("Verifying JWT token...");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${authError.message}` }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401 
        }
      );
    }

    if (!user) {
      console.error("No user found in token");
      return new Response(
        JSON.stringify({ error: "No user found in token" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401 
        }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // Get track info 
    console.log(`Fetching track information for ID: ${trackId}`);
    const { data: track, error: trackError } = await supabaseAdmin
      .from("audio_tracks")
      .select("*, user_profiles(*)")
      .eq("id", trackId)
      .single();
      
    if (trackError) {
      console.error("Error fetching track:", trackError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch track: ${trackError.message}` }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    }

    if (!track) {
      console.error("Track not found:", trackId);
      return new Response(
        JSON.stringify({ error: "Track not found" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404 
        }
      );
    }

    console.log(`Track information retrieved:`, {
      id: track.id,
      platform: track.selected_platform_preset,
      originalPath: track.storage_path_original,
      status: track.status
    });

    // Check if user has enough credits or is an admin
    const userProfile = track.user_profiles;
    
    if (!userProfile) {
      console.error("User profile not found for track:", trackId);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    }
    
    if (!userProfile.is_admin && userProfile.credits_remaining <= 0) {
      console.error("No credits remaining for user:", user.id);
      return new Response(
        JSON.stringify({ error: "No credits remaining" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403 
        }
      );
    }

    // Update status to processing
    console.log(`Updating track status to processing`);
    const { error: statusError } = await supabaseAdmin
      .from("audio_tracks")
      .update({ status: "processing" })
      .eq("id", trackId);

    if (statusError) {
      console.error("Error updating status to processing:", statusError);
      return new Response(
        JSON.stringify({ error: `Failed to update status: ${statusError.message}` }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    }

    console.log(`Processing track: ${trackId}, platform: ${track.selected_platform_preset}`);

    // Add minimum processing time of 1 minute
    console.log(`Waiting for minimum processing time...`);
    await new Promise(resolve => setTimeout(resolve, 60000));

    try {
      console.log(`Starting audio processing...`);
      const result = await processAudio(
        "audio", 
        track.storage_path_original, 
        track.selected_platform_preset,
        supabaseAdmin
      );
      
      console.log(`Audio processing completed successfully`);
      
      // Deduct credits if not admin
      if (!userProfile.is_admin) {
        console.log(`Deducting credits for user: ${track.user_id}`);
        const { error: creditError } = await supabaseAdmin
          .from("user_profiles")
          .update({ 
            credits_remaining: userProfile.credits_remaining - 1 
          })
          .eq("id", track.user_id);
          
        if (creditError) {
          console.error("Error deducting credits:", creditError);
          throw creditError;
        }
      }
      
      // Update track record
      console.log(`Updating track record for ID: ${trackId} with mastered path: ${result.masteredPath}`);
      const { error: updateError } = await supabaseAdmin
        .from("audio_tracks")
        .update({ 
          status: "mastered",
          storage_path_mastered: result.masteredPath,
          storage_path_preview: result.previewPath,
          audio_quality: result.audioQuality
        })
        .eq("id", trackId);
        
      if (updateError) {
        console.error("Database update error:", updateError);
        throw new Error(`Failed to update track record: ${updateError.message}`);
      }
      
      console.log(`Successfully updated track record for ID: ${trackId}`);
      
      return new Response(
        JSON.stringify({ success: true, trackId }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    } catch (error) {
      console.error(`Processing error for track ${trackId}:`, {
        error: error.message,
        stack: error.stack,
        track: {
          id: track.id,
          platform: track.selected_platform_preset,
          originalPath: track.storage_path_original
        }
      });
      
      await supabaseAdmin
        .from("audio_tracks")
        .update({ 
          status: "error",
          error_message: error.message
        })
        .eq("id", trackId);
        
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    }
  } catch (error) {
    console.error("Error in audio-mastering function:", {
      error: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
