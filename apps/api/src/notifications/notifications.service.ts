import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

type Channel = 'EMAIL' | 'SLACK' | 'TEAMS' | 'WHATSAPP' | 'IN_APP';
type NotifType = 'DUE_SOON' | 'BLOCKED' | 'OVERLOAD' | 'CRITICAL_DEP' | 'RISK';

@Injectable()
export class NotificationsService {
  private readonly log = new Logger('Notifications');
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  markRead(id: string) {
    return this.prisma.db.notification.update({ where: { id }, data: { read: true } });
  }

  /** Crea una notificación por canal y la despacha al proveedor correspondiente. */
  async notify(
    userId: string,
    type: NotifType,
    channels: Channel[],
    payload: Record<string, unknown>,
  ) {
    const created = [];
    for (const channel of channels) {
      const n = await this.prisma.db.notification.create({
        data: {
          organizationId: this.prisma.orgId,
          userId,
          type,
          channel,
          payload: payload as any,
          sentAt: channel === 'IN_APP' ? new Date() : null,
        },
      });
      if (channel !== 'IN_APP') await this.dispatch(channel, payload, n.id);
      created.push(n);
    }
    return created;
  }

  /**
   * Escaneo periódico (lo invoca un cron/BullMQ): tareas que vencen en <48h o
   * bloqueadas → genera notificaciones DUE_SOON / BLOCKED a sus responsables.
   */
  async scanAndNotify() {
    const soon = new Date(Date.now() + 48 * 3_600_000);
    const tasks = await this.prisma.db.task.findMany({
      where: {
        deletedAt: null,
        assigneeId: { not: null },
        status: { notIn: ['DONE'] },
        OR: [{ dueDate: { lte: soon } }, { status: 'BLOCKED' }],
      },
      select: { id: true, title: true, assigneeId: true, status: true, dueDate: true },
    });

    let count = 0;
    for (const t of tasks) {
      const type: NotifType = t.status === 'BLOCKED' ? 'BLOCKED' : 'DUE_SOON';
      await this.notify(t.assigneeId!, type, ['IN_APP', 'EMAIL'], {
        taskId: t.id,
        title: t.title,
        dueDate: t.dueDate,
      });
      count++;
    }
    this.log.log(`Escaneo: ${count} notificaciones generadas`);
    return { generated: count };
  }

  /**
   * Adaptadores de canal. En producción cada uno llama a su proveedor:
   * EMAIL→SendGrid/SES, SLACK→Incoming Webhook, TEAMS→connector,
   * WHATSAPP→WhatsApp Business API. Aquí quedan como stubs trazables.
   */
  private async dispatch(channel: Channel, payload: Record<string, unknown>, id: string) {
    switch (channel) {
      case 'EMAIL':
        // await this.email.send(...)
        this.log.debug(`[EMAIL] ${id} → ${JSON.stringify(payload)}`);
        break;
      case 'SLACK':
        // await fetch(process.env.SLACK_WEBHOOK, { method:'POST', body:... })
        this.log.debug(`[SLACK] ${id}`);
        break;
      case 'TEAMS':
        this.log.debug(`[TEAMS] ${id}`);
        break;
      case 'WHATSAPP':
        // await this.whatsapp.sendTemplate(...)
        this.log.debug(`[WHATSAPP] ${id}`);
        break;
    }
  }
}
