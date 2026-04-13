import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

type LocationResponse = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
};

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string): Promise<LocationResponse[]> {
    const locations = await this.prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return locations.map((loc) => this.toResponse(loc));
  }

  async create(
    userId: string,
    dto: CreateLocationDto,
  ): Promise<LocationResponse> {
    const location = await this.prisma.savedLocation.create({
      data: {
        userId,
        label: dto.label.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    return this.toResponse(location);
  }

  async createFromBot(
    userId: string,
    label: string,
    latitude: number,
    longitude: number,
  ): Promise<LocationResponse> {
    const location = await this.prisma.savedLocation.create({
      data: {
        userId,
        label: label.trim(),
        latitude,
        longitude,
      },
    });

    return this.toResponse(location);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateLocationDto,
  ): Promise<LocationResponse> {
    await this.findOneOrThrow(userId, id);

    const location = await this.prisma.savedLocation.update({
      where: { id },
      data: {
        label: dto.label?.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    return this.toResponse(location);
  }

  async remove(userId: string, id: string): Promise<{ message: string }> {
    await this.findOneOrThrow(userId, id);

    await this.prisma.savedLocation.delete({
      where: { id },
    });

    return { message: 'Joylashuv muvaffaqiyatli o`chirildi.' };
  }

  private async findOneOrThrow(userId: string, id: string) {
    const location = await this.prisma.savedLocation.findFirst({
      where: { id, userId },
    });

    if (!location) {
      throw new NotFoundException('Joylashuv topilmadi.');
    }

    return location;
  }

  private toResponse(location: {
    id: string;
    label: string;
    latitude: number;
    longitude: number;
    createdAt: Date;
  }): LocationResponse {
    return {
      id: location.id,
      label: location.label,
      latitude: location.latitude,
      longitude: location.longitude,
      createdAt: location.createdAt,
    };
  }
}
