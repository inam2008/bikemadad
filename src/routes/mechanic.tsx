import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, MapPin, Navigation, Phone, CheckCircle2, Bike } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { MapView, type MapMarker } from "@/components/MapView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useGeo } from "@/lib/useGeo";

export const Route = createFileRoute("/mechanic")({
  head: () => ({
    meta: [
      { title: "Mechanic Dashboard — BikeMadad" },
      {
        name: "description",
        content: "Go online, see nearby bike repair jobs, and navigate to the customer.",
      },
      { property: "og:title", content: "Mechanic Dashboard — BikeMadad" },
      {
        property: "og:description",
        content: "Accept roadside bike jobs near you and earn on your own schedule.",
      },
    ],
  }),
  component: MechanicDashboard,
});

type Job = {
  id: string;
  status: "pending" | "accepted" | "on_the_way" | "completed" | "cancelled";
  problem_type: string;
  problem_note: string | null;
  bike_model: string | null;
  bike_reg_no: string | null;
  landmark: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  lat: number | null;
  lng: number | null;
  mechanic_id: string | null;
  created_at: string;
};

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function MechanicDashboard() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [online, setOnline] = useState(false);
  const { coords, error: geoError } = useGeo(online);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session || !profile) navigate({ to: "/" });
    else if (profile.role === "customer") navigate({ to: "/customer" });
  }, [loading, session, profile, navigate]);

  useEffect(() => {
    if (profile) setOnline(profile.is_online);
  }, [profile?.is_online, profile]);

  // Stream this mechanic's live position while online.
  useEffect(() => {
    if (!online || !session?.user || !coords) return;
    void supabase
      .from("profiles")
      .update({ lat: coords.lat, lng: coords.lng, location_updated_at: new Date().toISOString() })
      .eq("id", session.user.id);
  }, [online, coords?.lat, coords?.lng, coords, session?.user?.id, session?.user]);

  const loadJobs = async (userId: string) => {
    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .or(`status.eq.pending,mechanic_id.eq.${userId}`)
      .in("status", ["pending", "accepted", "on_the_way"])
      .order("created_at", { ascending: false });
    if (!error) setJobs((data ?? []) as Job[]);
  };

  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    void loadJobs(userId);

    const channel = supabase
      .channel("mech-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, () =>
        void loadJobs(userId),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id, session?.user]);

  const toggleOnline = async (next: boolean) => {
    if (!session?.user) return;
    setOnline(next);
    const { error } = await supabase
      .from("profiles")
      .update({ is_online: next })
      .eq("id", session.user.id);
    if (error) {
      setOnline(!next);
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success(next ? "You're online — jobs will come in" : "You're offline");
  };

  const setStatus = async (job: Job, status: Job["status"]) => {
    if (!session?.user) return;
    setBusyId(job.id);
    const patch =
      status === "accepted"
        ? { status, mechanic_id: session.user.id }
        : { status };
    const { error } = await supabase.from("service_requests").update(patch).eq("id", job.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      status === "accepted"
        ? "Job accepted — customer can see you now"
        : status === "on_the_way"
          ? "Customer told you're on the way"
          : status === "completed"
            ? "Job marked complete"
            : "Job updated",
    );
    await loadJobs(session.user.id);
  };

  const myJob = jobs.find((j) => j.mechanic_id === session?.user?.id) ?? null;
  const pending = jobs.filter((j) => j.status === "pending" && !j.mechanic_id);

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    if (coords) list.push({ id: "me", lat: coords.lat, lng: coords.lng, kind: "mechanic", label: "You" });
    const shown = myJob ? [myJob] : pending;
    for (const j of shown) {
      if (j.lat == null || j.lng == null) continue;
      list.push({
        id: j.id,
        lat: j.lat,
        lng: j.lng,
        kind: "customer",
        label: `${j.customer_name ?? "Customer"} · ${j.problem_type}`,
      });
    }
    return list;
  }, [coords, myJob, pending]);

  if (loading || !profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader subtitle={`Mechanic · ${profile.full_name.split(" ")[0]}`} />

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5">
        <section
          className={`flex items-center justify-between gap-4 rounded-2xl border-2 p-4 transition-colors ${
            online ? "border-accent bg-accent/10" : "border-border bg-surface"
          }`}
        >
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold uppercase tracking-wide text-foreground">
              {online ? "You are online" : "You are offline"}
            </p>
            <p dir="rtl" lang="ur" className="font-urdu text-sm text-muted-foreground">
              {online ? "آپ آن لائن ہیں" : "آپ آف لائن ہیں"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={online}
            aria-label="Availability"
            onClick={() => void toggleOnline(!online)}
            className={`relative h-11 w-20 shrink-0 rounded-full transition-colors ${
              online ? "bg-accent" : "bg-surface-2 border border-border"
            }`}
          >
            <span
              className={`absolute top-1 h-9 w-9 rounded-full bg-background shadow transition-all ${
                online ? "left-10" : "left-1"
              }`}
            />
          </button>
        </section>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">
          <MapView center={coords} markers={markers} className="h-60 w-full" />
          <div className="flex items-start gap-2 border-t border-border px-4 py-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-xs text-muted-foreground">
              {!online
                ? "Go online to share your live position with customers."
                : geoError
                  ? geoError
                  : coords
                    ? `Live: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                    : "Finding your location…"}
            </p>
          </div>
        </div>

        {myJob ? (
          <section className="mt-5 rounded-2xl border-2 border-accent/50 bg-surface p-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 font-display text-xs font-semibold uppercase tracking-widest text-accent">
              Current job · {myJob.status.replace(/_/g, " ")}
            </span>
            <JobBody job={myJob} coords={coords} />
            <div className="mt-4 flex flex-wrap gap-2">
              {myJob.status === "accepted" ? (
                <button
                  type="button"
                  onClick={() => void setStatus(myJob, "on_the_way")}
                  disabled={busyId === myJob.id}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-sm font-semibold uppercase tracking-wide text-primary-foreground disabled:opacity-60"
                >
                  <Navigation className="h-4 w-4" /> On the way
                </button>
              ) : null}
              {myJob.status === "on_the_way" ? (
                <button
                  type="button"
                  onClick={() => void setStatus(myJob, "completed")}
                  disabled={busyId === myJob.id}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-sm font-semibold uppercase tracking-wide text-primary-foreground disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" /> Job done
                </button>
              ) : null}
              {myJob.customer_phone ? (
                <a
                  href={`tel:+${myJob.customer_phone}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-5 py-3 font-display text-sm font-semibold uppercase tracking-wide text-foreground"
                >
                  <Phone className="h-4 w-4" /> Call
                </a>
              ) : null}
              {myJob.lat != null && myJob.lng != null ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${myJob.lat},${myJob.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-5 py-3 font-display text-sm font-semibold uppercase tracking-wide text-foreground"
                >
                  <MapPin className="h-4 w-4" /> Directions
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-foreground">
            Incoming requests
          </h2>
          <p dir="rtl" lang="ur" className="font-urdu mt-1 text-sm text-muted-foreground">
            نئی درخواستیں
          </p>

          {!online ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              You're offline. Flip the switch above to start receiving jobs.
            </p>
          ) : pending.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No requests right now. We'll show them here the moment they arrive.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {pending.map((job) => (
                <article key={job.id} className="card-lift rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15">
                        <Bike className="h-5 w-5 text-primary" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-semibold text-foreground">
                          {job.customer_name ?? "Customer"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{job.problem_type}</p>
                      </div>
                    </div>
                    {coords && job.lat != null && job.lng != null ? (
                      <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1 font-display text-xs font-semibold text-accent">
                        {distanceKm(coords, { lat: job.lat, lng: job.lng }).toFixed(1)} km
                      </span>
                    ) : null}
                  </div>
                  <JobBody job={job} coords={coords} />
                  <button
                    type="button"
                    onClick={() => void setStatus(job, "accepted")}
                    disabled={busyId === job.id || !!myJob}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 font-display text-sm font-semibold uppercase tracking-wide text-accent-foreground disabled:opacity-50"
                  >
                    {busyId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {myJob ? "Finish your current job first" : "Accept job"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function JobBody({ job, coords }: { job: Job; coords: { lat: number; lng: number } | null }) {
  return (
    <dl className="mt-3 space-y-1.5 text-sm">
      <Row label="Problem" value={job.problem_type} />
      {job.problem_note ? <Row label="Details" value={job.problem_note} /> : null}
      {job.bike_model ? <Row label="Bike" value={job.bike_model} /> : null}
      {job.bike_reg_no ? <Row label="Reg no" value={job.bike_reg_no} /> : null}
      {job.landmark ? <Row label="Landmark" value={job.landmark} /> : null}
      {coords && job.lat != null && job.lng != null ? (
        <Row label="Distance" value={`${distanceKm(coords, { lat: job.lat, lng: job.lng }).toFixed(1)} km away`} />
      ) : null}
    </dl>
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
