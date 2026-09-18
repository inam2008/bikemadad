import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, MessageCircle, Smartphone, ShieldCheck, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { requestOtp, verifyOtp } from "@/lib/otp.functions";

export const Route = createFileRoute("/auth/$role")({
  head: () => ({
    meta: [
      { title: "Sign in — BikeMadad" },
      { name: "description", content: "Verify your phone number to use BikeMadad." },
      { property: "og:title", content: "Sign in — BikeMadad" },
      { property: "og:description", content: "Verify your phone number to use BikeMadad." },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const { role: rawRole } = Route.useParams();
  const role = rawRole === "mechanic" ? "mechanic" : "customer";
  const navigate = useNavigate();

  const sendCode = useServerFn(requestOtp);
  const checkCode = useServerFn(verifyOtp);

  const [step, setStep] = useState<"details" | "code">("details");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
  const [code, setCode] = useState("");
  const [hintCode, setHintCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isMechanic = role === "mechanic";

  const onSend = async () => {
    if (fullName.trim().length < 2) {
      toast.error("Please enter your full name");
      return;
    }
    if (phone.replace(/[^0-9]/g, "").length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (isMechanic && cnic.replace(/[^0-9]/g, "").length !== 13) {
      toast.error("Please enter your 13-digit CNIC number");
      return;
    }
    if (isMechanic && !idFile) {
      toast.error("Please attach a photo of your CNIC / ID");
      return;
    }


    setBusy(true);
    try {
      const res = await sendCode({ data: { phone, channel } });
      setHintCode(res.code);
      setStep("code");
      toast.success(`Code ready for +${res.phone}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    if (!/^[0-9]{6}$/.test(code)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const creds = await checkCode({
        data: { phone, code, role, fullName, ...(isMechanic ? { cnic } : {}) },
      });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });
      if (error) throw error;

      if (isMechanic && idFile && data.user) {
        const ext = idFile.name.split(".").pop() ?? "jpg";
        const path = `${data.user.id}/id.${ext}`;
        const up = await supabase.storage.from("mechanic-ids").upload(path, idFile, { upsert: true });
        if (!up.error) {
          await supabase.from("profiles").update({ id_photo_url: path }).eq("id", data.user.id);
        }
      }

      toast.success("Verified. Welcome to BikeMadad!");
      navigate({ to: isMechanic ? "/mechanic" : "/customer" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-14 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Change role
        </Link>

        <div className="mt-7">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {isMechanic ? "Mechanic" : "Customer"}
          </p>
          <h1 className="font-display text-[2rem] font-bold uppercase leading-[1.08] tracking-wide text-foreground">
            {step === "details" ? "Verify your number" : "Enter your code"}
          </h1>
          <p dir="rtl" lang="ur" className="font-urdu mt-1.5 text-[15px] text-muted-foreground">
            {step === "details" ? "اپنا نمبر تصدیق کریں" : "کوڈ درج کریں"}
          </p>
        </div>

        {step === "details" ? (
          <div className="mt-7 space-y-4">
            <Field label="Full name" urdu="پورا نام">
              <input
                aria-label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={80}
                placeholder="e.g. Ahmed Raza"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </Field>

            <Field label="Phone number" urdu="فون نمبر">
              <input
                aria-label="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                maxLength={20}
                placeholder="0300 1234567"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </Field>

            {isMechanic ? (
              <>
                <Field label="CNIC / National ID number" urdu="شناختی کارڈ نمبر">
                  <input
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    inputMode="numeric"
                    maxLength={20}
                    placeholder="35202-1234567-1"
                    className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </Field>

                <Field label="Photo of your CNIC / ID" urdu="شناختی کارڈ کی تصویر">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-4 py-4 text-sm text-muted-foreground">
                    <Upload className="h-5 w-5 shrink-0 text-primary" />
                    <span className="min-w-0 truncate">{idFile ? idFile.name : "Tap to attach a clear photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </Field>
              </>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Send my code by</p>
              <div className="grid grid-cols-2 gap-3">
                <ChannelButton
                  active={channel === "sms"}
                  onClick={() => setChannel("sms")}
                  icon={<Smartphone className="h-4 w-4" />}
                  label="SMS"
                />
                <ChannelButton
                  active={channel === "whatsapp"}
                  onClick={() => setChannel("whatsapp")}
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="WhatsApp"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={onSend}
              className="w-full rounded-full bg-primary px-5 py-4 font-display text-base font-semibold uppercase tracking-wide text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </div>
        ) : (
          <div className="mt-7 space-y-4">
            <Field label="6-digit code" urdu="چھ ہندسوں کا کوڈ">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="••••••"
                className="w-full rounded-xl border border-border bg-surface px-4 py-4 text-center font-display text-2xl tracking-[0.5em] text-foreground outline-none focus:border-primary"
              />
            </Field>

            {hintCode ? (
              <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-xs leading-relaxed text-foreground">
                  Your code is <span className="font-display text-base tracking-widest text-accent">{hintCode}</span>.
                  It is shown here because SMS and WhatsApp sending isn't switched on yet.
                </p>
              </div>
            ) : null}

            <button
              type="button"
              disabled={busy}
              onClick={onVerify}
              className="w-full rounded-full bg-accent px-5 py-4 font-display text-base font-semibold uppercase tracking-wide text-accent-foreground disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Verify & continue"}
            </button>
            <button
              type="button"
              onClick={() => setStep("details")}
              className="w-full text-center text-sm text-muted-foreground"
            >
              Change details
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, urdu, children }: { label: string; urdu: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span dir="rtl" lang="ur" className="font-urdu text-xs text-muted-foreground">
          {urdu}
        </span>
      </span>
      {children}
    </label>
  );
}

function ChannelButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-display text-sm font-semibold tracking-wide ${
        active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
