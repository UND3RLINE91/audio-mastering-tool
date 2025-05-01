import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const SUBSCRIPTION_PLANS = [
  {
    id: 'price_1RJp78IBo54ZqjJoXxhPauta',
    name: 'Pro Plan',
    price: 19.99,
    credits: 25,
    features: [
      '25 mastering credits per month',
      'High quality previews',
      'Priority support',
      'Advanced audio analysis'
    ]
  }
];

export const SubscriptionManager = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to subscribe to a plan",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Create checkout session through Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          userId: user.id,
          email: user.email,
          planId
        },
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL received');

      window.location.href = data.url;
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        variant: "destructive",
        title: "Subscription failed",
        description: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-white hover:bg-white/10">
          Subscription Plans
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-neutral-900 border-neutral-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Choose Your Plan</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Select a plan that best fits your needs. All plans include monthly credits for mastering.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Card key={plan.id} className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription className="text-neutral-400">
                  ${plan.price}/month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-neutral-300">
                      <span className="mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isLoading}
                  className="w-full bg-white text-black hover:bg-white/90"
                >
                  {isLoading ? "Processing..." : "Subscribe Now"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 