// src/context/AppContext.jsx
import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState({ name: "", email: "" });

    // Sticking strictly to the state shape contract provided
    const progress = { day1: "incomplete" };

    return (
        <AppContext.Provider value={{ user, setUser, progress }}>
            {children}
        </AppContext.Provider>
    );
};
