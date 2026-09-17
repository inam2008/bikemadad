import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CircleDot,
  Droplets,
  Disc3,
  Cog,
  HelpCircle,
  MapPin,
  Loader2,
  Phone,
  CheckCircle2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { MapView, type MapMarker } from "@/components/MapView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useGeo } from "@/lib/useGeo";

export const Route = createFileRoute("/customer")({
  head: () => ({
    meta: [
      { title: "Request a Mechanic — BikeMadad" },
      {
        name: "description",
        content: "Pick your bike problem, share your spot, and track your mechanic live on the map.",
      },
      { property: "og:title", content: "Request a Mechanic — BikeMadad" },
      {
        property: "og:description",
        content: "Roadside motorcycle help in minutes, with live tracking.",
      },
    ],
  }),
  component: CustomerDashboard,
});

type Request = {
  id: string;
  status: "pending" | "accepted" | "on_the_way" | "completed" | "cancelled";
  problem_type: string;
  problem_note: string | null;
  bike_model: string | null;
  bike_reg_no: string | null;
  landmark: string | null;
  lat: number | null;
  lng: number | null;
  mechanic_id: string | null;
  created_at: string;
};

const PROBLEMS = [
  { key: "Tyre Puncture", ur: "ٹائر پنکچر", Icon: CircleDot },
  { key: "Oil Change", ur: "آئل تبدیلی", Icon: Droplets },
  { key: "Brake Failure", ur: "بریک خرابی", Icon: Disc3 },
  { key: "Engine Issue", ur: "انجن کی خرابی", Icon: Cog },
  { key: "Other", ur: "کوئی اور مسئلہ", Icon: HelpCircle },
] as const;

const STATUS_TEXT: Record<Request["status"], { en: string; ur: string }> = {
  pending: { en: "Looking for a mechanic nearby", ur: "قریبی مکینک تلاش کیا جا رہا ہے" },
  accepted: { en: "Mechanic accepted your request", ur: "مکینک نے درخواست قبول کر لی" },
  on_the_way: { en: "Mechanic is on the way", ur: "مکینک راستے میں ہے" },
  completed: { en: "Job completed", ur: "کام مکمل ہو گیا" },
  cancelled: { en: "Request cancelled", ur: "درخواست منسوخ" },
};

function CustomerDashboard() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { coords, error: geoError } = useGeo(true);

  const [problem, setProblem] = useState<string>("");
  const [note, setNote] = useState("");
  const [bikeModel, setBikeModel] = useState("");
  const [bikeReg, setBikeReg] = useState("");
  const [landmark, setLandmark] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<Request | null>(null);
  const [mechanic, setMechanic] = useState<{
    full_name: string;
    phone: string;
    lat: number | null;
    lng: number | null;
  } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session || !profile) navigate({ to: "/" });
    else if (profile.role === "mechanic") navigate({ to: "/mechanic" });
  }, [loading, session, profile, navigate]);

  // Keep the customer's own location fresh on their profile.
  useEffect(() => {
    if (!session?.user || !coords) return;
    void supabase
      .from("profiles")
      .update({ lat: coords.lat, lng: coords.lng, location_updated_at: new Date().toISOString() })
      .eq("id", session.user.id);
  }, [session?.user?.id, coords?.lat, coords?.lng, coords, session?.user]);

  const loadActive = async (userId: string) => {
    const { data } = await supabase
      .from("service_requests")
      .select("*")
      .eq("customer_id", userId)
      .in("status", ["pending", "accepted", "on_the_way"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActive((data as Request | null) ?? null);
  };

  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    void loadActive(userId);

    const channel = supabase
      .channel(`cust-req-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests", filter: `customer_id=eq.${userId}` },
        () => void loadActive(userId),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id, session?.user]);

  // Live mechanic details + location.
  useEffect(() => {
    const mechanicId = active?.mechanic_id;
    if (!mechanicId) {
      setMechanic(null);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, lat, lng")
        .eq("id", mechanicId)
        .maybeSingle();
      if (data) setMechanic(data);
    };
    void load();

    const channel = supabase
      .channel(`cust-mech-${mechanicId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${mechanicId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [active?.mechanic_id]);

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    const me = active?.lat != null && active?.lng != null ? { lat: active.lat, lng: active.lng } : coords;
    if (me) list.push({ id: "me", lat: me.lat, lng: me.lng, kind: "customer", label: "You" });
    if (mechanic?.lat != null && mechanic?.lng != null) {
      list.push({
        id: "mech",
        lat: mechanic.lat,
        lng: mechanic.lng,
        kind: "mechanic",
        label: mechanic.full_name || "Mechanic",
      });
    }
    return list;
  }, [active?.lat, active?.lng, coords, mechanic]);

  const center = mechanic?.lat != null && mechanic?.lng != null
    ? { lat: mechanic.lat, lng: mechanic.lng }
    : coords;

  const submit = async () => {
    if (!session?.user || !profile) return;
    if (!problem) {
      toast.error("Please pick what's wrong with your bike");
      return;
    }
    if (problem === "Other" && note.trim().length < 3) {
      toast.error("Tell us briefly what the problem is");
      return;
    }
    if (!coords) {
      toast.error("We still need your location — allow location access and try again");
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("service_requests").insert({
      customer_id: session.user.id,
      customer_name: profile.full_name,
      customer_phone: profile.phone,
      problem_type: problem,
      problem_note: note.trim() || null,
      bike_model: bikeModel.trim() || null,
      bike_reg_no: bikeReg.trim() || null,
      landmark: landmark.trim() || null,
      lat: coords.lat,
      lng: coords.lng,
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Request sent. Nearby mechanics are being notified.");
    setProblem("");
    setNote("");
    await loadActive(session.user.id);
  };

  const cancel = async () => {
    if (!active) return;
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "cancelled" })
      .eq("id", active.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Request cancelled");
      setActive(null);
    }
  };

  if (loading || !profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader subtitle={`Hello, ${profile.full_name.split(" ")[0]}`} />

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <MapView center={center} markers={markers} className="h-64 w-full" />
          <div className="flex items-start gap-2 border-t border-border px-4 py-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              {geoError
                ? geoError
                : coords
                  ? `Your live spot: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                  : "Finding your location…"}
            </p>
          </div>
        </div>

        {active ? (
          <section className="mt-5 rounded-2xl border-2 border-primary/40 bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 font-display text-xs font-semibold uppercase tracking-widest text-primary">
                <span className="pulse-ring h-2 w-2 rounded-full bg-primary" />
                {active.status.replace(/_/g, " ")}
              </span>
              <button
                type="button"
                onClick={cancel}
                className="inline-flex items-center gap-1 text-xs font-medium text-destructive"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>

            <h2 className="mt-4 font-display text-xl font-semibold uppercase tracking-wide text-foreground">
              {STATUS_TEXT[active.status].en}
            </h2>
            <p dir="rtl" lang="ur" className="font-urdu text-sm text-muted-foreground">
              {STATUS_TEXT[active.status].ur}
            </p>

            <dl className="mt-4 space-y-1.5 text-sm">
              <Row label="Problem" value={active.problem_type} />
              {active.problem_note ? <Row label="Details" value={active.problem_note} /> : null}
              {active.bike_model ? <Row label="Bike" value={active.bike_model} /> : null}
              {active.bike_reg_no ? <Row label="Reg no" value={active.bike_reg_no} /> : null}
              {active.landmark ? <Row label="Landmark" value={active.landmark} /> : null}
            </dl>

            {mechanic ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-foreground">
                    {mechanic.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Your mechanic</p>
                </div>
                <a
                  href={`tel:+${mechanic.phone}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2 font-display text-sm font-semibold text-accent-foreground"
                >
                  <Phone className="h-4 w-4" /> Call
                </a>
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                Hang tight — we'll show the mechanic's name and live position as soon as someone accepts.
              </p>
            )}
          </section>
        ) : (
          <section className="mt-5">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground">
              What are the problems?
            </h2>
            <p dir="rtl" lang="ur" className="font-urdu mt-1 text-sm text-muted-foreground">
              آپ کی بائیک میں کیا مسئلہ ہے؟
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PROBLEMS.map(({ key, ur, Icon }) => {
                const on = problem === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setProblem(key)}
                    aria-pressed={on}
                    className={`card-lift rounded-2xl border-2 p-4 text-left transition-colors ${
                      on ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/50"
                    }`}
                  >
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-xl ${
                        on ? "bg-primary text-primary-foreground" : "bg-surface-2 text-primary"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="mt-3 block font-display text-sm font-semibold uppercase tracking-wide text-foreground">
                      {key}
                    </span>
                    <span dir="rtl" lang="ur" className="font-urdu block text-xs text-muted-foreground">
                      {ur}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-border bg-surface p-4">
              <Field label="Bike model" ur="بائیک کا ماڈل" value={bikeModel} onChange={setBikeModel} placeholder="Honda CD 70" />
              <Field
                label="Bike registration number"
                ur="رجسٹریشن نمبر"
                value={bikeReg}
                onChange={setBikeReg}
                placeholder="LEB-1234"
              />
              <Field
                label="Nearby landmark"
                ur="قریبی نشانی"
                value={landmark}
                onChange={setLandmark}
                placeholder="Opposite Shell pump, Ferozepur Road"
              />
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {problem === "Other" ? "Describe the problem" : "Anything else we should know?"}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Bike won't start after rain…"
                  className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 font-display text-base font-semibold uppercase tracking-wide text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              Request a mechanic
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Field({
  label,
  ur,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  ur: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <span dir="rtl" lang="ur" className="font-urdu text-xs text-muted-foreground">
          {ur}
        </span>
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}
