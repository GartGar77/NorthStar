


import React from 'react';
import type { View, Employee } from '../types';
import Button from './ui/Button';

interface HeaderProps {
  activeView: View;
  currentUser: Employee;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, currentUser, onLogout }) => {
  const getTitle = () => {
    const specialTitles: Partial<Record<View, string>> = {
        my_info: 'My Information',
        my_documents: 'My Documents'
    };

    if (specialTitles[activeView]) {
        return specialTitles[activeView];
    }

    return activeView
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  };
  
  return (
    <header className="h-20 bg-white flex items-center justify-between px-8 border-b border-slate-200 flex-shrink-0">
      <h2 className="text-xl font-bold text-slate-800">{getTitle()}</h2>
      <div>
        <Button variant="secondary" size="md" onClick={onLogout}>
          Log Out
        </Button>
      </div>
    </header>
  );
};

export default Header;