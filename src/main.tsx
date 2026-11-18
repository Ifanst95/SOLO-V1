import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadTheme, applyTheme } from './lib/theme';

applyTheme(loadTheme());

createRoot(document.getElementById('root')!).render(<App />);
