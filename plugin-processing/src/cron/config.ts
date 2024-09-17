import analyzer from "../processing/pluginAnalysis.ts";


export default function cron() {

    Deno.cron("Log a message", { minute: { every: 1 } }, () => {
        analyzer();
    });

};