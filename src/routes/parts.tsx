import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";

type Part = {
  id: string;
  category: string;
  name_en: string;
  name_ur: string;
  price_min: number;
  price_max: number;
  unit: string;
  sort_order: number;
};

export const Route = createFileRoute("/parts")({
  head: () => ({
    meta: [
      { title: "Mechanical Parts Rate List — BikeMadad" },
      {
        name: "description",
        content:
          "Typical bike spare part and labour rates in Pakistani Rupees — tyres, engine oil, brakes, electrical, chain and more.",
      },
      { property: "og:title", content: "Mechanical Parts Rate List — BikeMadad" },
      {
        property: "og:description",
        content: "Check fair prices for bike parts and labour before you pay.",
      },
    ],
  }),
  component: PartsPage,
});

const money = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

function PartsPage() {
  const [q, setQ] = useState("");
  const { theme } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ["parts_prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts_prices")
        .select("*")
        .order("category")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Part[];
    },
  });

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = (data ?? []).filter(
      (p) =>
        !term ||
        p.name_en.toLowerCase().includes(term) ||
        p.name_ur.includes(q.trim()) ||
        p.category.toLowerCase().includes(term),
    );
    const map = new Map<string, Part[]>();
    for (const row of rows) {
      const list = map.get(row.category) ?? [];
      list.push(row);
      map.set(row.category, list);
    }
    return [...map.entries()];
  }, [data, q]);

  return (
    <main className="min-h-screen bg-background" data-theme={theme}>
      <div className="mx-auto max-w-3xl px-4 pb-14 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="mt-5 font-display text-3xl font-bold uppercase tracking-wide text-foreground">
          Mechanical parts rate list
        </h1>
        <p dir="rtl" lang="ur" className="font-urdu mt-1 text-[15px] text-muted-foreground">
          پرزوں اور مزدوری کی عام قیمتیں
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Typical market ranges so you know a fair price before the work starts. Final price depends on
          brand and bike model.
        </p>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a part, e.g. tube, oil, brake"
            aria-label="Search parts"
            className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading rates…</p>
        ) : groups.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Nothing matched “{q}”.</p>
        ) : (
          <div className="mt-6 space-y-6">
            {groups.map(([category, rows]) => (
              <section key={category} className="overflow-hidden rounded-2xl border border-border bg-surface">
                <h2 className="border-b border-border bg-surface-2 px-4 py-3 font-display text-sm font-semibold uppercase tracking-widest text-accent">
                  {category}
                </h2>
                <ul className="divide-y divide-border">
                  {rows.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{p.name_en}</p>
                        <p dir="rtl" lang="ur" className="font-urdu truncate text-xs text-muted-foreground">
                          {p.name_ur}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-sm font-semibold text-foreground">
                          {p.price_min === p.price_max
                            ? money(p.price_min)
                            : `${money(p.price_min)} – ${money(p.price_max)}`}
                        </p>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.unit}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
