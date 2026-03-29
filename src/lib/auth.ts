import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("아이디와 비밀번호를 입력해주세요.");
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user || !user.isActive) {
          throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        // 계정 잠금 체크
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("계정이 잠겨있습니다. 잠시 후 다시 시도해주세요.");
        }

        const isValid = await compare(credentials.password, user.passwordHash);

        if (!isValid) {
          // 실패 횟수 증가
          const newFailedAttempts = user.failedAttempts + 1;
          const updateData: { failedAttempts: number; lockedUntil?: Date } = {
            failedAttempts: newFailedAttempts,
          };

          // 5회 실패 시 30분 잠금
          if (newFailedAttempts >= 5) {
            updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
          }

          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          if (newFailedAttempts >= 5) {
            throw new Error("5회 실패로 계정이 30분간 잠겼습니다.");
          }

          throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        // 로그인 성공: 실패 횟수 초기화
        await prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: 0, lockedUntil: null },
        });

        return {
          id: String(user.id),
          name: user.displayName,
          email: user.username,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8시간
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
