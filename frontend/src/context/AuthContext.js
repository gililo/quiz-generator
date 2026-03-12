import { createContext, useContext } from "react";

// Create an authentication context.
// This will store the current user e token
export const AuthContext = createContext(null);

// Custom hook to easily access the AuthContext in any component.
// Instead of writing useContext(AuthContext) everywhere,
// components can simply call useAuth().
export const useAuth = () => useContext(AuthContext);