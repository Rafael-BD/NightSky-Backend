import { Context } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import { sanitizeBody } from "../../../shared/utils/sanitizeInput.ts";
import { checkIfExists, createStoreInDB, updateAccount, deleteAccountInDB } from "../services/authService.ts";

export async function checkIfUserExists(ctx: Context) {
    try {
        const decodedToken = decodeURIComponent(ctx.request.url.searchParams.get("github_access_token") || "");  
        const status = await checkIfExists(decodedToken);
        ctx.response.status = status ? 200 : 404;
    }
    catch (error) {
        ctx.response.body = { error: error.message };
        ctx.response.status = 500;
    }
}

export async function createStore(ctx: Context) {
    try {
        const sanitizedBody = await sanitizeBody(ctx);
        const { github_access_token } = sanitizedBody;
        const { name } = sanitizedBody;
        const status = await createStoreInDB(github_access_token as string, name as string);
        ctx.response.status = status ? 201 : 500;
    }
    catch (error) {
        console.log("error", error);
        ctx.response.body = { error: error.message };
        ctx.response.status = 500;
    }
}

export async function updateStore(ctx: Context) {
    try {
        const sanitizedBody = await sanitizeBody(ctx);
        const { github_access_token } = sanitizedBody;
        const { name } = sanitizedBody;
        const { email } = sanitizedBody;
        const status = await updateAccount(name as string, github_access_token as string, (email || "") as string);
        ctx.response.status = status ? 204 : 500;
    }
    catch (error) {
        ctx.response.body = { error: error.message };
        ctx.response.status = 500;
    }
}

export async function deleteAccount(ctx: Context) {
    try {
        const sanitizedBody = await sanitizeBody(ctx);
        const { github_access_token } = sanitizedBody;
        const status = await deleteAccountInDB(github_access_token as string);
        ctx.response.status = status ? 204 : 500;

    }
    catch (error) {
        ctx.response.body = { error: error.message };
        ctx.response.status = 500;
    }
}
