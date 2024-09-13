import { Router } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import { getPlugins, searchPlugins } from "../controllers/pluginsController.ts";

const router = new Router();

router.get("/plugins", getPlugins); 
router.get("/plugins/search", searchPlugins);

export default router;
