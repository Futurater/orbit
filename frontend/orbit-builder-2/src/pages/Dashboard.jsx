import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { BookOpen, Lock, Server, Cloud } from 'lucide-react';

const Dashboard = () => {
    const { user } = useContext(AppContext);
    const navigate = useNavigate();

    // Safely parse name from context or localStorage fallback
    const displayUser = user?.name || (JSON.parse(localStorage.getItem('orbit_user')) || {})?.name || 'Developer';

   const courses = [
        {
            id: 'dsa',
            title: 'Master Java DSA',
            description: 'Conquer Data Structures and Algorithms with Active Interception.',
            icon: <BookOpen className="w-8 h-8 text-cyan-400" />,
            isLocked: false,
            // 🔥 MERGE POINT: Change this to '/arena' so it matches your App.jsx route!
            path: '/arena' 
        },
        {
            id: 'backend',
            title: 'Backend Engineering',
            description: 'Build scalable APIs. (Coming soon)',
            icon: <Server className="w-8 h-8 text-gray-600" />,
            isLocked: true,
            path: '#'
        },
        {
            id: 'cloud',
            title: 'AWS Cloud Native',
            description: 'Master serverless and containerized deployments. (Coming soon)',
            icon: <Cloud className="w-8 h-8 text-gray-600" />,
            isLocked: true,
            path: '#'
        }
    ];

    return (
        // 🔥 CHANGED 'bg-black' to 'bg-transparent' so the global App.jsx stars show through!
        <div className="relative min-h-screen bg-transparent text-white p-8 font-sans overflow-hidden">

            {/* 🔥 DELETED DeepSpace and ShootingStar from here. They now live in App.jsx! */}

            {/* Dashboard Content */}
            <div className="relative z-10 max-w-6xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-violet-400">
                        Welcome back, {displayUser}
                    </h1>
                    <p className="text-amber-400/80 mt-2 tracking-wide">Resume your Active Interception journey.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <div
                            key={course.id}
                            onClick={() => !course.isLocked && navigate(course.path)}
                            className={`
                                relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 backdrop-blur-sm
                                ${course.isLocked
                                    ? 'bg-white/5 border-gray-800 cursor-not-allowed opacity-60'
                                    : 'bg-white/5 border-gray-700/50 cursor-pointer hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:border-cyan-500/30'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-lg ${course.isLocked ? 'bg-gray-800/50' : 'bg-cyan-500/10'}`}>
                                    {course.icon}
                                </div>
                                {course.isLocked && (
                                    <Lock className="w-5 h-5 text-gray-500" />
                                )}
                            </div>

                            <h3 className={`text-xl font-bold mb-2 ${course.isLocked ? 'text-gray-400' : 'text-white'}`}>
                                {course.title}
                            </h3>
                            <p className="text-sm text-gray-400 line-clamp-2">
                                {course.description}
                            </p>

                            {!course.isLocked && (
                                <div className="mt-6">
                                    <div className="w-full bg-gray-700/50 rounded-full h-1.5 mb-2">
                                        <div className="bg-gradient-to-r from-cyan-500 to-violet-500 h-1.5 rounded-full" style={{ width: '0%' }}></div>
                                    </div>
                                    <p className="text-xs text-cyan-400/80 font-medium">0% Completed</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;