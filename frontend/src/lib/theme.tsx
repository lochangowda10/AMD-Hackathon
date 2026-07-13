import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: { children: React.ReactNode; defaultTheme?: Theme }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check for saved user preference
    const savedTheme = localStorage.getItem('theme-preference') as Theme | null;
    if (savedTheme) return savedTheme;

    // Check for system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return defaultTheme;
  });

  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Update HTML class for Tailwind dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Save preference to localStorage (except for 'system')
    if (theme !== 'system') {
      localStorage.setItem('theme-preference', theme);
    }
  }, [theme, isDarkMode]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-preference', next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}