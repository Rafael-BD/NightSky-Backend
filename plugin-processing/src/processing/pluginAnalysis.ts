import { getPluginsPending, updateAnalysis, uploadPluginFileToPendingBucket } from "../services/services.ts";
import { AstAnalyser } from "npm:@nodesecure/js-x-ray";
import { PluginPending } from "../../../shared/types.ts";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";

// Tipo para representar a estrutura dos arquivos extraídos
type FileStructure = { [key: string]: FileStructure | Uint8Array };

// Função recursiva para analisar todos os arquivos e pastas
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

        // Baixar o repositório como um arquivo ZIP em memória
        const response = await fetch(zipUrl);
        if (!response.ok) {
            throw new Error(`Failed to download ZIP file: ${response.statusText}`);
        }
        const zipArrayBuffer = await response.arrayBuffer();
        const zipUint8Array = new Uint8Array(zipArrayBuffer);

        // Extrair o conteúdo do ZIP em memória usando fflate
        const extractedFiles = unzipSync(zipUint8Array);

        console.log(`Extracted ZIP file: ${plugin.plugin_name}`);

        const analyser = new AstAnalyser();
        const analysisResult = analysisRecursive(extractedFiles, analyser);

        // Fazer o upload dos arquivos para o Supabase Storage (bucket plugins_pending)
        const zipBlob = new Blob([zipUint8Array], { type: "application/zip" });
        const file = new File([zipBlob], `${plugin.plugin_name}.zip`);
        const bucketUrl = await uploadPluginFileToPendingBucket(plugin, file);

        const analysis = { analysisResult };

        const status = analysisResult.some((a) => a.analysis.warnings.length > 0) ? 2 : 1;
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