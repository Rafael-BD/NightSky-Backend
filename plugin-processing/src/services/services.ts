import { PostgrestError } from 'npm:@supabase/supabase-js@2.45.4';
import { Plugin } from "../../../shared/types.ts";
import { supabaseSvc } from "../../../shared/utils/supabaseClient.ts";


export function aprovePlugin(repo_id: string, owner: string) {
    return new Promise((resolve, reject) => {
        supabaseSvc
            .from("plugins_pending")
            .select("*")
            .eq("repo_id", repo_id)
            .eq("owner", owner)
            .then(({ data: pluginsPending, error: errorPending }: { data: Plugin[], error: PostgrestError }) => {
                if (errorPending) {
                    return reject(errorPending);
                }

                const pluginPending = pluginsPending[0];

                if (!pluginPending) {
                    return reject(new Error("Plugin not found"));
                }

                return supabaseSvc
                    .from("plugins")
                    .select("*")
                    .eq("repo_id", repo_id)
                    .eq("owner", owner)
                    .then(({ data: plugins, error: errorPlugins }: { data: Plugin[], error: PostgrestError }) => {
                        if (errorPlugins) {
                            return reject(errorPlugins);
                        }

                        const plugin = plugins[0];

                        if (plugin) {
                            return supabaseSvc
                                .from("plugins")
                                .update({
                                    plugin_name: pluginPending.plugin_name,
                                    categories: pluginPending.categories,
                                    version: pluginPending.version,
                                    updated_at: new Date().toISOString(),
                                    repo_url: pluginPending.repo_url,
                                    bucket_url: pluginPending.bucket_url, // Modificar depois para criar um novo bucket
                                    status: 1,
                                    branch: pluginPending.branch,
                                })
                                .eq("plugin_id", plugin.plugin_id)
                                .then(({ error: errorUpdate }: { error: PostgrestError | null }) => {
                                    if (errorUpdate) {
                                        return reject(errorUpdate);
                                    }
                                });
                        } else {
                            return supabaseSvc
                                .from("plugins")
                                .insert({
                                    plugin_name: pluginPending.plugin_name,
                                    owner: pluginPending.owner,
                                    categories: pluginPending.categories,
                                    created_at: new Date().toISOString(),
                                    repo_url: pluginPending.repo_url,
                                    branch: pluginPending.branch,
                                })
                                .then(({ error: errorInsert }: { error: PostgrestError | null }) => {
                                    if (errorInsert) {
                                        return reject(errorInsert);
                                    }
                                });
                        }
                    })
                    .then(() => {
                        return supabaseSvc
                            .from("plugins_pending")
                            .delete()
                            .eq("repo_id", repo_id)
                            .eq("owner", owner)
                            .then(({ error: errorDelete }: { error: PostgrestError | null }) => {
                                if (errorDelete) {
                                    return reject(errorDelete);
                                }
                                resolve(true);
                            });
                    });
            })
            .catch(reject);
    });
}

export function rejectPlugin(repo_id: string, owner: string) {
    return new Promise((resolve, reject) => {
        supabaseSvc
            .from("plugins_pending")
            .delete()
            .eq("repo_id", repo_id)
            .eq("owner", owner)
            .then(({ error }: { error: PostgrestError | null }) => {
                if (error) {
                    return reject(error);
                }
                resolve(true);
            })
            .catch(reject);
    });
}


