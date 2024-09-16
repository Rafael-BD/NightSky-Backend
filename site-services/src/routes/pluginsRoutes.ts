import { Router } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import { fetchStorePlugins, createPlugin, updatePlugin, deletePlugin, getUserRepos } from "../controllers/pluginsController.ts";

const router = new Router();

router.get("/store/plugins", fetchStorePlugins)
    .post("/store/plugins", createPlugin)
    .put("/store/plugins", updatePlugin)
    .delete("/store/plugins", deletePlugin)
    .get("/user/repos", getUserRepos);

export default router;
