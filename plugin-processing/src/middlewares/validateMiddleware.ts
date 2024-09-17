import { Context } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import { validate, required, isString } from "https://deno.land/x/validasaur@v0.15.0/mod.ts";
import { isEscape } from "https://deno.land/x/escape@1.4.2/mod.ts";
import { validateAdminToken } from  "../../../shared/utils/validateToken.ts";


export default async function validateMiddleware(ctx: Context, next: () => Promise<unknown>) {
    const url = ctx.request.url;
    const token = ctx.request.headers.get("Authorization")?.toString() || "";

    const [passes] = await validate({ value: token }, { value: [required, isString] });
    if(isEscape(token) || !passes) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid token" };
        return;
    }

    if (url.pathname === "admin/plugins/approve" || url.pathname === "admin/plugins/reject" || url.pathname === "admin/plugins/pending") {
        const isValidToken = await validateAdminToken(token);
        if (!isValidToken) {
            ctx.response.status = 401;
            ctx.response.body = { error: "Unauthorized" };
            return;
        }
    }

    await next();
}