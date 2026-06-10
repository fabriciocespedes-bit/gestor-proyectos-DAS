import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

type DocType = 'WIKI' | 'MINUTES' | 'PROCEDURE' | 'LOGBOOK';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(projectId: string, type?: DocType) {
    return this.prisma.db.document.findMany({
      where: { projectId, type },
      select: { id: true, title: true, type: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(id: string) {
    const doc = await this.prisma.db.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  create(projectId: string, dto: { title: string; type?: DocType; content?: unknown }) {
    return this.prisma.db.document.create({
      data: {
        organizationId: this.prisma.orgId,
        projectId,
        title: dto.title,
        type: (dto.type ?? 'WIKI') as any,
        content: (dto.content ?? { blocks: [] }) as any,
      },
    });
  }

  /** Guarda el árbol de bloques (editor estilo Notion: BlockNote/Tiptap). */
  update(id: string, dto: { title?: string; content?: unknown }) {
    return this.prisma.db.document.update({
      where: { id },
      data: { title: dto.title, content: dto.content as any },
    });
  }
}
