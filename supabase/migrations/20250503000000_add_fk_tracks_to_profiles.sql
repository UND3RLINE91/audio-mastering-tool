    -- Add foreign key constraint from audio_tracks.user_id to user_profiles.id

    alter table public.audio_tracks
      add constraint audio_tracks_user_id_fkey
      foreign key (user_id)
      references public.user_profiles (id)
      on delete cascade; -- Optional: Deletes tracks if the user profile is deleted

    -- Add an index for potentially faster lookups (optional but recommended)
    create index if not exists idx_audio_tracks_user_id on public.audio_tracks(user_id);

    
