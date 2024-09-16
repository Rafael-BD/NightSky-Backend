import { Router } from "https://deno.land/x/oak@v13.1.0/mod.ts";
import { checkIfUserExists, createStore, deleteAccount, updateStore } from "../controllers/authController.ts";

const router = new Router();

router.post("/auth/account", createStore)
    .put("/auth/account", updateStore)
    .get("/auth/account", checkIfUserExists)
    .delete("/auth/account", deleteAccount);

export default router;
