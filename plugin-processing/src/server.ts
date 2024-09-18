import { Application } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import routes from "./routes/routes.ts";
import validateMiddleware from "./middlewares/validateMiddleware.ts";
import rateLimiter from "../../shared/utils/rateLimiterMiddleware.ts";
import cron from "./cron/config.ts";

const app = new Application();

app.use(validateMiddleware);
// app.use(rateLimiter);

app.use(routes.routes());
app.use(routes.allowedMethods());

cron();

console.log("App Operations Backend running on http://localhost:8002");
await app.listen({ port: 8002 });;
