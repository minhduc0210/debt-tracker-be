import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    const { contactId, amount } = createTransactionDto;
    const contactExists = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contactExists || contactExists.isDeleted) {
      this.logger.error(`Contact with ID ${contactId} not found`);
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      const transaction = await prisma.transaction.create({
        data: createTransactionDto,
      });

      await prisma.contact.update({
        where: { id: contactId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      return transaction;
    });

    if (!result) {
      this.logger.error('Failed to create transaction');
      throw new InternalServerErrorException('Failed to create transaction');
    } else {
      return result;
    }
  }

  async findAll(contactId?: string) {
    if (contactId) {
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact || contact.isDeleted) {
        this.logger.error(`Contact with ID ${contactId} not found`);
        throw new NotFoundException(`Contact with ID ${contactId} not found`);
      }
    }

    const whereCondition = contactId ? { contactId } : {};

    const transactions = await this.prisma.transaction.findMany({
      where: whereCondition,
      orderBy: {
        transactionDate: 'desc',
      },
      include: {
        contact: {
          select: { name: true },
        },
      },
    });

    if (!transactions) {
      this.logger.error('Failed to fetch transactions');
      throw new InternalServerErrorException('Failed to fetch transactions');
    } else {
      return transactions;
    }
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        contact: {
          select: { id: true, name: true, balance: true },
        },
      },
    });

    if (!transaction) {
      this.logger.error(`Transaction with ID ${id} not found`);
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    } else {
      return transaction;
    }
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto) {
    const oldTransaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!oldTransaction) {
      this.logger.error(`Transaction with ID ${id} not found to update`);
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      const updatedTransaction = await prisma.transaction.update({
        where: { id },
        data: updateTransactionDto,
      });

      if (updateTransactionDto.amount !== undefined) {
        const diff =
          Number(updateTransactionDto.amount) - Number(oldTransaction.amount);

        if (diff !== 0) {
          await prisma.contact.update({
            where: { id: oldTransaction.contactId },
            data: {
              balance: {
                increment: diff,
              },
            },
          });
        }
      }

      return updatedTransaction;
    });

    if (!result) {
      this.logger.error(`Failed to update transaction with ID ${id}`);
      throw new InternalServerErrorException(
        `Failed to update transaction with ID ${id}`,
      );
    } else {
      return result;
    }
  }

  async remove(id: string) {
    const oldTransaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!oldTransaction) {
      this.logger.error(`Transaction with ID ${id} not found to delete`);
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      const deletedTransaction = await prisma.transaction.delete({
        where: { id },
      });
      await prisma.contact.update({
        where: { id: oldTransaction.contactId },
        data: {
          balance: {
            decrement: oldTransaction.amount,
          },
        },
      });

      return deletedTransaction;
    });

    if (!result) {
      this.logger.error(`Failed to delete transaction with ID ${id}`);
      throw new InternalServerErrorException(
        `Failed to delete transaction with ID ${id}`,
      );
    } else {
      return result;
    }
  }
}
