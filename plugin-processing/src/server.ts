import { Application } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import pluginRoutes from "./routes/pluginsRoutes.ts";
import validateMiddleware from "./middlewares/validateMiddleware.ts";
import rateLimiter from "./middlewares/rateLimiterMiddleware.ts";

const app = new Application();

// app.use(validateMiddleware);
// app.use(rateLimiter);

app.use(pluginRoutes.routes());
app.use(pluginRoutes.allowedMethods());

console.log("App Operations Backend running on http://localhost:8000");
await app.listen({ port: 8002 });;
