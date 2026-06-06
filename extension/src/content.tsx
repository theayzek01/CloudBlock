import ReactDOM from 'react-dom/client';
import CloudBlockUI from './CloudBlockUI';
import './index.css';
import './blocklyInterceptor';
import { initUserId, db } from './firebaseClient';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Intercept Scratch DOM and setup styles
async function init() {
  console.log("Cloud Block Interceptor Started!");

  // Inject Google Fonts Material Symbols
  if (!document.getElementById('cloud-block-material-symbols')) {
    const fontLink = document.createElement('link');
    fontLink.id = 'cloud-block-material-symbols';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }

  // Await user ID initialization
  await initUserId();
  
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

  // Setup My Stuff Injector if we are on My Stuff
  setupMyStuffCollabs();
}

async function setupMyStuffCollabs() {
  const inject = async () => {
    if (!window.location.pathname.startsWith('/mystuff')) return;

    // Get Scratch username
    const getUsername = () => {
      const el = document.querySelector('.header-text') || 
                 document.querySelector('.username') ||
                 document.querySelector('.nav-user-link .username') ||
                 document.querySelector('.user-name');
      return el ? el.textContent?.trim() || '' : '';
    };

    const username = getUsername();
    if (!username) return;

    try {
      const projectsCol = collection(db, 'user_projects');
      const q = query(projectsCol, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      const collabs: string[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.projectId) {
          collabs.push(data.projectId);
        }
      });

      if (collabs.length === 0) return;

      const mediaList = document.querySelector('.media-list') || document.getElementById('main-content');
      if (!mediaList) return;

      for (const projectId of collabs) {
        // Check if project is already in list (rendered by Scratch because user owns it)
        const existingItem = document.querySelector(`a[href*="/projects/${projectId}"]`);
        
        if (existingItem) {
          const listItem = existingItem.closest('li') || existingItem.closest('.media-item') || existingItem.parentElement;
          if (listItem && !listItem.querySelector('.cb-badge')) {
            const badge = document.createElement('span');
            badge.className = 'cb-badge';
            badge.textContent = 'CloudBlock';
            badge.style.cssText = `
              background: linear-gradient(135deg, #0ea5e9, #2563eb);
              color: #ffffff;
              font-size: 10px;
              font-weight: 700;
              padding: 3px 8px;
              border-radius: 100px;
              margin-left: 8px;
              display: inline-block;
              box-shadow: 0 0 8px rgba(14, 165, 233, 0.4);
              font-family: system-ui, sans-serif;
            `;
            const titleEl = listItem.querySelector('.title') || listItem.querySelector('h4') || listItem.querySelector('a');
            if (titleEl) {
              titleEl.appendChild(badge);
            }
          }
        } else {
          // User does not own it (belongs to collaborator). Let's fetch details and inject!
          if (document.getElementById(`cb-project-${projectId}`)) continue;

          try {
            const res = await fetch(`https://api.scratch.mit.edu/projects/${projectId}`);
            if (res.ok) {
              const projectData = await res.json();
              
              const li = document.createElement('li');
              li.id = `cb-project-${projectId}`;
              li.className = 'media-item cb-media-item';
              li.style.cssText = `
                display: flex;
                gap: 16px;
                padding: 12px;
                border-bottom: 1px solid #e0e0e0;
                align-items: center;
                font-family: Helvetica Neue, Helvetica, Arial, sans-serif;
                background: rgba(14, 165, 233, 0.04);
                border-left: 4px solid #0ea5e9;
              `;

              const thumbUrl = `https://assets.scratch.mit.edu/get_image/project/${projectId}_282x218.png`;
              
              li.innerHTML = `
                <div class="thumb" style="width: 100px; height: 80px; position: relative; overflow: hidden; border-radius: 4px; border: 1px solid #ddd; background: #eee;">
                  <a href="/projects/${projectId}/editor#cloudblock-lobby">
                    <img src="${thumbUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://scratch.mit.edu/static/images/default-project.png'"/>
                  </a>
                </div>
                <div class="info" style="flex: 1; min-width: 0;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold;">
                    <a href="/projects/${projectId}/editor#cloudblock-lobby" style="color: #4d4d4d; text-decoration: none;">
                      ${projectData.title}
                    </a>
                    <span class="cb-badge" style="
                      background: linear-gradient(135deg, #0ea5e9, #2563eb);
                      color: #ffffff;
                      font-size: 10px;
                      font-weight: 700;
                      padding: 3px 8px;
                      border-radius: 100px;
                      margin-left: 8px;
                      display: inline-block;
                      box-shadow: 0 0 8px rgba(14, 165, 233, 0.4);
                    ">CloudBlock</span>
                  </h4>
                  <div class="metadata" style="font-size: 11px; color: #888;">
                    Sahibi: <span style="font-weight: 600; color: #555;">${projectData.author.username}</span> | 
                    Son İşlem: ${new Date(projectData.history.modified).toLocaleDateString()}
                  </div>
                </div>
                <div class="actions" style="display: flex; gap: 8px;">
                  <a href="/projects/${projectId}/editor#cloudblock-lobby" style="
                    background: #0ea5e9;
                    color: white;
                    padding: 6px 12px;
                    border-radius: 4px;
                    text-decoration: none;
                    font-size: 11px;
                    font-weight: bold;
                  ">Birlikte Çalış</a>
                </div>
              `;
              
              mediaList.insertBefore(li, mediaList.firstChild);
            }
          } catch (err) {
            console.error("Error fetching details for collab project:", err);
          }
        }
      }
    } catch (err) {
      console.error("Error loading collab projects:", err);
    }
  };

  inject();
  
  // Set up observer for dynamic load/tab change inside mystuff
  const observer = new MutationObserver(() => {
    inject();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Wait for Scratch to load
setTimeout(init, 2000);

