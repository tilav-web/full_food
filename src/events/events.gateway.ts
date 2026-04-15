import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitOrderCreated(order: { id: string; orderNumber: string }) {
    this.server.emit('order:created', order);
  }

  emitOrderStatusUpdated(order: {
    id: string;
    orderNumber: string;
    status: string;
  }) {
    this.server.emit('order:status-updated', order);
  }

  emitOrderPaymentUpdated(order: {
    id: string;
    orderNumber: string;
    paymentStatus: string;
  }) {
    this.server.emit('order:payment-updated', order);
  }
}
