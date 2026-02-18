// components/Sidebar.jsx
import { Video, Grid, Upload, Search, MessageSquare, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'library', label: 'Library', icon: Grid },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'summary', label: 'Summary', icon: FileText },
  ];

  return (
    <div className="w-[230px] h-screen bg-black border-r border-white/5 flex flex-col flex-shrink-0">
      
      {/* LOGO SECTION */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
            <Video className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">ReelInsight</h1>
            <p className="text-[10px] text-[#aaa] uppercase tracking-wider">PRO</p>
          </div>
        </div>
      </div>

      {/* MENU SECTION - SCROLLBAR HIDDEN */}
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style jsx>{`
          nav::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        <div className="px-3 mb-2">
          <p className="text-[11px] text-[#aaa] font-semibold uppercase tracking-wider px-3 mb-1">
            Menu
          </p>
        </div>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full px-6 py-3 flex items-center gap-4 transition-all relative ${
                isActive 
                  ? 'bg-white/10 text-white' 
                  : 'text-[#aaa] hover:bg-white/5 hover:text-white'
              }`}
            >
              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              <Icon size={20} className={isActive ? 'text-white' : 'text-[#aaa]'} />
              <span className={`text-[15px] font-medium ${isActive ? 'text-white' : 'text-[#aaa]'}`}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* FOOTER SECTION */}
      <div className="px-6 py-4 border-t border-white/5">
        <div className="text-[11px] text-[#606060] space-y-1">
          <p>© 2026 ReelInsight</p>
          <p className="text-[10px]">v1.0.0 (Beta)</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;