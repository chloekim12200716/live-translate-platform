declare module "ws" {
  import { IncomingMessage } from "http";
  import { Duplex } from "stream";

  export class WebSocket {
    static readonly OPEN: number;
    readonly readyState: number;
    on(event: "message", listener: (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    send(data: string | Buffer): void;
    close(code?: number, reason?: string): void;
  }

  export class WebSocketServer {
    constructor(options: { noServer?: boolean });
    on(event: "connection", listener: (socket: WebSocket, request: IncomingMessage) => void): this;
    emit(event: "connection", socket: WebSocket, request: IncomingMessage): boolean;
    handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer, callback: (socket: WebSocket) => void): void;
  }
}
