import { Plugin } from "../../../shared/types.ts";
import { supabaseSvc } from "../../../shared/utils/supabaseClient.ts";

async function uploadPluginFileToBucket(plugin: Plugin): Promise<string | null> {
    try {
        const bucketName = 'Plugins';
        const bucketPath = `${plugin.plugin_name}`;
        const filePath = Deno.env.get("EXTRACT_PATH") + `/${plugin.plugin_name}.zip/`;

        if(!filePath) {
            console.error('Error getting file path for plugin from env:', plugin.plugin_name);
            return null;
        }

        const file = new File([await Deno.readFile(filePath)], plugin.plugin_name);
        
        const { data, error } = await supabaseSvc.storage
            .from(bucketName)
            .upload(bucketPath, file);

        if (error) {
            throw error;
        }

        if (data) {
            const { data } = supabaseSvc.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            if (!data) {
                console.error('Error getting public URL for file:', file.name);
                return null;
            }

            console.log('File uploaded successfully:', file.name);
            return data.publicUrl;
        } else {
            console.error('File upload failed: No data returned');
            return null;
        }
    } catch (error) {
        console.error('Error uploading file to bucket:', error);
        return null;
    }
}

export async function approvePlugin(repo_id: string, owner: string): Promise<boolean> {
    try {
        const { data: pluginsPending, error: errorPending } = await supabaseSvc
            .from("plugins_pending")
            .select("*")
            .eq("repo_id", repo_id)
            .eq("owner", owner);

        if (errorPending || !pluginsPending || pluginsPending.length === 0) {
            throw new Error(errorPending?.message || "Plugin not found");
        }

        const pluginPending = pluginsPending[0];

        const { data: plugins, error: errorPlugins } = await supabaseSvc
            .from("plugins")
            .select("*")
            .eq("repo_id", repo_id)
            .eq("owner", owner);

        if (errorPlugins) {
            throw new Error(errorPlugins.message);
        }

        const plugin = plugins ? plugins[0] : null;

        const bucket_url = await uploadPluginFileToBucket(pluginPending);

        if (plugin) {
            const { error: errorUpdate } = await supabaseSvc
                .from("plugins")
                .update({
                    plugin_name: pluginPending.plugin_name,
                    categories: pluginPending.categories,
                    version: pluginPending.version,
                    updated_at: new Date().toISOString(),
                    repo_url: pluginPending.repo_url,
                    bucket_url: bucket_url,
                    status: 1,
                    branch: pluginPending.branch,
                })
                .eq("plugin_id", plugin.plugin_id);

            if (errorUpdate) {
                throw new Error(errorUpdate.message);
            }
        } else {
            const { error: errorInsert } = await supabaseSvc
                .from("plugins")
                .insert({
                    plugin_name: pluginPending.plugin_name,
                    owner: pluginPending.owner,
                    categories: pluginPending.categories,
                    created_at: new Date().toISOString(),
                    repo_url: pluginPending.repo_url,
                    branch: pluginPending.branch,
                });

            if (errorInsert) {
                throw new Error(errorInsert.message);
            }
        }

        const { error: errorDelete } = await supabaseSvc
            .from("plugins_pending")
            .delete()
            .eq("repo_id", repo_id)
            .eq("owner", owner);

        if (errorDelete) {
            throw new Error(errorDelete.message);
        }

        return true;
    } catch (error) {
        console.error('Error approving plugin:', error);
        return false;
    }
}

export async function rejectPlugin(repo_id: string, owner: string): Promise<boolean> {
    try {
        const { error } = await supabaseSvc
            .from("plugins_pending")
            .delete()
            .eq("repo_id", repo_id)
            .eq("owner", owner);

        if (error) {
            throw new Error(error.message);
        }

        return true;
    } catch (error) {
        console.error('Error rejecting plugin:', error);
        return false;
    }
}

export async function getPluginsPending(): Promise<Plugin[] | null> {
    try {
        const { data, error } = await supabaseSvc
            .from("plugins_pending")
            .select("*");

        if (error) {
            throw new Error(error.message);
        }

        return data;
    } catch (error) {
        console.error('Error fetching pending plugins:', error);
        return null;
    }
}

export async function updateAnalysis(plugin_id: string, analysis: Record<string, unknown>, status: number): Promise<boolean> {
    try {
        const { error } = await supabaseSvc
            .from("plugins_pending")
            .update({ analysis_result: analysis, status_analysis: status })
            .eq("plugin_id", plugin_id);

        if (error) {
            throw error;
        }

        return true;
    } catch (error) {
        console.error('Error updating analysis:', error);
        return false;
    }
}


