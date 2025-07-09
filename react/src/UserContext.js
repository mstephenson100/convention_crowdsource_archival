import { createContext } from "react";

const UserContext = createContext({
  role: null,
  isLoggedIn: false,
  setRole: () => {},
  setIsLoggedIn: () => {},
});

export default UserContext;
