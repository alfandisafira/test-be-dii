import express from "express";
import {
  actionLogin,
  actionLogout,
  actionRegister,
} from "../controllers/authController.js";
import { addMenu, getMenu } from "../controllers/menuController.js";
import {
  addRole,
  getRolePrivilege,
  updateRolePrivilege,
} from "../controllers/roleController.js";
import { getUserRole, updateUserRole } from "../controllers/userController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const apiRouter = express.Router();

apiRouter.post("/register", actionRegister);
apiRouter.post("/login", actionLogin);
apiRouter.post("/logout", actionLogout);

apiRouter.get("/menu", verifyToken, getMenu);
apiRouter.post("/menu", verifyToken, addMenu);

apiRouter.post("/role", verifyToken, addRole);

apiRouter.get("/user/role", verifyToken, getUserRole);
apiRouter.put("/user/role", verifyToken, updateUserRole);

apiRouter.get("/role/privilege", verifyToken, getRolePrivilege);
apiRouter.put("/role/privilege", verifyToken, updateRolePrivilege);

export default apiRouter;
