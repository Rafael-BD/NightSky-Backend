import { Application } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import pluginRoutes from "./routes/pluginsRoutes.ts";
import authRoutes from "./routes/authRoutes.ts";
import validateMiddleware from "./middlewares/validateMiddleware.ts";
import rateLimiter from "./middlewares/rateLimiterMiddleware.ts";

const app = new Application();

app.use(validateMiddleware);
// app.use(rateLimiter);

app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());
app.use(pluginRoutes.routes());
app.use(pluginRoutes.allowedMethods());

console.log("App Operations Backend running on http://localhost:8001");
await app.listen({ port: 8001 });;
