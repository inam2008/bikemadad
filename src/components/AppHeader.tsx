import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Moon, Sun, LogOut, ListOrdered, Bike, Wrench, Phone } from "lucide-react";
import { useState } from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { theme, toggle } = useTheme();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[86%] max-w-xs border-border bg-surface p-0">
            <div className="border-b border-border px-5 py-5">
              <p className="font-display text-lg font-semibold tracking-wide text-foreground">
                {profile?.full_name || "BikeMadad"}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile ? `+${profile.phone} · ${profile.role === "mechanic" ? "Mechanic" : "Customer"}` : "Roadside bike help"}
              </p>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              <Link
                to={profile?.role === "mechanic" ? "/mechanic" : "/customer"}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                {profile?.role === "mechanic" ? <Wrench className="h-4 w-4 text-primary" /> : <Bike className="h-4 w-4 text-primary" />}
                Dashboard
              </Link>
              <Link
                to="/parts"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                <ListOrdered className="h-4 w-4 text-primary" />
                <span className="min-w-0">
                  Mechanical Parts Rate List
                  <span dir="rtl" lang="ur" className="font-urdu block text-xs text-muted-foreground">
                    پرزوں کی قیمتیں
                  </span>
                </span>
              </Link>
              <a
                href="tel:+923490087426"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                <Phone className="h-4 w-4 text-primary" />
                Call helpline
              </a>
              <button
                type="button"
                onClick={toggle}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-accent" /> : <Moon className="h-4 w-4 text-primary" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                  navigate({ to: "/" });
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive hover:bg-surface-2"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </nav>
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold tracking-wide text-foreground">BikeMadad</p>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle dark mode"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground"
        >
          {theme === "dark" ? <Sun className="h-5 w-5 text-accent" /> : <Moon className="h-5 w-5 text-primary" />}
        </button>
      </div>
    </header>
  );
}
