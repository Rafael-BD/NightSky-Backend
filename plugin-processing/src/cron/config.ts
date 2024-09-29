import analyzer from "../processing/pluginAnalysis.ts";


export default function cron() {

    Deno.cron("Plugin analysis", { minute: { every: 2 } }, () => {
        analyzer();
    });

};