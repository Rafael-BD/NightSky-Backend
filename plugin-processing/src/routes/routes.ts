import { Router } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import { approve, getPending, reject } from "../controllers/controller.ts";

const router = new Router();

router.get("/admin/plugins/pending", getPending);
router.post("/admin/plugins/approve", approve);
router.post("/admin/plugins/reject", reject);

export default router;
