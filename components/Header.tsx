import React from 'react';
import { Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="border-b border-stone-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-stone-800 p-1.5 rounded-lg">
             <Sparkles className="w-5 h-5 text-stone-100" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-stone-900 leading-tight">Pattern Mirror</h1>
            <p className="text-xs text-stone-500 font-medium">See the patterns beneath your days</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
