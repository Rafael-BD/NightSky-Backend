import { Context } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import * as ammonia from "https://deno.land/x/ammonia@0.3.1/mod.ts";
await ammonia.init();

function sanitize(value: string): string {
    return ammonia.clean(value);
}

export function sanitizeQueryParams(ctx: Context): Record<string, string> {
    const queryParams = ctx.request.url.searchParams;
    const sanitizedParams: Record<string, string> = {};

    queryParams.forEach((value, key) => {
        sanitizedParams[key] = sanitize(value);
    });

    return sanitizedParams;
}

export async function sanitizeBody(ctx: Context): Promise<Record<string, string>> {
    if(!ctx.request.hasBody) {
        return {};
    }
    const body = await ctx.request.body.json();
    const sanitizedBody: Record<string, string> = {};

    for (const [key, value] of Object.entries(body)) {
        sanitizedBody[key] = sanitize(value as string);
    }

    return sanitizedBody;
}

export function sanitizeInput(value: string): string {
    return sanitize(value);
}
