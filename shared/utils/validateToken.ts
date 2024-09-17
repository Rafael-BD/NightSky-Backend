import { getGithubUserId } from "./getGithubId.ts";
import { supabaseSvc } from "./supabaseClient.ts";

export async function validateAdminToken(token: string): Promise<boolean> {
    try {
        const { data, error } = await supabaseSvc
            .from("users")
            .select("roles")
            .eq("token", token);

        if (error) {
            throw new Error(error.message);
        }

        return data && data.length > 0 && data[0].roles.includes('admin');
    } catch (error) {
        console.error('Error validating admin token:', error);
        return false;
    }
}

export async function validateStoreToken(token: string): Promise<boolean> {
    try {
        const githubId = getGithubUserId(token);
        const { data, error } = await supabaseSvc
            .from("stores")
            .select("github_id")
            .eq("github_id", githubId);

        if (error) {
            throw new Error(error.message);
        }

        return data && data.length > 0;
    }
    catch (error) {
        console.error('Error validating store token:', error);
        return false;
    }
}
