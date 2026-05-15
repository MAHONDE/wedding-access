import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { StatsService } from './stats.service';

@WebSocketGateway({ namespace: '/stats', cors: { origin: '*' } })
export class StatsGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;

  constructor(private statsService: StatsService) {}

  afterInit() {}

  async broadcast(ceremonyId?: string) {
    try {
      const data = await this.statsService.live(ceremonyId);
      this.server.emit('stats', data);
    } catch {}
  }
}
