import { supabase } from "../../../shared/utils/supabaseClient.ts";

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
