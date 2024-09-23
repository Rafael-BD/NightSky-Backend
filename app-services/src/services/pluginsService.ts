import { supabase } from "../../../shared/utils/supabaseClient.ts";

export async function fetchPlugins(start: number, end: number) {
    const { data, error } = await supabase
        .from("plugins")
        .select("*")
        .range(start, end);

    if (error) {
        throw new Error(error.message);
    }
    const filteredData = data.filter((plugin: { status: number; }) => plugin.status === 1)
        .map((plugin: { plugin_id: bigint; plugin_name: string; owner: string; categories: string[]; downloads: number; version: number; updated_at: string; created_at: string; repo_url: string; bucket_url: string; uuid: string; }) => {
            const { plugin_id, plugin_name, owner, categories, downloads, version, updated_at, created_at, repo_url, bucket_url, uuid } = plugin;
            return { plugin_id, plugin_name, owner, categories, downloads, version, updated_at, created_at, repo_url, bucket_url, uuid };
        });
    return filteredData;
}

export async function searchPluginsByName(query: string) {
    const { data, error } = await supabase
        .from("plugins")
        .select("*")
        .ilike("plugin_name", `%${query}%`);

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

export async function fetchCategories() {
    const { data, error } = await supabase
        .from("categories")
        .select("*");

    if (error) {
        throw new Error(error.message);
    }
    // deno-lint-ignore no-explicit-any
    return data.map((category: any) => category.name);
}
