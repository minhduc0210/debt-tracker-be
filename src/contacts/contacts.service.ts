import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(createContactDto: CreateContactDto) {
    const contact = await this.prisma.contact.create({
      data: createContactDto,
    });
    if (!contact) {
      this.logger.error('Failed to create contact');
      throw new InternalServerErrorException('Failed to create contact');
    } else {
      return contact;
    }
  }

  async findAll() {
    const contacts = await this.prisma.contact.findMany({
      where: {
        isDeleted: false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!contacts) {
      this.logger.error('Failed to fetch contacts');
      throw new InternalServerErrorException('Failed to fetch contacts');
    } else {
      return contacts;
    }
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        transactions: {
          take: 5,
          orderBy: { transactionDate: 'desc' },
        },
      },
    });

    if (!contact || contact.isDeleted) {
      this.logger.error(`Contact with ID ${id} not found`);
      throw new NotFoundException(`Contact with ID ${id} not found`);
    } else {
      return contact;
    }
  }

  async update(id: string, updateContactDto: UpdateContactDto) {
    const contact = await this.prisma.contact.update({
      where: { id },
      data: updateContactDto,
    });

    if (!contact) {
      this.logger.error(`Failed to update contact with ID ${id}`);
      throw new InternalServerErrorException(
        `Failed to update contact with ID ${id}`,
      );
    } else {
      return contact;
    }
  }

  async remove(id: string) {
    const contact = await this.prisma.contact.update({
      where: { id },
      data: { isDeleted: true },
    });

    if (!contact) {
      this.logger.error(`Failed to delete contact with ID ${id}`);
      throw new InternalServerErrorException(
        `Failed to delete contact with ID ${id}`,
      );
    } else {
      return contact;
    }
  }
}
