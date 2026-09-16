import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(10, "Enter a valid phone number")
  .max(20)
  .regex(/^[0-9+\-\s]+$/, "Enter a valid phone number");

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "");
  const local = digits.replace(/^0+/, "").replace(/^92/, "");
  return `92${local}`;
}

function syntheticEmail(phone: string) {
  return `p${phone}@bikemadad.app`;
}

export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; channel: "sms" | "whatsapp" }) =>
    z.object({ phone: phoneSchema, channel: z.enum(["sms", "whatsapp"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    const code = String(Math.floor(100000 + Math.random() * 900000));

    const { error } = await supabaseAdmin.from("phone_otps").insert({
      phone,
      code,
      channel: data.channel,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) throw new Error(error.message);

    // No SMS/WhatsApp sending provider is connected yet, so the code is
    // returned to the app and shown on screen. Once a messaging provider is
    // connected, send it over the chosen channel and stop returning it here.
    return { phone, code, delivered: false as const };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      phone: string;
      code: string;
      role: "customer" | "mechanic";
      fullName: string;
      cnic?: string;
    }) =>
      z
        .object({
          phone: phoneSchema,
          code: z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code"),
          role: z.enum(["customer", "mechanic"]),
          fullName: z.string().trim().min(2, "Enter your full name").max(80),
          cnic: z.string().trim().max(20).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);

    const { data: otp } = await supabaseAdmin
      .from("phone_otps")
      .select("*")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) throw new Error("No active code. Please request a new one.");
    if (new Date(otp.expires_at).getTime() < Date.now()) throw new Error("That code expired. Request a new one.");
    if (otp.attempts >= 5) throw new Error("Too many attempts. Request a new code.");
    if (otp.code !== data.code) {
      await supabaseAdmin
        .from("phone_otps")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otp.id);
      throw new Error("That code is not correct.");
    }
    await supabaseAdmin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

    const email = syntheticEmail(phone);
    const password = crypto.randomUUID() + crypto.randomUUID();

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("phone", phone)
      .maybeSingle();

    let userId = existing?.id ?? null;

    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (error) throw new Error(error.message);
      await supabaseAdmin
        .from("profiles")
        .update({
          full_name: data.fullName,
          role: data.role,
          ...(data.cnic ? { cnic: data.cnic } : {}),
        })
        .eq("id", userId);
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { phone, full_name: data.fullName, role: data.role },
      });
      if (created.error || !created.data.user) throw new Error(created.error?.message ?? "Could not create account");
      userId = created.data.user.id;
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        phone,
        role: data.role,
        full_name: data.fullName,
        cnic: data.cnic ?? null,
      });
      if (profileError) throw new Error(profileError.message);
    }

    return { email, password, role: data.role };
  });
