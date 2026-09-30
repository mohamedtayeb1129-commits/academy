const express = require("express");
const { login, updatePassword, updateProfile, getProfile } = require("../controllers/AuthController");
const AuthenticateToken = require("../middlewares/AuthenticateToken");
const { body } = require("express-validator");
const router = express.Router()

router.post("/login",login)
router.get("/profile", AuthenticateToken, getProfile);
 
router.put(
  "/profile",
  AuthenticateToken,
  [
    body("nom").trim().notEmpty().withMessage("الاسم مطلوب."),
    body("prenom").trim().notEmpty().withMessage("اللقب مطلوب."),
    body("telephone")
      .optional({ checkFalsy: true })
      .matches(/^[0-9+\s]{6,15}$/)
      .withMessage("رقم الهاتف غير صحيح."),
    body("email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("البريد الإلكتروني غير صحيح."),
  ],
  updateProfile
);
 
router.put(
  "/password",
  AuthenticateToken,
  [
    body("ancien").notEmpty().withMessage("أدخل كلمة المرور الحالية."),
    body("nouveau")
      .isLength({ min: 6 })
      .withMessage("الحد الأدنى 6 خانات."),
    body("confirmation").custom((value, { req }) => {
      if (value !== req.body.nouveau) {
        throw new Error("كلمتا المرور غير متطابقتين.");
      }
      return true;
    }),
  ],
  updatePassword
);

module.exports = router