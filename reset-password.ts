import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Faltan variables de entorno");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function resetPassword() {
  const targetEmail = "renzz.cal.thompson@gmail.com";
  const newPassword = "NewPassword2026!";

  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = list?.users?.find(u => u.email === targetEmail);
  if (!existing) {
    console.log("Usuario no encontrado");
    return;
  }

  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password: newPassword,
  });

  if (error) {
    console.error("Error actualizando password:", error.message);
  } else {
    console.log("Password actualizado exitosamente.");
  }
}

resetPassword().catch(console.error);
