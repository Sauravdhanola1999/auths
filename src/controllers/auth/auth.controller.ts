import { Request, Response } from "express";
import { loginSchema, registerSchema } from "./auth.schema";
import { User } from "../../models/user.model";
import { checkPassword, hashPassword } from "../../lib/hash";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../lib/email";
import { createAccessToken, createRefreshToken } from "../../lib/token";

const getAppUrl = () => {
  return process.env.APP_URL || `http://localhost:${process}`;
};

export const registerHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: "Invalid request data",
        errors: result.error.flatten(),
      });
      return;
    }

    const { email, password, name } = result.data;

    const normalizedEmail = email.toLowerCase().trim();

    const exsistingUser = await User.findOne({
      email: normalizedEmail,
    });
    if (exsistingUser) {
      res.status(409).json({ message: "User with this email already exsists" });
      return;
    }

    const passwordHash = await hashPassword(password);

    const newlyCreatedUser = await User.create({
      email: normalizedEmail,
      passwordHash,
      name,
      role: "user",
      isEmailVerified: false,
      twoFactorEnabled: false,
    });

    const verifyToken = jwt.sign(
      {
        sub: newlyCreatedUser.id,
      },
      process.env.JWT_ACCESS_SECRET!,
      {
        expiresIn: "1d",
      }
    );

    const verifyUrl = `${getAppUrl}/auth/verify-email?token=${verifyToken}`;

    await sendEmail(
      newlyCreatedUser.email,
      "Verify your email address",
      `<p>Click <a href="${verifyUrl}">here</a> to ${verifyUrl} your email address.</p>`
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newlyCreatedUser.id,
        email: newlyCreatedUser.email,
        name: newlyCreatedUser.name,
        role: newlyCreatedUser.role,
        isEmailVerified: newlyCreatedUser.isEmailVerified,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyEmailHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.query.token as string | undefined;
  if (!token) {
    res.status(400).json({ message: "Token is required" });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
      sub: string;
    };

    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.isEmailVerified) {
      res.json({ message: "Email is already verified" });
    }

    user.isEmailVerified = true;
    await user.save();
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const loginHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: "Invalid request data",
        errors: result.error.flatten(),
      });
      return;
    }

    const { email, password } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const ok = await checkPassword(password, user.passwordHash);
    if (!ok) {
      res.status(400).json({
        message: "Invalid Email or Password",
      });
    }

    if (!user.isEmailVerified) {
      res
        .status(403)
        .json({ message: "Please verify email before logging in" });
      return;
    }

    const accessToken = createAccessToken(
      user.id,
      user.role,
      user.tokenVersion,
    );
    
    const refreshToken = createRefreshToken(
      user.id, user.tokenVersion
    );

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge : 7 * 24 * 6 * 60 * 1000
    })
         
    res.status(200).json({
      message: "login successfully done",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    })

    return;


  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
