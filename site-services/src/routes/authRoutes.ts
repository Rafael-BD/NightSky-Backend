import { Router } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import { checkIfUserExists, createStore, deleteAccount, updateStore } from "../controllers/authController.ts";

const router = new Router();

router.post("/auth/create-account", createStore)
    .put("/auth/update-account", updateStore)
    .get("/auth/checkuser", checkIfUserExists)
    .delete("/auth/delete-account", deleteAccount);

export default router;
