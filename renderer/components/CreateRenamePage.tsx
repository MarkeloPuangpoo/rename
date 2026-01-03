import React, { useState, useEffect } from 'react';

// Types
interface FileItem {
    id: string; // Use path as ID
    original: string;
    new: string;
    path: string; // Added path field
    status: 'idle' | 'processing' | 'done' | 'error' | 'success'; // Extended status
    error?: string;
}

export default function CreateRenamePage() {
    const [activeTab, setActiveTab] = useState('Local Files');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [renameMode, setRenameMode] = useState('Smart Rename');
    const [pattern, setPattern] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    // Effect to update new filenames based on mode (Non-AI modes)
    useEffect(() => {
        if (renameMode === 'Smart Rename') return; // Skip for Smart Rename (AI handles it)

        const updatedFiles = files.map((file, index) => {
            if (file.status === 'success' || file.status === 'done' || file.status === 'processing') return file;

            let newName = file.new;
            const ext = file.original.split('.').pop();
            const baseName = file.original.split('/').pop()?.split('.').slice(0, -1).join('.');

            if (renameMode === 'Add Prefix') {
                newName = `${pattern}${baseName}.${ext}`;
            } else if (renameMode === 'Add Suffix') {
                newName = `${baseName}${pattern}.${ext}`;
            }

            return { ...file, new: newName };
        });

        // Only update if changes to avoid infinite loop
        if (JSON.stringify(updatedFiles) !== JSON.stringify(files)) {
            setFiles(updatedFiles);
        }
    }, [files, renameMode, pattern]);


    const handleAddFiles = async () => {
        try {
            const filePaths: string[] = await window.ipc.invoke('open-file-dialog');
            if (filePaths && filePaths.length > 0) {
                const newFiles: FileItem[] = filePaths.map((path) => {
                    const fileName = path.split('/').pop() || path;
                    return {
                        id: path, // Use path as ID for simplicity
                        original: path, // Full path needed for renaming
                        new: fileName, // Default to current name (will be updated by effect)
                        path: path,
                        status: 'idle',
                    };
                });

                setFiles(prev => {
                    const existingIds = new Set(prev.map(f => f.id));
                    const uniqueNewFiles = newFiles.filter(f => !existingIds.has(f.id));
                    return [...prev, ...uniqueNewFiles];
                });
            }
        } catch (error) {
            console.error("Failed to add files:", error);
        }
    };

    const handleSmartRename = async () => {
        setIsProcessing(true);
        setProgress(0);

        // Filter files that need processing
        const filesToProcess = files.filter(f => f.status !== 'success');
        const total = filesToProcess.length;
        let completed = 0;

        for (const file of filesToProcess) {
            // Update status to processing
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'processing' } : f));

            try {
                const result = await window.electronAPI.generateAiName(file.path);
                if (result.success && result.newName) {
                    // Append original extension
                    const ext = file.original.split('.').pop();
                    const finalName = `${result.newName}.${ext}`;

                    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, new: finalName, status: 'done' } : f));
                } else {
                    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'error', error: result.error || 'Unknown error' } : f));
                }
            } catch (error) {
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'error', error: String(error) } : f));
            }

            completed++;
            setProgress(Math.round((completed / total) * 100));
        }

        setIsProcessing(false);
    };

    const handleApplyRename = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setProgress(10);

        // Only rename files that have a new name ready (idle or done) and aren't already success/error
        const filesToRename = files.filter(f => f.status !== 'success' && f.status !== 'error').map(f => ({
            original: f.original,
            new: f.new
        }));

        try {
            const results = await window.ipc.invoke('rename-files', filesToRename);
            setProgress(100);

            setFiles(prev => prev.map(f => {
                const result = results.find((r: any) => r.original === f.original);
                if (result) {
                    return {
                        ...f,
                        status: result.status === 'success' ? 'success' : 'error',
                        error: result.error
                    };
                }
                return f;
            }));

        } catch (error) {
            console.error("Renaming failed:", error);
        } finally {
            setTimeout(() => {
                setIsProcessing(false);
                setProgress(0);
            }, 1000);
        }
    };

    const onMainButtonClick = () => {
        if (renameMode === 'Smart Rename') {
            handleSmartRename();
        } else {
            handleApplyRename();
        }
    }

    const renderContent = () => {
        if (activeTab === 'History') {
            return (
                <div className="flex-grow flex items-center justify-center text-slate-400">
                    <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>No history yet.</p>
                    </div>
                </div>
            );
        }
        if (activeTab === 'Settings') {
            return (
                <div className="flex-grow flex items-center justify-center text-slate-400">
                    <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p>Settings coming soon.</p>
                    </div>
                </div>
            );
        }

        // Default: Local Files
        return (
            <div className="flex-grow overflow-y-auto p-0 scroll-smooth">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 w-10">
                                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            </th>
                            <th className="px-6 py-3">Original Filename</th>
                            <th className="px-6 py-3 w-10"></th>
                            <th className="px-6 py-3">New Filename</th>
                            <th className="px-6 py-3 w-20 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {files.map((file) => (
                            <tr key={file.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-3">
                                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-8 w-8 flex-shrink-0 rounded bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-medium">
                                            {file.original.split('.').pop()?.toUpperCase()}
                                        </div>
                                        <div className="flex flex-col max-w-[300px]">
                                            <span className="text-sm font-medium text-slate-700 truncate" title={file.original}>
                                                {file.original.split('/').pop()}
                                            </span>
                                            <span className="text-xs text-slate-400 truncate" title={file.original}>
                                                {file.original}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    {file.status === 'success' ? (
                                        <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : file.status === 'error' ? (
                                        <div className="group relative">
                                            <svg className="w-5 h-5 text-red-500 mx-auto cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            {file.error && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                                    {file.error}
                                                </div>
                                            )}
                                        </div>
                                    ) : file.status === 'done' ? (
                                        <svg className="w-5 h-5 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : file.status === 'processing' ? (
                                        <svg className="w-5 h-5 text-blue-500 animate-spin mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-slate-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </td>
                                <td className="px-6 py-3">
                                    <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]" title={file.new}>
                                        {file.new}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    {/* Reusing status icon column for general status, duplicate of 3rd col? 
                        Wait, layout had 5 columns. 
                        Col 1: Checkbox
                        Col 2: Original
                        Col 3: Arrow/Status (Middle) -> Logic above put unique icons here.
                        Col 4: New Filename
                        Col 5: Status (Far right) -> Wait, layout had arrow in middle and status at end.
                        Let's check the previous code logic.
                        
                        Previous code:
                        Col 3: Arrow icon.
                        Col 5: Status icon (check/clock).
                        
                        My new code put the status logic in Col 3 (Middle)? 
                        Let me fix this.
                        Col 3 should be Arrow (or spinner if processing?)
                        Col 5 should be Result Status?
                        
                        User Request: "When processing, show a spinning loader icon (SVG) instead of the arrow/status icon. When done, show a green checkmark."
                        
                        The arrow is in the middle. The status is at the far right.
                        If I replace the arrow with spinner, that's fine.
                        
                        Let's revert:
                        Col 3: Arrow (default). Spinner (processing).
                        Col 5: Status (Success/Error/Pending).
                    */}
                                    {file.status === 'processing' ? (
                                        <svg className="w-5 h-5 text-blue-500 animate-spin mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4 text-slate-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    )}
                                </td>
                                <td className="px-6 py-3">
                                    <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]" title={file.new}>
                                        {file.new}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    {file.status === 'success' ? (
                                        <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : file.status === 'error' ? (
                                        <div className="group relative">
                                            <svg className="w-5 h-5 text-red-500 mx-auto cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            {file.error && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                                    {file.error}
                                                </div>
                                            )}
                                        </div>
                                    ) : file.status === 'done' ? (
                                        <svg className="w-5 h-5 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-slate-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {files.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    No files added yet. Click "Add Files" to start.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="flex h-screen w-full bg-white text-slate-800 font-sans overflow-hidden">
            {/* 1. Left Sidebar */}
            <aside className="w-60 flex-shrink-0 flex flex-col bg-slate-50 border-r border-slate-200">
                <div className="p-6">
                    <div className="flex items-center space-x-2 text-slate-700 font-bold text-lg">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <span>Renamer</span>
                    </div>
                </div>

                <nav className="flex-grow px-3 space-y-1">
                    {['Local Files', 'History', 'Settings'].map((item) => {
                        const isActive = activeTab === item;
                        return (
                            <button
                                key={item}
                                onClick={() => setActiveTab(item)}
                                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative group
                  ${isActive
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-slate-600 hover:bg-blue-50 hover:text-slate-900'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-blue-600 rounded-r-md"></div>
                                )}
                                <span className="ml-2">{item}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200 text-xs text-slate-400 text-center">
                    v1.0.0
                </div>
            </aside>

            {/* 2. Main Content Area */}
            <main className="flex-grow flex flex-col min-w-0 bg-white">

                {/* 2.1 Main Header */}
                <header className="flex-shrink-0 h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm z-10">
                    <div className="flex items-center space-x-3">
                        <div className="text-blue-600">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold text-slate-800">{activeTab}</h1>
                    </div>

                    {activeTab === 'Local Files' && (
                        <button
                            onClick={handleAddFiles}
                            className="flex items-center space-x-2 px-4 py-2 bg-white border border-blue-300 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Files</span>
                        </button>
                    )}
                </header>

                {/* 2.2 Content Area */}
                {renderContent()}

                {/* 2.3 Bottom Control Panel (Only for Local Files) */}
                {activeTab === 'Local Files' && (
                    <footer className="flex-shrink-0 border-t border-slate-200 bg-white p-6 pb-8 shadow-inner z-20">
                        <div className="max-w-4xl mx-auto flex flex-col space-y-4">

                            {/* Controls */}
                            <div className="flex space-x-3">
                                <div className="w-1/3">
                                    <select
                                        value={renameMode}
                                        onChange={(e) => setRenameMode(e.target.value)}
                                        className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-slate-700 bg-white"
                                    >
                                        <option>Smart Rename</option>
                                        <option>Add Prefix</option>
                                        <option>Add Suffix</option>
                                    </select>
                                </div>
                                <div className="flex-grow">
                                    <input
                                        type="text"
                                        value={pattern}
                                        onChange={(e) => setPattern(e.target.value)}
                                        placeholder={renameMode === 'Smart Rename' ? "Auto-generated by AI..." : "Enter text..."}
                                        disabled={renameMode === 'Smart Rename'}
                                        className="block w-full pl-3 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between space-x-6">
                                <div className="flex-grow flex flex-col space-y-1 h-6 justify-end">
                                    {/* Progress Section */}
                                    {isProcessing && (
                                        <>
                                            <div className="flex justify-between text-xs font-medium text-slate-500">
                                                <span>Processing...</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={onMainButtonClick}
                                    disabled={files.length === 0 || isProcessing}
                                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2 px-8 rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
                                >
                                    {isProcessing ? 'Processing... ' : renameMode === 'Smart Rename' ? 'Generate Names' : `Rename ${files.length} Files`}
                                </button>
                            </div>

                        </div>
                    </footer>
                )}

            </main>
        </div>
    );
}
