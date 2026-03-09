// src/pages/Onboarding.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
import DeepSpace from '../components/DeepSpace';
import ShootingStar from '../components/ShootingStar';
import Planet3D from '../components/Planet3D';
import Saturn3D from '../components/Saturn3D';

const Onboarding = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isExiting, setIsExiting] = useState(false);
    const { setUser } = useContext(AppContext);
    const navigate = useNavigate();

    const handleEnterOrbit = (e) => {
        e.preventDefault();

        if (name.trim() && email.trim()) {
            const userData = { name: name.trim(), email: email.trim() };
            setUser(userData);
            localStorage.setItem('orbit_user', JSON.stringify(userData));

            setIsExiting(true);
            setTimeout(() => {
                navigate('/dashboard');
            }, 800); // Wait for transition animation
        }
    };

    return (
        <div className="relative min-h-screen bg-black overflow-hidden">
            <motion.div
                className="relative min-h-screen flex flex-col items-center justify-center p-6 text-white font-sans w-full h-full"
                animate={isExiting ? { opacity: 0, scale: 1.5, filter: "blur(10px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
            >
                {/* Realistic 3D Deep Space Background */}
                <DeepSpace />
                <ShootingStar />

                {/* Glowing Ambient Gradient behind everything (Subtle Teal/Purple Glow) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-[120px] z-0 pointer-events-none"></div>

                {/* The restored 3D Planet Orbiting in the Top Left */}
                <Planet3D />

                {/* The restored 3D Saturn Orbiting in the Bottom Right */}
                <Saturn3D />

                {/* The Form Content itself - No Card Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="relative z-10 w-full max-w-sm"
                >
                    {/* Logo / Icon Area */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
                        className="flex justify-center mb-8"
                    >
                        <div className="bg-gradient-to-br from-cyan-900/30 to-violet-900/30 p-5 rounded-full shadow-[0_0_50px_rgba(6,182,212,0.25)] backdrop-blur-sm border border-cyan-500/20">
                            <Rocket size={44} className="text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
                        </div>
                    </motion.div>

                    {/* Title Area */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mb-12 text-center"
                    >
                        <h1 className="text-4xl md:text-5xl font-extrabold pb-2 mb-1 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-violet-400 drop-shadow-sm">
                            Project Orbit
                        </h1>
                        <p className="text-amber-400/80 text-sm font-medium tracking-[0.15em] uppercase mt-2">
                            Active Interception Platform
                        </p>
                    </motion.div>

                    {/* Form Area */}
                    <form onSubmit={handleEnterOrbit} className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="relative group"
                        >
                            <label htmlFor="name" className="absolute -top-2.5 left-4 px-1 text-[11px] font-bold text-cyan-400/70 bg-black group-focus-within:text-cyan-300 transition-colors uppercase tracking-wider z-10">
                                Developer ID
                            </label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full bg-black/60 backdrop-blur-md border border-gray-700/80 group-focus-within:border-cyan-500/50 rounded-xl pt-4 pb-5 pl-6 pr-5 text-white placeholder-gray-600 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-2xl font-medium leading-normal"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="relative group"
                        >
                            <label htmlFor="email" className="absolute -top-2.5 left-4 px-1 text-[11px] font-bold text-cyan-400/70 bg-black group-focus-within:text-cyan-300 transition-colors uppercase tracking-wider z-10">
                                Access Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="dev@company.com"
                                className="w-full bg-black/60 backdrop-blur-md border border-gray-700/80 group-focus-within:border-cyan-500/50 rounded-xl pt-4 pb-5 pl-6 pr-5 text-white placeholder-gray-600 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-2xl font-medium leading-normal"
                            />
                        </motion.div>

                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-between group shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)]"
                        >
                            <span className="tracking-widest uppercase text-sm">Enter Orbit</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </motion.button>
                    </form>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Onboarding;
