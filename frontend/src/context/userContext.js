import {persist} from "zustand/middleware";
import { create } from "zustand";
import { normalizeRole } from "@/lib/auth";

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    ...user,
    role: normalizeRole(user.role),
  };
};

const userStore = create(
  persist((set) => ({
    user: null,
    isAuth : false,
    login: (user) => set(() => ({ user: normalizeUser(user) , isAuth : true })),
    setUser: (user) => set(() => ({ user: normalizeUser(user), isAuth: Boolean(user) })),
    logout: () => set(() => ({ user : null , isAuth : false })),
  })),
  {
    name: "user-storage",
  }
);

export {userStore};
