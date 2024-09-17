import { Context } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import { approvePlugin, getPluginsPending, rejectPlugin } from "../services/services.ts";
import { sanitizeBody } from "../../../shared/utils/sanitizeInput.ts";

export async function approve(ctx: Context) {
    try {
        const sanitizedBody = await sanitizeBody(ctx);
        const { repo_id, owner } = sanitizedBody;
        if (!repo_id || !owner) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid request body" };
            return;
        }
        const success = await approvePlugin(String(repo_id), String(owner));
        if (success) {
            ctx.response.body = { message: "Plugin approved successfully" };
        } else {
            ctx.response.status = 500;
            ctx.response.body = { error: "Error approving plugin" };
        }
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Error approving plugin: " + error.message };
    }
}

export async function reject(ctx: Context) {
    try {
        const sanitizedBody = await sanitizeBody(ctx);
        const { repo_id, owner } = sanitizedBody;
        if (!repo_id || !owner) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid request body" };
            return;
        }
        const success = await rejectPlugin(String(repo_id), String(owner));
        if (success) {
            ctx.response.body = { message: "Plugin rejected successfully" };
        } else {
            ctx.response.status = 500;
            ctx.response.body = { error: "Error rejecting plugin" };
        }
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Error rejecting plugin: " + error.message };
    }
}
    

export async function getPending(ctx: Context) {
    try {
        const pluginsPending = await getPluginsPending();
        if (!pluginsPending) {
            ctx.response.status = 500;
            ctx.response.body = { error: "Error fetching pending plugins" };
            return;
        }
        ctx.response.body = pluginsPending;
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Error fetching pending plugins: " + error.message };
    }
}
