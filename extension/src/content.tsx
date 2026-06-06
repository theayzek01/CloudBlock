import ReactDOM from 'react-dom/client';
import CloudBlockUI from './CloudBlockUI';
import './index.css';
import './blocklyInterceptor';

// Intercept Scratch DOM and setup styles
function init() {
  console.log("Cloud Block Interceptor Started!");

  // Inject Google Fonts Material Symbols
  if (!document.getElementById('cloud-block-material-symbols')) {
    const fontLink = document.createElement('link');
    fontLink.id = 'cloud-block-material-symbols';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }
  
  // Create a container for our UI
  const container = document.createElement('div');
  container.id = 'cloud-block-root';
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none'; // Let clicks pass through to Scratch unless we intercept
  container.style.zIndex = '999999';
  
  document.body.appendChild(container);

  const root = ReactDOM.createRoot(container);
  root.render(<CloudBlockUI />);
}

// Wait for Scratch to load
setTimeout(init, 2000);

