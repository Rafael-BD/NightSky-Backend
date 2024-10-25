import { Application } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import pluginRoutes from "./routes/pluginsRoutes.ts";
import authRoutes from "./routes/authRoutes.ts";
import validateMiddleware from "./middlewares/validateMiddleware.ts";
import rateLimiter from "../../shared/utils/rateLimiterMiddleware.ts";

const app = new Application();

app.use(
    oakCors({
        origin: "*",
        optionsSuccessStatus: 200,
    }),
);

app.use(validateMiddleware);
app.use(rateLimiter);

app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());
app.use(pluginRoutes.routes());
app.use(pluginRoutes.allowedMethods());

console.log("App Operations Backend running");
await app.listen({ port: 8001 });;
