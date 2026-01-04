import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAlertDto: CreateAlertDto) {
    return this.prisma.alert.create({
      data: {
        ...createAlertDto,
        userId,
        severity: createAlertDto.severity || 'INFO',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(userId: string, isRead?: boolean) {
    const where: any = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    return this.prisma.alert.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('Alerta não encontrado');
    }

    if (alert.userId !== userId) {
      throw new ForbiddenException('Alerta não pertence ao usuário');
    }

    return alert;
  }

  async markAsRead(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.alert.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.alert.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.alert.delete({
      where: { id },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.alert.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }
}

