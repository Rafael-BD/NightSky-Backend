import { Context } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import { sanitizeBody, sanitizeInput } from "../../../shared/utils/sanitizeInput.ts";
import { fetchStorePluginsSvc, createPluginSvc, updatePluginSvc, deletePluginSvc, getUserReposSvc } from "../services/pluginsService.ts";

export const fetchStorePlugins = async (ctx: Context) => {
    const decodedToken = decodeURIComponent(ctx.request.url.searchParams.get("github_access_token") || "");  
    const sanitizedToken = sanitizeInput(decodedToken);
    const plugins = await fetchStorePluginsSvc(sanitizedToken);
    ctx.response.body = plugins;
};

export const createPlugin = async (ctx: Context) => {
    const sanitizedBody = await sanitizeBody(ctx) as { github_access_token: string; name: string; repo_id: string; categories: string | string[]; branch: string; };
    const { github_access_token, name, repo_id, categories, branch } = sanitizedBody;
    const status = await createPluginSvc(github_access_token, name, repo_id, Array.isArray(categories) ? categories : [categories], branch);
    ctx.response.status = status ? 201 : 500;
};

export const updatePlugin = async (ctx: Context) => {
    const sanitizedBody = await sanitizeBody(ctx) as { github_access_token: string; name: string; plugin_id: string; repo_id:string; categories: string | string[]; branch: string; };
    const { github_access_token, name, plugin_id, repo_id, categories, branch } = sanitizedBody;
    const status = await updatePluginSvc(github_access_token, name, plugin_id, repo_id, Array.isArray(categories) ? categories : [categories], branch);
    ctx.response.status = status ? 204 : 500;
};

export const deletePlugin = async (ctx: Context) => {
    const sanitizedBody = await sanitizeBody(ctx) as { github_access_token: string; repo_id: string; };
    const { github_access_token, repo_id } = sanitizedBody;
    const status = await deletePluginSvc(github_access_token, repo_id);
    ctx.response.status = status ? 204 : 500;
};

export const getUserRepos = async (ctx: Context) => {
    const decodedToken = decodeURIComponent(ctx.request.url.searchParams.get("github_access_token") || "");
    const sanitizedToken = sanitizeInput(decodedToken);
    const repos = await getUserReposSvc(sanitizedToken);
    ctx.response.body = repos;
};