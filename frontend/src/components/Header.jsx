// components/Header.jsx
import { Bell, User, Plus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const Header = ({ title, onUploadClick }) => {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-16 bg-slate-900/40 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-8 sticky top-0 z-40 shadow-lg shadow-black/5"
    >
      
      {/* Left: Breadcrumb / Title with gradient accent */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-tight">
          {title}
        </h2>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
          <Sparkles size={12} className="text-indigo-400" />
          <span className="text-[10px] font-medium text-indigo-300 uppercase tracking-wider">Pro</span>
        </div>
      </div>

      {/* Right: Global Actions */}
      <div className="flex items-center gap-3">
        
        {/* Quick Upload Button */}
        <motion.button 
            onClick={onUploadClick}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50"
        >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Video</span>
        </motion.button>

        <div className="h-6 w-px bg-slate-700/50"></div>

        {/* Notifications */}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
        >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-full border-2 border-slate-900 shadow-lg shadow-red-500/50"></span>
        </motion.button>

        {/* User Profile */}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:from-slate-700 hover:to-slate-600 transition-all border border-slate-700/50 shadow-lg shadow-black/20"
        >
            <User size={16} />
        </motion.button>
      </div>
    </motion.header>
  );
};

export default Header;