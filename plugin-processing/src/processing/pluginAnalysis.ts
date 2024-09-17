import { getPluginsPending, updateAnalysis } from "../services/services.ts";
import { AstAnalyser } from "npm:@nodesecure/js-x-ray";
import { PluginPending } from "../../../shared/types.ts";
import { download } from "https://deno.land/x/download@v2.0.2/mod.ts";
import { decompress, compress } from "https://deno.land/x/zip@v1.2.5/mod.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";

export default async function analyzer() {
    const EXTRACT_PATH = join(Deno.cwd(), "plugins_extracted");
    const DOWNLOAD_PATH = join(Deno.cwd(), "plugins_downloads");
    Deno.env.set("EXTRACT_PATH", EXTRACT_PATH);

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

        (await Deno.stat(EXTRACT_PATH)).isDirectory || Deno.mkdir(EXTRACT_PATH);
        (await Deno.stat(DOWNLOAD_PATH)).isDirectory || Deno.mkdir(DOWNLOAD_PATH);

        const plugin = firstPluginStatusZero as PluginPending;
        const repoUrl = plugin.repo_url;
        const branch = plugin.branch;
        const zipUrl = `${repoUrl}/archive/refs/heads/${branch}.zip`;

        const zipFilePath = await download(zipUrl, {
            dir: DOWNLOAD_PATH,
            file: `${plugin.plugin_name}.zip`,
        });
        console.log(`Downloaded ZIP file to: ${zipFilePath}`);

        await decompress(DOWNLOAD_PATH +`/${plugin.plugin_name}.zip`, EXTRACT_PATH + `/${plugin.plugin_name}`);
        await Deno.remove(DOWNLOAD_PATH + `/${plugin.plugin_name}.zip`);

        console.log(`Extracted ZIP file: ${plugin.plugin_name}`);

        const analyser = new AstAnalyser();
        const analysisResult = [];
        for await (const file of Deno.readDir(EXTRACT_PATH + `/${plugin.plugin_name}`)) {
            if (file.isFile && file.name.endsWith(".js")) {
                const filePath = EXTRACT_PATH + `/${plugin.plugin_name}` + "/" + file.name;
                const fileContent = await Deno.readTextFile(filePath);
                const analysis = analyser.analyse(fileContent);
                analysisResult.push(analysis);
            }
        }

        await compress(EXTRACT_PATH + `/${plugin.plugin_name}`, EXTRACT_PATH + `/${plugin.plugin_name}.zip`);
        await Deno.remove(EXTRACT_PATH + `/${plugin.plugin_name}`, { recursive: true });
        
        const analysis = {analysisResult};

        const status = analysisResult.some((a) => a.warnings.length > 0) ? 2 : 1;
        const updateSuccess = await updateAnalysis(plugin.plugin_id.toString(), analysis, status);

        if (updateSuccess) {
            console.log("Analysis updated successfully: ", plugin.plugin_name);
        } else {
            console.log("Failed to update analysis: ", plugin.plugin_name);
        }
    } catch (error) {
        console.error("Error analyzing plugin:", error);
    }
}
