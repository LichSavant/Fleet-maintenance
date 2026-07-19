import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
};

type Role = "admin" | "manager" | "mechanic" | "driver";

type RequestBody = {
  action: "create" | "update" | "deactivate";
  depot?: string;
  email?: string;
  fullName?: string;
  licenseNumber?: string;
  role?: Role;
  specialty?: string;
  userId?: string;
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

async function recordActivity(
  client: ReturnType<typeof createClient>,
  callerId: string,
  action: string,
  entityId: string,
  entityLabel: string,
) {
  const { error } = await client.from("system_activity").insert({
    action,
    entity_id: entityId,
    entity_label: entityLabel,
    entity_type: "profile",
    user_id: callerId,
  });
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization)
      return response({ error: "Missing authorization header." }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } =
      await userClient.auth.getUser();
    if (authError || !authData.user)
      return response({ error: "Invalid session." }, 401);

    const { data: caller, error: callerError } = await adminClient
      .from("profiles")
      .select("role,status")
      .eq("id", authData.user.id)
      .single();
    if (callerError || caller?.status !== "active")
      return response({ error: "Inactive or missing profile." }, 403);

    const body = (await req.json()) as RequestBody;
    if (!body.action) return response({ error: "Missing action." }, 400);

    if (body.action === "create") {
      if (!body.email || !body.fullName || !body.role)
        return response(
          { error: "Email, full name, and role are required." },
          400,
        );
      if (
        caller.role !== "admin" &&
        !(
          caller.role === "manager" &&
          ["driver", "mechanic"].includes(body.role)
        )
      ) {
        return response(
          { error: "You do not have permission to invite this role." },
          403,
        );
      }
      if (body.role === "driver" && !body.licenseNumber?.trim())
        return response({ error: "Driver license number is required." }, 400);
      if (body.role === "mechanic" && !body.specialty?.trim())
        return response({ error: "Mechanic specialty is required." }, 400);
      if (body.role === "manager" && !body.depot?.trim())
        return response({ error: "Manager depot is required." }, 400);

      const metadata = {
        depot: body.depot?.trim(),
        full_name: body.fullName.trim(),
        license_number: body.licenseNumber?.trim(),
        role: body.role,
        specialty: body.specialty?.trim(),
      };
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
        body.email.trim().toLowerCase(),
        { data: metadata },
      );
      if (error || !data.user)
        return response({ error: error?.message ?? "Invitation failed." }, 400);
      const { data: profile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();
      await recordActivity(
        adminClient,
        authData.user.id,
        `Invited ${body.role} account`,
        data.user.id,
        body.fullName.trim(),
      );
      return response({ profile });
    }

    if (!body.userId) return response({ error: "User ID is required." }, 400);
    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("id,role,status")
      .eq("id", body.userId)
      .single();
    if (targetError || !target)
      return response({ error: "Target user was not found." }, 404);
    if (
      caller.role !== "admin" &&
      !(
        caller.role === "manager" &&
        ["driver", "mechanic"].includes(target.role)
      )
    ) {
      return response(
        { error: "You do not have permission to manage this account." },
        403,
      );
    }

    if (body.action === "deactivate") {
      if (body.userId === authData.user.id)
        return response(
          { error: "You cannot deactivate your own account." },
          400,
        );
      if (target.role === "driver") {
        const { data: driver } = await adminClient
          .from("driver_profiles")
          .select("id")
          .eq("user_id", body.userId)
          .single();
        if (driver) {
          const { count } = await adminClient
            .from("vehicle_assignments")
            .select("id", { count: "exact", head: true })
            .eq("driver_profile_id", driver.id)
            .eq("status", "active");
          if ((count ?? 0) > 0)
            return response(
              {
                error:
                  "End the driver's active assignment before deactivation.",
              },
              409,
            );
        }
      }
      if (target.role === "mechanic") {
        const { data: mechanic } = await adminClient
          .from("mechanic_profiles")
          .select("id")
          .eq("user_id", body.userId)
          .single();
        if (mechanic) {
          const { count } = await adminClient
            .from("work_orders")
            .select("id", { count: "exact", head: true })
            .eq("mechanic_profile_id", mechanic.id)
            .in("status", ["assigned", "in_progress"]);
          if ((count ?? 0) > 0)
            return response(
              {
                error:
                  "Reassign or complete the mechanic's open work before deactivation.",
              },
              409,
            );
        }
      }
      const { error } = await adminClient
        .from("profiles")
        .update({ status: "inactive" })
        .eq("id", body.userId);
      if (error) return response({ error: error.message }, 400);
      if (target.role === "driver")
        await adminClient
          .from("driver_profiles")
          .update({ status: "inactive" })
          .eq("user_id", body.userId);
      if (target.role === "mechanic")
        await adminClient
          .from("mechanic_profiles")
          .update({ status: "inactive" })
          .eq("user_id", body.userId);
      const { data: profile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("id", body.userId)
        .single();
      await recordActivity(
        adminClient,
        authData.user.id,
        "Deactivated account",
        body.userId,
        String(profile?.full_name ?? body.userId),
      );
      return response({ profile });
    }

    if (body.action === "update") {
      if (!body.email || !body.fullName)
        return response({ error: "Email and full name are required." }, 400);
      if (target.role === "driver" && !body.licenseNumber?.trim())
        return response({ error: "Driver license number is required." }, 400);
      if (target.role === "mechanic" && !body.specialty?.trim())
        return response({ error: "Mechanic specialty is required." }, 400);
      if (target.role === "manager" && !body.depot?.trim())
        return response({ error: "Manager depot is required." }, 400);
      const metadata: Record<string, string> = {
        full_name: body.fullName.trim(),
        role: target.role,
      };
      if (target.role === "driver")
        metadata.license_number = body.licenseNumber?.trim() ?? "";
      if (target.role === "mechanic")
        metadata.specialty = body.specialty?.trim() ?? "";
      if (target.role === "manager") metadata.depot = body.depot?.trim() ?? "";
      const { error: authUpdateError } =
        await adminClient.auth.admin.updateUserById(body.userId, {
          email: body.email.trim().toLowerCase(),
          user_metadata: metadata,
        });
      if (authUpdateError)
        return response({ error: authUpdateError.message }, 400);
      await adminClient
        .from("profiles")
        .update({
          email: body.email.trim().toLowerCase(),
          full_name: body.fullName.trim(),
        })
        .eq("id", body.userId);
      if (target.role === "driver")
        await adminClient
          .from("driver_profiles")
          .update({ license_number: body.licenseNumber?.trim() })
          .eq("user_id", body.userId);
      if (target.role === "mechanic")
        await adminClient
          .from("mechanic_profiles")
          .update({ specialty: body.specialty?.trim() })
          .eq("user_id", body.userId);
      if (target.role === "manager")
        await adminClient
          .from("manager_profiles")
          .update({ depot: body.depot?.trim() })
          .eq("user_id", body.userId);
      const { data: profile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("id", body.userId)
        .single();
      await recordActivity(
        adminClient,
        authData.user.id,
        "Updated account",
        body.userId,
        body.fullName.trim(),
      );
      return response({ profile });
    }

    return response({ error: "Unsupported action." }, 400);
  } catch (error) {
    return response(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      500,
    );
  }
});
