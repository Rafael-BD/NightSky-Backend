import { getPluginsPending, updateAnalysis, uploadPluginFileToPendingBucket } from "../services/services.ts";
import { AstAnalyser } from "npm:@nodesecure/js-x-ray";
import { PluginPending } from "../../../shared/types.ts";
import { unzipSync, strFromU8, zipSync } from "npm:fflate@0.8.2";

type FileStructure = { [key: string]: FileStructure | Uint8Array };

interface AnalysisResult {
    fileName: string;
    analysis: ReturnType<AstAnalyser['analyse']>;
}

function analysisRecursive(files: FileStructure, analyser: AstAnalyser, path: string = '', analysisResult: AnalysisResult[] = []) {
    for (const [fileName, fileContent] of Object.entries(files)) {
        const fullPath = path ? `${path}/${fileName}` : fileName;
        if (fileContent instanceof Uint8Array) {
            if (fileName.endsWith(".js")) {
                const analysis = {
                    fileName: fullPath,
                    analysis: analyser.analyse(strFromU8(fileContent)),
                };
                analysisResult.push(analysis);
            }
        } else if (typeof fileContent === "object") {
            analysisRecursive(fileContent as FileStructure, analyser, fullPath, analysisResult);
        }
    }
    return analysisResult;
}

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

        const response = await fetch(zipUrl);
        if (!response.ok) {
            throw new Error(`Failed to download ZIP file: ${response.statusText}`);
        }
        const zipArrayBuffer = await response.arrayBuffer();
        const zipUint8Array = new Uint8Array(zipArrayBuffer);

        const extractedFiles = unzipSync(zipUint8Array);

        console.log(`Extracted ZIP file: ${plugin.plugin_name}`);

        const analyser = new AstAnalyser();
        const analysisResult = analysisRecursive(extractedFiles, analyser);

        // Update appmanifest.json with new version code and plugin ID
        const rootFolder = Object.keys(extractedFiles)[0];
        const appManifest = extractedFiles[rootFolder + "appmanifest.json"];
        console.log("extractedFiles:", extractedFiles);
        console.log("appManifest:", appManifest);
        let filesUpdated = extractedFiles;
        if (appManifest) {
            const appManifestString = strFromU8(appManifest);
            const appManifestObj = JSON.parse(appManifestString);
            appManifestObj.version_code = plugin.version;
            appManifestObj.id = plugin.uuid.toString();

            filesUpdated = {
                ...extractedFiles,
                "appmanifest.json": new TextEncoder().encode(JSON.stringify(appManifestObj)),
            };
        } 
        else {
            console.error("appmanifest.json not found in ZIP file:", plugin.plugin_name);
            return;
        }

        const zipUint8ArrayUpdated = new Uint8Array(zipSync(filesUpdated));
        const zipBlob = new Blob([zipUint8ArrayUpdated], { type: "application/zip" });
        const file = new File([zipBlob], `${plugin.plugin_name}.zip`, { type: "application/zip" });
        const ok = await uploadPluginFileToPendingBucket(file, plugin.uuid);

        if (!ok) {
            console.error("Failed to upload ZIP file to bucket:", plugin.plugin_name);
            return;
        }

        const analysis = { analysisResult };

        const status = analysisResult.some((a) => a.analysis.warnings.length > 0) ? 2 : 1;
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