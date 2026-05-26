import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import 'antd/dist/reset.css';
import '../../design-system/colors_and_type.css';
import './index.css';
import App from './App';
import theme from './theme';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={ruRU}
      theme={theme}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
