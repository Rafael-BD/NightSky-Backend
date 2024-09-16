import { Context } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import { validate, required, isString } from "https://deno.land/x/validasaur@v0.15.0/mod.ts";
import { isEscape } from "https://deno.land/x/escape@1.4.2/mod.ts";


export default async function validateMiddleware(ctx: Context, next: () => Promise<unknown>) {
    const pathname = ctx.request.url.pathname;
    const method = ctx.request.method;

    // auth -----------------------------------------------------------------------------
    if (pathname === "/auth/checkuser" && method === "GET") {
        let github_access_token = ctx.request.url.searchParams.get("github_access_token");
        if (github_access_token) {
            const decodedToken = decodeURIComponent(github_access_token);
            github_access_token = decodedToken;
        }

        const [passes] = await validate({ github_access_token }, {
            github_access_token: [required, isString],
        });

        if (!passes || github_access_token === null || isEscape(github_access_token)) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid input" };
            return;
        }
    }

    // plugins -----------------------------------------------------------------------------
    if (pathname === "/store/plugins" && method === "GET") {
        let github_access_token = ctx.request.url.searchParams.get("github_access_token");
        if (github_access_token) {
            const decodedToken = decodeURIComponent(github_access_token);
            github_access_token = decodedToken;
        }

        const [passes] = await validate({ github_access_token }, {
            github_access_token: [required, isString],
        });

        if (!passes || github_access_token === null || isEscape(github_access_token)) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid input" };
            return;
        }
    }

    if (pathname === "/user/repos" && method === "GET") {
        let github_access_token = ctx.request.url.searchParams.get("github_access_token");
        if (github_access_token) {
            const decodedToken = decodeURIComponent(github_access_token);
            github_access_token = decodedToken;
        }

        const [passes] = await validate({ github_access_token }, {
            github_access_token: [required, isString],
        });

        if (!passes || github_access_token === null || isEscape(github_access_token)) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid input" };
            return;
        }
    }

    await next();
}