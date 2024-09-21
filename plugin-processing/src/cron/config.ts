import analyzer from "../processing/pluginAnalysis.ts";


export default function cron() {

    Deno.cron("Plugin analysis", { hour: { every: 5 } }, () => {
        analyzer();
    });

};