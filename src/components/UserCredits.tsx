
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export const UserCredits = () => {
  const { user } = useAuth();
  
  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  if (!profile) return null;

  const resetDate = new Date(profile.credits_reset_date);
  const isAdmin = profile.is_admin;

  return (
    <Card className="bg-neutral-900/50 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          {isAdmin ? 'Admin Account' : 'Credits Available'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isAdmin ? (
          <p className="text-sm text-neutral-400">Unlimited access to all features</p>
        ) : (
          <>
            <p className="text-3xl font-bold mb-2">{profile.credits_remaining}</p>
            <p className="text-sm text-neutral-400">
              Credits reset on {resetDate.toLocaleDateString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
