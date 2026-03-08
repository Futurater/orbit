import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { BookOpen, Lock, Server, Cloud, Rocket, Shield, Zap, Star, TrendingUp, Clock, Award } from 'lucide-react';

const Dashboard = () => {
    const { user } = useContext(AppContext);
    const navigate = useNavigate();

    const displayUser = user?.name || (JSON.parse(localStorage.getItem('orbit_user')) || {})?.name || 'Developer';

    const courses = [
        {
            id: 'dsa',
            title: 'Master Java DSA',
            description: 'Conquer Data Structures and Algorithms with AI-powered Active Interception technology.',
            icon: <BookOpen className="w-7 h-7" />,
            isLocked: false,
            path: '/arena',
            accent: 'from-cyan-400 to-blue-500',
            accentBg: 'bg-cyan-500/10',
            accentBorder: 'border-cyan-500/20',
            accentText: 'text-cyan-400',
            tag: 'Active',
        },
        {
            id: 'backend',
            title: 'Backend Engineering',
            description: 'Build production-grade APIs with Node.js, databases, and cloud architecture.',
            icon: <Server className="w-7 h-7" />,
            isLocked: true,
            path: '#',
            accent: 'from-violet-400 to-purple-500',
            accentBg: 'bg-violet-500/10',
            accentBorder: 'border-violet-500/20',
            accentText: 'text-violet-400',
            tag: 'Coming Soon',
        },
        {
            id: 'cloud',
            title: 'AWS Cloud Native',
            description: 'Master serverless, containers, and infrastructure-as-code deployments.',
            icon: <Cloud className="w-7 h-7" />,
            isLocked: true,
            path: '#',
            accent: 'from-amber-400 to-orange-500',
            accentBg: 'bg-amber-500/10',
            accentBorder: 'border-amber-500/20',
            accentText: 'text-amber-400',
            tag: 'Coming Soon',
        }
    ];

    const features = [
        { icon: <Zap className="w-5 h-5 text-cyan-400" />, title: 'Active Interception', desc: 'Video pauses at key moments for real-time coding challenges' },
        { icon: <Shield className="w-5 h-5 text-violet-400" />, title: 'Viva Verification', desc: 'AI-powered oral examination to validate understanding' },
        { icon: <Star className="w-5 h-5 text-amber-400" />, title: 'Mentor AI', desc: 'Personalized guidance that adapts to your learning style' },
        { icon: <Rocket className="w-5 h-5 text-emerald-400" />, title: 'Space Odyssey', desc: 'Navigate through planets as you master each topic' },
    ];

    return (
        <div className="relative min-h-screen bg-transparent text-white font-sans overflow-hidden">

            {/* Top nav bar */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
                        <Rocket className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-wide">Orbit</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="stat-pill px-4 py-2 rounded-full flex items-center gap-2 text-sm">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span className="text-white/70">Level 1</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400/20 to-violet-400/20 border border-white/10 flex items-center justify-center text-sm font-bold">
                        {displayUser.charAt(0).toUpperCase()}
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <div className="relative z-10 max-w-6xl mx-auto px-8 py-10">

                {/* Hero section */}
                <header className="mb-14 overflow-visible">
                    <p className="text-sm font-medium text-white/40 tracking-widest uppercase mb-3">Mission Control</p>
                    <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-violet-400 pb-1 leading-normal mb-3">
                        Welcome back, {displayUser}
                    </h1>
                    <p className="text-white/50 text-lg max-w-xl">
                        Your learning journey continues. Select a mission track and resume your Active Interception adventure.
                    </p>
                </header>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {[
                        { icon: <TrendingUp className="w-4 h-4 text-cyan-400" />, label: 'Current Streak', value: '1 Day' },
                        { icon: <Clock className="w-4 h-4 text-violet-400" />, label: 'Time Invested', value: '0h' },
                        { icon: <Zap className="w-4 h-4 text-amber-400" />, label: 'Challenges Solved', value: '0' },
                        { icon: <Star className="w-4 h-4 text-emerald-400" />, label: 'XP Earned', value: '0' },
                    ].map((stat, i) => (
                        <div key={i} className="stat-pill rounded-2xl px-5 py-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">{stat.icon}</div>
                            <div>
                                <p className="text-white/40 text-xs font-medium">{stat.label}</p>
                                <p className="text-white text-lg font-bold">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Section title */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Mission Tracks</h2>
                    <span className="text-xs text-white/30 tracking-wide uppercase">{courses.filter(c => !c.isLocked).length} of {courses.length} available</span>
                </div>

                {/* Course cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    {courses.map((course) => (
                        <div
                            key={course.id}
                            onClick={() => !course.isLocked && navigate(course.path)}
                            className={`
                                relative overflow-hidden rounded-3xl p-6 feature-card
                                ${course.isLocked
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer'
                                }
                            `}
                        >
                            {/* Gradient accent top bar */}
                            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${course.accent} ${course.isLocked ? 'opacity-30' : 'opacity-100'}`} />

                            <div className="flex justify-between items-start mb-5">
                                <div className={`p-3 rounded-2xl ${course.accentBg} border ${course.accentBorder}`}>
                                    <div className={course.accentText}>{course.icon}</div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${course.isLocked
                                    ? 'text-white/30 border-white/10 bg-white/5'
                                    : `${course.accentText} ${course.accentBorder} ${course.accentBg}`
                                    }`}>
                                    {course.isLocked && <Lock className="w-3 h-3 inline mr-1 -mt-0.5" />}
                                    {course.tag}
                                </span>
                            </div>

                            <h3 className={`text-lg font-bold mb-2 ${course.isLocked ? 'text-white/40' : 'text-white'}`}>
                                {course.title}
                            </h3>
                            <p className="text-sm text-white/40 leading-relaxed mb-5">
                                {course.description}
                            </p>

                            {!course.isLocked && (
                                <div>
                                    <div className="flex items-center justify-between text-xs mb-2">
                                        <span className="text-white/40">Progress</span>
                                        <span className={`${course.accentText} font-semibold`}>0%</span>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-1.5">
                                        <div className={`bg-gradient-to-r ${course.accent} h-1.5 rounded-full transition-all`} style={{ width: '0%' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* How it works section */}
                <div className="mb-16">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-cyan-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">How Orbit Works</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {features.map((f, i) => (
                            <div key={i} className="feature-card rounded-2xl p-5">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                                    {f.icon}
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                                <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <footer className="border-t border-white/5 pt-6 pb-4 flex items-center justify-between">
                    <p className="text-xs text-white/20">Orbit © 2026 · Autonomous Learning Engine</p>
                    <p className="text-xs text-white/20">Built for the future of education</p>
                </footer>
            </div>
        </div>
    );
};

export default Dashboard;