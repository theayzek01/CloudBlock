import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  onSnapshot,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  where,
  limit
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA9yS1qdxAz0McFm1qdIx84c6Vw8DO_Ux4",
  authDomain: "moodie-36dcb.firebaseapp.com",
  projectId: "moodie-36dcb",
  storageBucket: "moodie-36dcb.firebasestorage.app",
  messagingSenderId: "709328683842",
  appId: "1:709328683842:web:fa346ab11cfc56c367fedb",
  measurementId: "G-4KCLQ5WQFS"
};

// Generate a unique client/user ID when the client starts
export const myUserId = 'user_' + Math.random().toString(36).substring(2, 7);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

class FirebaseClient {
  private activeRoomId: string | null = null;
  private lastCursorEmit = 0;
  private cursorThrottleMs = 150; // Throttle to 150ms
  private cursorTimeout: any = null;
  private lastAppliedBlockTimestamp = 0;

  // Callbacks
  private cursorCallback: ((cursors: { [userId: string]: { x: number; y: number; color: string } }) => void) | null = null;
  private blockCallback: ((eventData: any) => void) | null = null;
  private chatCallback: ((data: { id: string; userId: string; message: string; color: string; timestamp: number }) => void) | null = null;
  private historyCallback: ((checkpoints: any[]) => void) | null = null;

  // Unsubscribe hooks
  private unsubscribes: (() => void)[] = [];

  public connect(roomId: string) {
    if (this.activeRoomId === roomId) return;
    
    // Disconnect old listeners
    this.disconnect();
    
    this.activeRoomId = roomId;
    console.log(`Cloud Block: Connecting to Firebase Firestore Room: ${roomId} as User: ${myUserId}`);

    // 1. Listen to Cursors
    const cursorsCol = collection(db, 'rooms', roomId, 'cursors');
    const unsubCursors = onSnapshot(cursorsCol, (snapshot) => {
      const updatedCursors: { [userId: string]: { x: number; y: number; color: string } } = {};
      snapshot.forEach((docSnap) => {
        const uId = docSnap.id;
        if (uId !== myUserId) {
          const data = docSnap.data();
          // Filter out users who haven't moved in 12 seconds
          if (Date.now() - data.timestamp < 12000) {
            updatedCursors[uId] = {
              x: data.x,
              y: data.y,
              color: `hsl(${uId.charCodeAt(0) * 55 % 360}, 85%, 60%)`
            };
          }
        }
      });
      if (this.cursorCallback) {
        this.cursorCallback(updatedCursors);
      }
    });
    this.unsubscribes.push(unsubCursors);

    // 2. Listen to Block Events
    const blockDocRef = doc(db, 'rooms', roomId, 'sync', 'blockEvent');
    const unsubBlock = onSnapshot(blockDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.senderId !== myUserId && data.timestamp > this.lastAppliedBlockTimestamp) {
          this.lastAppliedBlockTimestamp = data.timestamp;
          if (this.blockCallback) {
            try {
              const parsedEvent = JSON.parse(data.eventData);
              this.blockCallback(parsedEvent);
            } catch (e) {
              console.error("Firebase: Failed to parse block event", e);
            }
          }
        }
      }
    });
    this.unsubscribes.push(unsubBlock);

    // 3. Listen to Chat Messages (only from the last 10 minutes)
    const messagesCol = collection(db, 'rooms', roomId, 'messages');
    const chatCutoff = Date.now() - 600000;
    const qChat = query(messagesCol, where('timestamp', '>=', chatCutoff), orderBy('timestamp', 'asc'));
    const unsubChat = onSnapshot(qChat, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (this.chatCallback) {
            this.chatCallback({
              id: change.doc.id,
              userId: data.userId,
              message: data.message,
              color: data.color,
              timestamp: data.timestamp
            });
          }
        }
      });
    });
    this.unsubscribes.push(unsubChat);

    // 4. Listen to History Checkpoints (Zaman Makinesi)
    const historyCol = collection(db, 'rooms', roomId, 'history');
    const qHistory = query(historyCol, orderBy('timestamp', 'desc'), limit(5));
    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      if (this.historyCallback) {
        this.historyCallback(list);
      }
    });
    this.unsubscribes.push(unsubHistory);

    // 5. Initial Cleanups
    this.cleanupStaleCursors(roomId);
    this.cleanupOldMessages(roomId);

    // Periodical stale cursor cleanup (every 25 seconds)
    const cleanupInterval = setInterval(() => {
      if (this.activeRoomId === roomId) {
        this.cleanupStaleCursors(roomId);
      } else {
        clearInterval(cleanupInterval);
      }
    }, 25000);

    // Unload hook to delete my cursor when closing page
    const handleUnload = () => {
      const userDocRef = doc(db, 'rooms', roomId, 'cursors', myUserId);
      deleteDoc(userDocRef).catch(() => {});
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);
    
    this.unsubscribes.push(() => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('unload', handleUnload);
      handleUnload();
    });
  }

  public disconnect() {
    this.unsubscribes.forEach(unsub => {
      try {
        unsub();
      } catch (e) {}
    });
    this.unsubscribes = [];
    this.activeRoomId = null;
    if (this.cursorTimeout) {
      clearTimeout(this.cursorTimeout);
      this.cursorTimeout = null;
    }
  }

  // Cursor movements
  public emitCursor(roomId: string, x: number, y: number) {
    if (!this.activeRoomId) return;
    const now = Date.now();

    if (this.cursorTimeout) {
      clearTimeout(this.cursorTimeout);
      this.cursorTimeout = null;
    }

    const run = () => {
      this.lastCursorEmit = Date.now();
      const userDocRef = doc(db, 'rooms', roomId, 'cursors', myUserId);
      setDoc(userDocRef, { x, y, timestamp: Date.now() }).catch(err => {
        console.error("Firebase: Cursor write error", err);
      });
    };

    if (now - this.lastCursorEmit >= this.cursorThrottleMs) {
      run();
    } else {
      this.cursorTimeout = setTimeout(run, this.cursorThrottleMs - (now - this.lastCursorEmit));
    }
  }

  // Blockly Events
  public emitBlockEvent(roomId: string, eventData: any) {
    if (!this.activeRoomId) return;
    const blockDocRef = doc(db, 'rooms', roomId, 'sync', 'blockEvent');
    setDoc(blockDocRef, {
      eventData: JSON.stringify(eventData),
      senderId: myUserId,
      timestamp: Date.now()
    }).catch(err => {
      console.error("Firebase: Block event write error", err);
    });
  }

  public onBlockEvent(callback: (eventData: any) => void) {
    this.blockCallback = callback;
  }

  // Chat Messages
  public emitChatMessage(roomId: string, message: string, color: string) {
    if (!this.activeRoomId) return;
    const messagesCol = collection(db, 'rooms', roomId, 'messages');
    const msgId = doc(messagesCol).id;
    const msgDoc = doc(messagesCol, msgId);
    
    setDoc(msgDoc, {
      userId: myUserId,
      message,
      color,
      timestamp: Date.now()
    }).then(() => {
      this.cleanupOldMessages(roomId);
    }).catch(err => {
      console.error("Firebase: Chat send error", err);
    });
  }

  public onChatMessage(callback: (data: { id: string; userId: string; message: string; color: string; timestamp: number }) => void) {
    this.chatCallback = callback;
  }

  // History Checkpoints (Zaman Makinesi)
  public async saveCheckpoint(roomId: string, name: string, workspaceXml: string) {
    if (!this.activeRoomId) return;
    try {
      const historyCol = collection(db, 'rooms', roomId, 'history');
      const cpId = 'cp_' + Date.now();
      const cpDoc = doc(historyCol, cpId);
      
      await setDoc(cpDoc, {
        id: cpId,
        name,
        workspaceXml,
        author: myUserId,
        timestamp: Date.now()
      });

      // Keep only last 5 checkpoints to optimize storage
      const q = query(historyCol, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;
      if (docs.length > 5) {
        for (let i = 5; i < docs.length; i++) {
          await deleteDoc(docs[i].ref).catch(() => {});
        }
      }
    } catch (e) {
      console.error("Firebase: Save checkpoint error", e);
    }
  }

  public onHistoryChanged(callback: (checkpoints: any[]) => void) {
    this.historyCallback = callback;
  }

  // Cleanups to keep storage completely empty/optimized
  private async cleanupOldMessages(roomId: string) {
    try {
      const messagesCol = collection(db, 'rooms', roomId, 'messages');
      const cutoff = Date.now() - 600000; // 10 minutes
      const q = query(messagesCol, where('timestamp', '<', cutoff));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        deleteDoc(docSnap.ref).catch(() => {});
      });
    } catch (e) {
      console.error("Firebase: Cleanup messages error", e);
    }
  }

  private async cleanupStaleCursors(roomId: string) {
    try {
      const cursorsCol = collection(db, 'rooms', roomId, 'cursors');
      const cutoff = Date.now() - 60000; // 60 seconds
      const q = query(cursorsCol, where('timestamp', '<', cutoff));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        if (docSnap.id !== myUserId) {
          deleteDoc(docSnap.ref).catch(() => {});
        }
      });
    } catch (e) {
      console.error("Firebase: Cursor cleanup error", e);
    }
  }

  // Cursor updates helper for manual trigger if needed
  public onCursorUpdate(callback: (cursors: { [userId: string]: { x: number; y: number; color: string } }) => void) {
    this.cursorCallback = callback;
  }

  // Get active users once for the Google Meet style Lobby
  public async getActiveUsersOnce(roomId: string): Promise<string[]> {
    try {
      const cursorsCol = collection(db, 'rooms', roomId, 'cursors');
      const cutoff = Date.now() - 12000; // 12 seconds
      const q = query(cursorsCol, where('timestamp', '>=', cutoff));
      const querySnapshot = await getDocs(q);
      const list: string[] = [];
      querySnapshot.forEach((docSnap) => {
        if (docSnap.id !== myUserId) {
          list.push(docSnap.id);
        }
      });
      return list;
    } catch (e) {
      console.error("Firebase: getActiveUsersOnce error", e);
      return [];
    }
  }

  // Register my online status globally on Scratch
  public registerOnlineUser(roomId: string, username: string) {
    const userDocRef = doc(db, 'online_users', myUserId);
    setDoc(userDocRef, {
      userId: myUserId,
      username: username || `Kullanıcı ${myUserId}`,
      roomId: roomId,
      lastActive: Date.now()
    }).catch(err => console.error("Firebase: Register online user error", err));
  }

  // Deregister my online status when leaving
  public deregisterOnlineUser() {
    const userDocRef = doc(db, 'online_users', myUserId);
    deleteDoc(userDocRef).catch(() => {});
  }

  // Listen to other online users globally on Scratch
  public listenOnlineUsers(callback: (users: any[]) => void): () => void {
    const usersCol = collection(db, 'online_users');
    const unsub = onSnapshot(usersCol, (snapshot) => {
      const list: any[] = [];
      const cutoff = Date.now() - 120000; // Active in last 2 minutes
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId !== myUserId && data.lastActive >= cutoff) {
          list.push(data);
        }
      });
      callback(list);
    });
    return unsub;
  }

  // Send invitation to another online user
  public async sendInvitation(targetUserId: string, targetUsername: string, fromUsername: string, projectId: string) {
    try {
      const invitationsCol = collection(db, 'invitations');
      const inviteId = `invite_${myUserId}_${targetUserId}_${Date.now()}`;
      const inviteDoc = doc(invitationsCol, inviteId);
      
      await setDoc(inviteDoc, {
        id: inviteId,
        fromUserId: myUserId,
        fromUsername: fromUsername || `Kullanıcı ${myUserId}`,
        toUserId: targetUserId,
        projectId: projectId,
        timestamp: Date.now(),
        status: 'pending'
      });
      console.log(`Firebase: Invitation sent to ${targetUsername} (${targetUserId})`);
    } catch (e) {
      console.error("Firebase: Send invitation error", e);
      throw e;
    }
  }

  // Listen for incoming invitations sent to me (Filtered in memory to avoid indexing dependencies)
  public listenInvitations(callback: (invite: any) => void): () => void {
    const invitationsCol = collection(db, 'invitations');
    const q = query(invitationsCol, where('toUserId', '==', myUserId));
    
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const cutoff = Date.now() - 300000; // Last 5 minutes
          if (data.status === 'pending' && data.timestamp >= cutoff) {
            callback(data);
          }
        }
      });
    });
    return unsub;
  }

  // Respond to invitation
  public async respondToInvitation(inviteId: string, status: 'accepted' | 'declined') {
    try {
      const inviteDoc = doc(db, 'invitations', inviteId);
      await setDoc(inviteDoc, { status }, { merge: true });
    } catch (e) {
      console.error("Firebase: Respond to invitation error", e);
    }
  }

  // Heartbeat helper to keep our online status alive
  public startHeartbeat(roomId: string, getUsernameFn: () => string): () => void {
    const interval = setInterval(() => {
      this.registerOnlineUser(roomId, getUsernameFn());
    }, 25000);
    
    this.registerOnlineUser(roomId, getUsernameFn());
    
    return () => {
      clearInterval(interval);
      this.deregisterOnlineUser();
    };
  }
}

export const firebaseClient = new FirebaseClient();
export { FirebaseClient };
