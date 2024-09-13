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
