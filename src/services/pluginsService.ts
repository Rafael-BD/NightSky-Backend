import { supabase } from "../../shared/utils/supabaseClient.ts";

/**
 * Fetches a list of plugins from the database.
 * @param start - The start index of the range.
 * @param end - The end index of the range.
 * @returns A list of plugins.
 */
export async function fetchPlugins(start: number, end: number) {
    const { data, error } = await supabase
        .from("plugins")
        .select("*")
        .range(start, end);

    if (error) {
        throw new Error(error.message);
    }

    return data;
}


/**
 * Searches for plugins by name in the database.
 * @param query - The search query.
 * @returns A list of plugins that match the search query.
 */
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
