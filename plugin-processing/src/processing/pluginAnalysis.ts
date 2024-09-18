import { getPluginsPending, updateAnalysis, uploadPluginFileToPendingBucket } from "../services/services.ts";
import { AstAnalyser } from "npm:@nodesecure/js-x-ray";
import { PluginPending } from "../../../shared/types.ts";
import { decompress } from "https://deno.land/x/zip@v1.2.5/mod.ts";

export default async function analyzer() {
    try {
        const pluginsPending = await getPluginsPending();
        if (!pluginsPending || pluginsPending.length === 0) {
            console.log("No pending plugins found.");
            return;
        }

        const firstPluginStatusZero = pluginsPending.find((plugin) => plugin.status_analysis === 0);
        if (!firstPluginStatusZero) {
            console.log("No pending plugins found.");
            return;
        }

        const plugin = firstPluginStatusZero as PluginPending;
        const repoUrl = plugin.repo_url;
        const branch = plugin.branch;
        const zipUrl = `${repoUrl}/archive/refs/heads/${branch}.zip`;

        // Baixar o repositório como um arquivo ZIP em memória
        const response = await fetch(zipUrl);
        if (!response.ok) {
            throw new Error(`Failed to download ZIP file: ${response.statusText}`);
        }
        const zipArrayBuffer = await response.arrayBuffer();
        const zipUint8Array = new Uint8Array(zipArrayBuffer);

        // Extrair o conteúdo do ZIP em memória
        const extractedFiles = await decompress(new TextDecoder().decode(zipUint8Array));

        console.log(`Extracted ZIP file: ${plugin.plugin_name}`);

        const analyser = new AstAnalyser();
        const analysisResult = [];
        for (const [fileName, fileContent] of Object.entries(extractedFiles)) {
            if (fileName.endsWith(".js")) {
                const analysis = analyser.analyse(new TextDecoder().decode(fileContent));
                analysisResult.push(analysis);
            }
        }

        // Fazer o upload dos arquivos para o Supabase Storage (bucket plugins_pending)
        const zipBlob = new Blob([zipUint8Array], { type: "application/zip" });
        const file = new File([zipBlob], `${plugin.plugin_name}.zip`);
        const bucketUrl = await uploadPluginFileToPendingBucket(plugin, file);

        const analysis = { analysisResult };

        const status = analysisResult.some((a) => a.warnings.length > 0) ? 2 : 1;
        const updateSuccess = await updateAnalysis(plugin.plugin_id.toString(), analysis, status);

        if (updateSuccess) {
            console.log("Analysis updated successfully: ", plugin.plugin_name);
        } else {
            console.log("Failed to update analysis: ", plugin.plugin_name);
        }

        if (bucketUrl) {
            console.log("Plugin file uploaded successfully to pending bucket:", bucketUrl);
        } else {
            console.log("Failed to upload plugin file to pending bucket.");
        }
    } catch (error) {
        console.error("Error analyzing plugin:", error);
    }
}