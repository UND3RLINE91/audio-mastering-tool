// Import necessary modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processAudio } from "./audio-processor.ts";

// Define CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow requests from any origin
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", // Allowed headers
  "Access-Control-Allow-Methods": "POST, OPTIONS", // Allowed HTTP methods
  "Access-Control-Max-Age": "86400", // Cache preflight request for 24 hours
};

// Start the Deno server
serve(async (req) => {
  // Handle CORS preflight requests (OPTIONS method)
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", {
      headers: corsHeaders,
      status: 204 // No Content for OPTIONS response
    });
  }

  console.log("Received request:", {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  });

  // Ensure the request method is POST
  if (req.method !== "POST") {
    console.error("Invalid method:", req.method);
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405 // Method Not Allowed
      }
    );
  }

  try {
    // --- Authentication ---
    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    console.log("Auth header:", authHeader ? "Present" : "Missing");

    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401 // Unauthorized
        }
      );
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '');
    console.log("Extracted token:", token ? "Token present" : "No token");

    if (!token) {
      console.error("No token provided in authorization header");
      return new Response(
        JSON.stringify({ error: "No token provided" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401 // Unauthorized
        }
      );
    }

    // --- Request Body Parsing ---
    let trackId: string;
    try {
      const contentType = req.headers.get('content-type');
      console.log("Content-Type:", contentType);

      // Ensure content type is JSON
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error("Content-Type must be application/json");
      }

      // Parse the JSON body
      const body = await req.json();
      console.log("Request body:", body);

      // Validate the body structure
      if (!body || typeof body !== 'object') {
        throw new Error("Invalid request body format");
      }

      if (!body.trackId || typeof body.trackId !== 'string') {
        throw new Error("trackId must be a string and is required");
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
          status: 400 // Bad Request
        }
      );
    }

    console.log(`Received request to process track: ${trackId}`);

    // --- Supabase Client Initialization & Auth Verification ---
    // Create Supabase admin client using environment variables
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the JWT token using the admin client
    console.log("Verifying JWT token...");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError) {
      console.error(`Authentication error for track ${trackId}:`, authError);
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${authError.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401 // Unauthorized
        }
      );
    }

    if (!user) {
      console.error(`No user found in token for track ${trackId}`);
      return new Response(
        JSON.stringify({ error: "No user found in token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401 // Unauthorized
        }
      );
    }

    console.log(`Authenticated user ${user.id} for track ${trackId}`);

    // --- Track Information Fetching ---
    console.log(`Fetching track information for ID: ${trackId}`);
    const { data: track, error: trackError } = await supabaseAdmin
      .from("audio_tracks")
      .select("*, user_profiles(*)") // Select track data and related user profile
      .eq("id", trackId)
      .single(); // Expect a single result

    if (trackError) {
      console.error(`Error fetching track ${trackId}:`, trackError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch track: ${trackError.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 // Internal Server Error
        }
      );
    }

    if (!track) {
      console.error("Track not found:", trackId);
      return new Response(
        JSON.stringify({ error: "Track not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404 // Not Found
        }
      );
    }

    console.log(`Track information retrieved for ${trackId}:`, {
      id: track.id,
      platform: track.selected_platform_preset,
      originalPath: track.storage_path_original,
      status: track.status
    });

    // --- Credit Check ---
    const userProfile = track.user_profiles;

    if (!userProfile) {
      console.error(`User profile not found for track: ${trackId}, user ID: ${track.user_id}`);
      // Update status to error as this is unexpected
      await supabaseAdmin
        .from("audio_tracks")
        .update({
          status: "error",
          error_message: "User profile not found during processing."
        })
        .eq("id", trackId);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 // Internal Server Error
        }
      );
    }

    // Check if user has credits or is an admin
    if (!userProfile.is_admin && userProfile.credits_remaining <= 0) {
      console.error(`No credits remaining for user: ${user.id}, track: ${trackId}`);
      // Update status to error as processing cannot proceed
       await supabaseAdmin
        .from("audio_tracks")
        .update({
          status: "error",
          error_message: "Insufficient credits to process track."
        })
        .eq("id", trackId);
      return new Response(
        JSON.stringify({ error: "No credits remaining" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403 // Forbidden
        }
      );
    }

    // --- Update Status to Processing ---
    console.log(`Updating track ${trackId} status to processing`);
    const { error: statusError } = await supabaseAdmin
      .from("audio_tracks")
      .update({ status: "processing" })
      .eq("id", trackId);

    if (statusError) {
      console.error(`Error updating status to processing for track ${trackId}:`, statusError);
      // Don't necessarily stop here, but log the error. Processing might still work.
      // If this fails consistently, it indicates a DB issue.
    }

    // --- Audio Processing ---
    console.log(`Starting audio processing for track: ${trackId}, platform: ${track.selected_platform_preset}`);

    // *** REMOVED THE HARDCODED 60-SECOND DELAY ***
    // console.log(`Waiting for minimum processing time...`);
    // await new Promise(resolve => setTimeout(resolve, 60000)); // Removed this line

    try {
      console.log(`Calling processAudio for track ${trackId}...`);
      const result = await processAudio(
        "audio", // Bucket name
        track.storage_path_original,
        track.selected_platform_preset,
        supabaseAdmin // Pass the admin client
      );

      console.log(`Audio processing completed successfully for track ${trackId}. Result:`, result);

      // --- Deduct Credits (if applicable) ---
      if (!userProfile.is_admin) {
        console.log(`Deducting 1 credit for user: ${track.user_id} (Track: ${trackId})`);
        const newCreditCount = Math.max(0, userProfile.credits_remaining - 1); // Ensure credits don't go below 0
        const { error: creditError } = await supabaseAdmin
          .from("user_profiles")
          .update({
            credits_remaining: newCreditCount
          })
          .eq("id", track.user_id);

        if (creditError) {
          // Log the error but don't necessarily fail the whole process,
          // as the audio is already mastered. This needs monitoring.
          console.error(`Error deducting credits for user ${track.user_id}, track ${trackId}:`, creditError);
          // Optionally, you could try updating the track with an error message about credit deduction failure.
        } else {
          console.log(`Successfully deducted credit for user ${track.user_id}. New balance: ${newCreditCount}`);
        }
      } else {
         console.log(`Admin user ${track.user_id} - skipping credit deduction for track ${trackId}.`);
      }

      // --- Update Track Record with Mastered Info ---
      console.log(`Updating track record for ID: ${trackId} with mastered path: ${result.masteredPath}`);
      const { error: updateError } = await supabaseAdmin
        .from("audio_tracks")
        .update({
          status: "mastered",
          storage_path_mastered: result.masteredPath,
          storage_path_preview: result.previewPath,
          audio_quality: result.audioQuality,
          error_message: null // Clear any previous errors
        })
        .eq("id", trackId);

      if (updateError) {
        console.error(`Database update error after mastering track ${trackId}:`, updateError);
        // Even though processing succeeded, the final update failed.
        // Status remains 'processing'. Manual intervention might be needed.
        // Consider adding specific logging or alerting for this case.
        throw new Error(`Failed to update track record after mastering: ${updateError.message}`);
      }

      console.log(`Successfully updated track record for ID: ${trackId}`);

      // Return success response
      return new Response(
        JSON.stringify({ success: true, trackId }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 // OK
        }
      );
    } catch (processingError) {
      // --- Error Handling during processAudio or subsequent updates ---
      console.error(`Processing error for track ${trackId}:`, {
        error: processingError.message,
        stack: processingError.stack,
        track: {
          id: track.id,
          platform: track.selected_platform_preset,
          originalPath: track.storage_path_original
        }
      });

      // Update track status to 'error' in the database
      console.log(`Updating track ${trackId} status to error`);
      const { error: updateErrorError } = await supabaseAdmin
        .from("audio_tracks")
        .update({
          status: "error",
          error_message: processingError.message // Store the error message
        })
        .eq("id", trackId);

       if (updateErrorError) {
         console.error(`Failed to update track ${trackId} status to 'error':`, updateErrorError);
         // If even updating to error fails, log it prominently.
       }

      // Return error response
      return new Response(
        JSON.stringify({ error: `Processing failed: ${processingError.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 // Internal Server Error
        }
      );
    }
  } catch (error) {
    // --- Catch-all for unexpected errors ---
    console.error("Unhandled error in audio-mastering function:", {
      error: error.message,
      stack: error.stack
    });

    // Try to determine trackId if possible, otherwise return generic error
    let trackIdForError = "unknown";
    try {
      if (req.bodyUsed) {
         // Cannot re-read body, maybe trackId was parsed earlier
         if (typeof trackId !== 'undefined') {
             trackIdForError = trackId;
         }
      } else {
        const body = await req.json();
        trackIdForError = body?.trackId || "unknown";
      }
    } catch (parseError) {
        // Ignore if body parsing fails here
    }

    console.error(`Unhandled error potentially related to track: ${trackIdForError}`);

    // Return generic server error
    return new Response(
      JSON.stringify({ error: `An unexpected error occurred: ${error.message}` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 // Internal Server Error
      }
    );
  }
});
