import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { RocketFlapGame } from './components/RocketFlapGame';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RocketFlapGame />
  </StrictMode>
);
