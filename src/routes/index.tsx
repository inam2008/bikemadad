import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bike, Wrench, ArrowRight, Moon, Sun } from "lucide-react";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BikeMadad — Bike Mechanic at Your Spot" },
      {
        name: "description",
        content:
          "Stuck with a puncture, dead battery or engine trouble? Request a motorcycle mechanic and track them live.",
      },
      { property: "og:title", content: "BikeMadad — Bike Mechanic at Your Spot" },
      {
        property: "og:description",
        content: "Request a motorcycle mechanic to your location and follow them live on the map.",
      },
    ],
  }),
  component: RolePicker,
});

function RolePicker() {
  const { theme, toggle } = useTheme();
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !session || !profile) return;
    navigate({ to: profile.role === "mechanic" ? "/mechanic" : "/customer" });
  }, [loading, session, profile, navigate]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-xl">🏍️</span>
            <span className="font-display text-xl font-semibold tracking-wide text-foreground">BikeMadad</span>
          </span>
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface"
          >
            {theme === "dark" ? <Sun className="h-5 w-5 text-accent" /> : <Moon className="h-5 w-5 text-primary" />}
          </button>
        </div>

        <div className="mt-12">
          <h1 className="font-display text-[2.3rem] font-bold uppercase leading-[1.06] tracking-wide text-foreground">
            How are you using this app?
          </h1>
          <p dir="rtl" lang="ur" className="font-urdu mt-2 text-[15px] text-muted-foreground">
            آپ یہ ایپ کس لیے استعمال کر رہے ہیں؟
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Link
            to="/auth/$role"
            params={{ role: "customer" }}
            className="card-lift block rounded-2xl border-2 border-border bg-surface p-5 transition-colors hover:border-primary active:scale-[0.99]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15">
              <Bike className="h-6 w-6 text-primary" />
            </span>
            <span className="mt-4 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-display text-xl font-semibold uppercase tracking-wide text-foreground">
                  I need assistance
                </span>
                <span dir="rtl" lang="ur" className="font-urdu block text-sm text-muted-foreground">
                  مجھے مکینک کی ضرورت ہے
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
            </span>
            <span className="mt-3 block text-sm text-muted-foreground">
              Send your location, pick the problem, and watch the mechanic come to you.
            </span>
          </Link>

          <Link
            to="/auth/$role"
            params={{ role: "mechanic" }}
            className="card-lift block rounded-2xl border-2 border-border bg-surface p-5 transition-colors hover:border-accent active:scale-[0.99]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/20">
              <Wrench className="h-6 w-6 text-accent" />
            </span>
            <span className="mt-4 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-display text-xl font-semibold uppercase tracking-wide text-foreground">
                  I am a mechanic
                </span>
                <span dir="rtl" lang="ur" className="font-urdu block text-sm text-muted-foreground">
                  میں مکینک ہوں
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-accent" />
            </span>
            <span className="mt-3 block text-sm text-muted-foreground">
              Go online, receive nearby jobs, and earn on your own schedule.
            </span>
          </Link>
        </div>

        <div className="mt-auto pt-10 text-center">
          <Link to="/parts" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            See the parts rate list
          </Link>
        </div>
      </div>
    </main>
  );
}
