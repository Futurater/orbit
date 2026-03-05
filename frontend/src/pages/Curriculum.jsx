// src/pages/Curriculum.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, PlayCircle, CheckCircle2 } from 'lucide-react';

const Curriculum = () => {
    const navigate = useNavigate();

    const days = [
        {
            id: 'day1',
            dayNumber: 1,
            title: 'Arrays & Two Pointers',
            description: 'Master the foundation of DSA with fast & slow pointer techniques.',
            isLocked: false,
            status: 'unstarted' // 'unstarted', 'in-progress', 'completed'
        },
        {
            id: 'day2',
            dayNumber: 2,
            title: 'Sliding Window',
            description: 'Identify patterns for optimal subarrays and substrings.',
            isLocked: true,
            status: 'locked'
        },
        {
            id: 'day3',
            dayNumber: 3,
            title: 'Binary Search Trees',
            description: 'Traverse and manipulate non-linear data structures.',
            isLocked: true,
            status: 'locked'
        }
    ];

    const getStatusIcon = (status, isLocked) => {
        if (isLocked) return <Lock className="w-6 h-6 text-gray-600" />;
        if (status === 'completed') return <CheckCircle2 className="w-6 h-6 text-emerald-400" />;
        return <PlayCircle className="w-6 h-6 text-indigo-400" />;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-gray-400 hover:text-white mb-8 flex items-center transition-colors font-medium"
                >
                    &larr; Back to Dashboard
                </button>

                <header className="mb-12">
                    <div className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-sm font-semibold mb-4 border border-indigo-500/20">
                        Java DSA Track
                    </div>
                    <h1 className="text-4xl font-bold mb-4">Master Data Structures</h1>
                    <p className="text-gray-400 text-lg">
                        Watch the theory, get intercepted, write the code, and pass the voice viva to proceed.
                    </p>
                </header>

                <div className="space-y-4">
                    {days.map((day) => (
                        <div
                            key={day.id}
                            onClick={() => !day.isLocked && navigate(`/play/${day.id}`)}
                            className={`
                                group relative flex items-center p-6 rounded-2xl border transition-all duration-300
                                ${day.isLocked
                                    ? 'bg-gray-800/30 border-gray-800 cursor-not-allowed opacity-75'
                                    : 'bg-gray-800 border-gray-700 cursor-pointer hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-[0_4px_20px_rgba(79,70,229,0.15)]'
                                }
                            `}
                        >
                            {/* Status Icon Indicator */}
                            <div className={`
                                flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-6
                                ${day.isLocked ? 'bg-gray-900' : 'bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors'}
                            `}>
                                {getStatusIcon(day.status, day.isLocked)}
                            </div>

                            {/* Content */}
                            <div className="flex-grow">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className={`text-sm font-bold tracking-wider ${day.isLocked ? 'text-gray-600' : 'text-indigo-400'}`}>
                                        DAY {day.dayNumber}
                                    </span>
                                    <h3 className={`text-xl font-bold ${day.isLocked ? 'text-gray-500' : 'text-white'}`}>
                                        {day.title}
                                    </h3>
                                </div>
                                <p className="text-gray-400 text-sm">
                                    {day.description}
                                </p>
                            </div>

                            {/* Action Button */}
                            {!day.isLocked && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pl-6 border-l border-gray-700">
                                    <span className="text-indigo-400 font-medium text-sm flex items-center">
                                        Enter Arena &rarr;
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Curriculum;
