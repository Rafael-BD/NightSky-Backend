import { uuid } from "../../../../../../AppData/Local/deno/npm/registry.npmjs.org/@supabase/auth-js/2.65.0/dist/module/lib/helpers.d.ts";
import { Plugin, PluginPending } from "../../../shared/types.ts";
import { supabaseSvc } from "../../../shared/utils/supabaseClient.ts";

export async function uploadPluginFileToPendingBucket(file: File, uuid: string): Promise<boolean> {
    try {
        const bucketName = 'plugins_pending';
        const bucketPath = `${uuid}.zip`;
        // Verificar depois se ja existe um arquivo com o mesmo nome (necessário mudar a indentificação do arquivo para um id único)

        const { error } = await supabaseSvc.storage
            .from(bucketName)
            .upload(bucketPath, file, {
                contentType: 'application/zip'
            });

        if (error) {
            console.error('Error uploading file to bucket:', error);
            return false;
        }

        console.log('File uploaded successfully:', file.name);
        return true;
        
    } catch (error) {
        console.error('Error uploading file to bucket:', error);
        return false;
    }
}

async function uploadPluginFileToBucket(plugin: Plugin): Promise<string | null> {
    try {
        const pendingBucketName = 'plugins_pending';
        const bucketName = 'Plugins';
        const bucketPath = `${plugin.uuid}.zip`;

        const {error: errorDeleteExisting } = await supabaseSvc.storage
            .from(bucketName)
            .remove([bucketPath]);

        if (errorDeleteExisting) {
            throw errorDeleteExisting;
        }

        const { data, error } = await supabaseSvc.storage
            .from(pendingBucketName)
            .copy(bucketPath, bucketPath, {
                destinationBucket: bucketName
            });

        const { error: errorDelete } = await supabaseSvc.storage
            .from(pendingBucketName)
            .remove([bucketPath]);

        if (error || errorDelete) {
            throw error;
        }

        if (data) {
            const { data } = supabaseSvc.storage
                .from(bucketName)
                .getPublicUrl(bucketPath);

            if (!data.publicUrl) {
                console.error('Error getting public URL for file:', plugin.plugin_name);
                return null;
            }

            console.log('File moved successfully:', plugin.plugin_name);
            return data.publicUrl;
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

        if (!bucket_url) {
            throw new Error('Error moving file to bucket');
        }

        if (plugin) {
            const { error: errorUpdate } = await supabaseSvc
                .from("plugins")
                .update({
                    plugin_name: pluginPending.plugin_name,
                    categories: pluginPending.categories,
                    version: pluginPending.version,
                    updated_at: new Date().toISOString(),
                    created_at: plugin.created_at,
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
                    repo_id: pluginPending.repo_id,
                    bucket_url: bucket_url,
                    status: 1,
                    uuid: pluginPending.uuid,
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
            .remove([`${plugin_name}.zip`]);
        
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
            console.error('Error updating analysis:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating analysis:', error);
        return false;
    }
}