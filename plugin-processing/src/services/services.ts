import { Plugin, PluginPending } from "../../../shared/types.ts";
import { supabaseSvc } from "../../../shared/utils/supabaseClient.ts";

export async function uploadPluginFileToPendingBucket(plugin: PluginPending, file: File): Promise<string | null> {
    try {
        const bucketName = 'plugins_pending';
        const bucketPath = `${plugin.plugin_name}/${file.name}`;

        const { data, error } = await supabaseSvc.storage
            .from(bucketName)
            .upload(bucketPath, file);

        if (error) {
            throw error;
        }

        if (data) {
            const { publicUrl } = supabaseSvc.storage
                .from(bucketName)
                .getPublicUrl(bucketPath);

            if (!publicUrl) {
                console.error('Error getting public URL for file:', file.name);
                return null;
            }

            console.log('File uploaded successfully:', file.name);
            return publicUrl;
        } else {
            console.error('File upload failed: No data returned');
            return null;
        }
    } catch (error) {
        console.error('Error uploading file to bucket:', error);
        return null;
    }
}

async function uploadPluginFileToBucket(plugin: Plugin): Promise<string | null> {
    try {
        const bucketName = 'Plugins';
        const bucketPath = `${plugin.plugin_name}/${plugin.plugin_name}.zip`;

        const { data, error } = await supabaseSvc.storage
            .from(bucketName)
            .move(`${plugin.plugin_name}/${plugin.plugin_name}.zip`, bucketPath);

        if (error) {
            throw error;
        }

        if (data) {
            const { publicUrl } = supabaseSvc.storage
                .from(bucketName)
                .getPublicUrl(bucketPath);

            if (!publicUrl) {
                console.error('Error getting public URL for file:', plugin.plugin_name);
                return null;
            }

            console.log('File moved successfully:', plugin.plugin_name);
            return publicUrl;
        } else {
            console.error('File move failed: No data returned');
            return null;
        }
    } catch (error) {
        console.error('Error moving file to bucket:', error);
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

export async function rejectPlugin(repo_id: string, owner: string, plugin_name: string): Promise<boolean> {
    try {
        const { error } = await supabaseSvc
            .from("plugins_pending")
            .delete()
            .eq("repo_id", repo_id)
            .eq("owner", owner);

        if (error) {
            throw new Error(error.message);
        }

        const {error: errorFiles } = await supabaseSvc.storage
            .from('plugins_pending')
            .delete()
            .eq('plugin_name', plugin_name);
        
        if (errorFiles) {
            throw new Error(errorFiles.message);
        }

        return true;
    } catch (error) {
        console.error('Error rejecting plugin:', error);
        return false;
    }
}

export async function getPluginsPending(): Promise<PluginPending[] | null> {
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