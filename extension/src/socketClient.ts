import { io, Socket } from 'socket.io-client';

class SocketClient {
  public socket: Socket | null = null;
  // Local development port
  private serverUrl = 'http://localhost:3001';

  public connect(roomId: string) {
    if (this.socket) return;
    
    this.socket = io(this.serverUrl);
    
    this.socket.on('connect', () => {
      console.log('Cloud Block: Connected to realtime server');
      this.socket?.emit('join_room', roomId);
    });

    this.socket.on('disconnect', () => {
      console.log('Cloud Block: Disconnected from realtime server');
    });
  }

  public emitCursor(roomId: string, x: number, y: number) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('cursor_move', { roomId, cursor: { x, y } });
    }
  }

  public emitBlockEvent(roomId: string, eventData: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('block_event', { roomId, event: eventData });
    }
  }

  public onBlockEvent(callback: (eventData: any) => void) {
    if (!this.socket) {
      // If socket isn't ready yet, defer it
      setTimeout(() => this.onBlockEvent(callback), 500);
      return;
    }
    this.socket.on('block_event', callback);
  }
}

export const socketClient = new SocketClient();
