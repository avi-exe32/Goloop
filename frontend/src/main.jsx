// main.jsx is the JavaScript entry point.
// It tells React: "Mount the <App /> component inside the #root div from index.html"
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'   // Global CSS loaded once here — applies everywhere

// React 18+ uses createRoot instead of the old ReactDOM.render.
// StrictMode renders every component twice in development to help
// catch bugs early (like missing cleanup in useEffect). In production it does nothing.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
