import { Context } from "https://deno.land/x/oak@v13.1.0/mod.ts";

const kv = await Deno.openKv();

const MAX_REQUESTS = 15;         
const BLOCK_DURATION = 30;       
const WINDOW_DURATION = 30;      

export default async function rateLimiter(ctx: Context, next: () => Promise<unknown>) {
    const ip = ctx.request.ip || ctx.request.headers.get('x-forwarded-for') || 'unknown';
    const currentTime = Math.floor(Date.now() / 1000);

    const key = `rate_limit:${ip}`; 
    const blockedKey = `blocked:${ip}`; 

    const isBlocked = await kv.get([blockedKey]);
    console.log(isBlocked);

    if (isBlocked) {
        ctx.response.status = 429;
        ctx.response.body = {
            error: `Too many requests.`,
        };
        return;
    }

    const requestCount = await kv.get([key]);
    const newRequestCount = requestCount ? parseInt(String(requestCount.value), 10) + 1 : 1;

    if (newRequestCount === 1) {
        await kv.set([key], newRequestCount.toString(), { expireIn: WINDOW_DURATION }); 
    } else {
        await kv.set([key], newRequestCount.toString(), { expireIn: WINDOW_DURATION }); 
    }

    console.log(newRequestCount);
    if (newRequestCount > MAX_REQUESTS) {
        await kv.set([blockedKey], (currentTime + BLOCK_DURATION).toString(), { expireIn: BLOCK_DURATION }); 
        ctx.response.status = 429;
        ctx.response.body = {
            error: `Too many requests.`,
        };
        return;
    }

    await next();
}
